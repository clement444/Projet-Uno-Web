// Colors: 1=Rouge, 2=Jaune, 3=Vert, 4=Bleu, 0=Joker (sans couleur)
const COLORS = [1, 2, 3, 4];
const CARD_PLUS2    = 10;
const CARD_PLUS4    = 11;
const CARD_WILD     = 12;
const CARD_BLOCK    = 13;
const CARD_REVERSE  = 14;

// Map<room_id, GameState>
const activeGames = new Map();

export function getGame(room_id) {
  return activeGames.get(String(room_id)) ?? null;
}

export function removeGame(room_id) {
  activeGames.delete(String(room_id));
}

export class GameState {
  constructor(room_id, player_ids) {
    this.room_id   = String(room_id);
    this.playerIds = [...player_ids]; // ordre de jeu
    this.turnIndex = 0;
    this.direction = 1;   // 1 ou -1
    this.color     = null; // couleur active
    this.lastCard  = null; // { card_id, color }
    this.hands     = {};   // { user_id: [{card_id, color}] }
    this.pile      = [];   // pioche
    this.discard   = [];   // défausse
    this.pendingDraw = 0;  // cartes à piocher cumulées (+2/+4)
    this.unoPending  = {}; // { user_id: true }
    this.winner    = null;

    this._buildDeck();
    this._shuffle(this.pile);
    this._dealHands();
    this._firstCard();

    activeGames.set(this.room_id, this);
  }

  // ── Construction du deck ──────────────────────────────────────────────────

  _buildDeck() {
    for (const c of COLORS) {
      this.pile.push({ card_id: 0, color: c }); // 0 x1
      for (let n = 1; n <= 9; n++) {
        this.pile.push({ card_id: n, color: c });
        this.pile.push({ card_id: n, color: c }); // 1-9 x2
      }
      this.pile.push({ card_id: CARD_PLUS2,   color: c });
      this.pile.push({ card_id: CARD_PLUS2,   color: c });
      this.pile.push({ card_id: CARD_BLOCK,   color: c });
      this.pile.push({ card_id: CARD_BLOCK,   color: c });
      this.pile.push({ card_id: CARD_REVERSE, color: c });
      this.pile.push({ card_id: CARD_REVERSE, color: c });
    }
    for (let i = 0; i < 4; i++) {
      this.pile.push({ card_id: CARD_WILD,  color: 0 });
      this.pile.push({ card_id: CARD_PLUS4, color: 0 });
    }
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  _dealHands() {
    for (const uid of this.playerIds) this.hands[uid] = [];
    for (let i = 0; i < 7; i++)
      for (const uid of this.playerIds)
        this.hands[uid].push(this._draw());
  }

  _firstCard() {
    let card;
    do { card = this._draw(); }
    while (card.card_id === CARD_WILD || card.card_id === CARD_PLUS4);
    this.discard.push(card);
    this.lastCard = card;
    this.color    = card.color;
    if (card.card_id === CARD_BLOCK)   this._next();
    if (card.card_id === CARD_REVERSE) this.direction = -1;
    if (card.card_id === CARD_PLUS2)   this.pendingDraw += 2;
  }

  _draw() {
    if (this.pile.length === 0) {
      const top = this.discard.pop();
      this.pile = [...this.discard];
      this.discard = [top];
      this._shuffle(this.pile);
    }
    return this.pile.pop();
  }

  // ── Gestion des tours ─────────────────────────────────────────────────────

  get currentPlayer() { return this.playerIds[this.turnIndex]; }

  _next() {
    const n = this.playerIds.length;
    this.turnIndex = ((this.turnIndex + this.direction) % n + n) % n;
  }

  // ── Validation ────────────────────────────────────────────────────────────

  canPlay(card) {
    const isWild = card.card_id === CARD_WILD || card.card_id === CARD_PLUS4;
    if (isWild) {
      if (this.pendingDraw > 0 && card.card_id !== CARD_PLUS4) return false;
      return true;
    }
    if (this.pendingDraw > 0)
      return card.card_id === CARD_PLUS2 && this.lastCard.card_id === CARD_PLUS2;
    return card.color === this.color || card.card_id === this.lastCard.card_id;
  }

  // ── Jouer une carte ───────────────────────────────────────────────────────

  playCard(user_id, card_index, chosen_color) {
    if (this.winner)                                  return { error: "game_over" };
    if (String(user_id) !== String(this.currentPlayer)) return { error: "not_your_turn" };

    const hand = this.hands[user_id];
    if (!hand || card_index < 0 || card_index >= hand.length) return { error: "invalid_card" };

    const card = hand[card_index];
    if (!this.canPlay(card)) return { error: "cannot_play" };

    hand.splice(card_index, 1);
    this.discard.push(card);
    this.lastCard = card;

    const isWild = card.card_id === CARD_WILD || card.card_id === CARD_PLUS4;
    if (isWild) {
      if (!COLORS.includes(Number(chosen_color))) return { error: "color_required" };
      this.color = Number(chosen_color);
    } else {
      this.color = card.color;
    }

    delete this.unoPending[user_id];

    const effects = [];

    switch (card.card_id) {
      case CARD_PLUS2:
        this.pendingDraw += 2;
        effects.push("plus2");
        this._next();
        break;
      case CARD_PLUS4:
        this.pendingDraw += 4;
        effects.push("plus4");
        this._next();
        break;
      case CARD_BLOCK:
        effects.push("block");
        this._next(); // skip
        this._next();
        break;
      case CARD_REVERSE:
        effects.push("reverse");
        this.direction *= -1;
        if (this.playerIds.length === 2) this._next(); // reverse = skip en 2j
        this._next();
        break;
      default:
        this._next();
    }

    if (hand.length === 0) this.winner = user_id;

    return { card, effects, winner: this.winner };
  }

  // ── Piocher ───────────────────────────────────────────────────────────────

  drawCard(user_id) {
    if (this.winner)                                  return { error: "game_over" };
    if (String(user_id) !== String(this.currentPlayer)) return { error: "not_your_turn" };

    const drawn = [];
    const count = this.pendingDraw > 0 ? this.pendingDraw : 1;
    const forced = this.pendingDraw > 0;

    for (let i = 0; i < count; i++) {
      const c = this._draw();
      this.hands[user_id].push(c);
      drawn.push(c);
    }
    this.pendingDraw = 0;
    this._next();
    return { drawn, forced };
  }

  // ── UNO ───────────────────────────────────────────────────────────────────

  callUno(user_id) {
    if (this.hands[user_id]?.length === 1) {
      this.unoPending[user_id] = true;
      return { ok: true };
    }
    return { error: "not_uno" };
  }

  counterUno(_caller_id, target_id) {
    if (!this.unoPending[target_id]) return { error: "no_pending" };
    const drawn = [];
    for (let i = 0; i < 2; i++) {
      const c = this._draw();
      this.hands[target_id].push(c);
      drawn.push(c);
    }
    delete this.unoPending[target_id];
    return { ok: true, drawn };
  }

  // ── Snapshots ─────────────────────────────────────────────────────────────

  handOf(user_id) { return this.hands[user_id] ?? []; }

  publicState() {
    return {
      current_player_id: this.currentPlayer,
      color:             this.color,
      last_card:         this.lastCard,
      direction:         this.direction,
      pending_draw:      this.pendingDraw,
      card_counts: Object.fromEntries(
        this.playerIds.map((uid) => [uid, this.hands[uid].length])
      ),
      winner: this.winner,
    };
  }
}
