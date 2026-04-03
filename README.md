# Uno Online – Spécification de projet

## 1. Objectif du projet

Créer une version en ligne du jeu **Uno** jouable dans un navigateur, avec :
- **Parties en temps réel** via WebSocket
- **Serveur Node.js / Express** pour l’API REST et le hosting
- **Gestion multi-salles** (tables de jeu)
- **Règles Uno classiques** (piocher, +2, +4, inversion, passe ton tour, changement de couleur, etc.)

---

## 2. Stack technique

- **Backend**
  - Node.js
  - Express.js (API REST, statiques)
  - WebSocket (Socket.IO ou `ws`)
  - Gestion d’état en mémoire (au début), puis optionnellement Redis

- **Frontend**
  - HTML / CSS / JS (ou framework : React / Vue / Svelte au choix)
  - Client WebSocket
  - UI responsive (desktop + mobile)

- **Outils & Qualité**
  - TypeScript (optionnel mais recommandé)
  - ESLint / Prettier
  - Jest / Vitest pour les tests
  - Docker (optionnel pour déploiement)

---

## 3. Fonctionnalités principales

### 3.1 Joueur & Authentification légère

- **Pseudo invité** (pas de vraie auth au début)
- Choix d’un **avatar** simple (couleur, icône)
- Gestion d’un **ID de session** (cookie ou localStorage)

### 3.2 Salles & parties

- Créer une salle :
  - Nom de salle
  - Nombre max de joueurs (2–6)
  - Option : règles spéciales (empilement +2/+4, 7-0, etc. pour plus tard)
- Rejoindre une salle existante (liste des salles disponibles)
- Lancer la partie quand il y a au moins 2 joueurs
- Gestion de l’état de la salle :
  - En attente
  - En cours
  - Terminée

### 3.3 Mécanique de jeu Uno

- Distribution initiale (7 cartes / joueur)
- Pioche centrale + défausse
- Tour par tour :
  - Joueur courant
  - Vérification des coups valides (couleur, valeur, symbole)
- Cartes spéciales :
  - **+2** : prochain joueur pioche 2 cartes
  - **+4** : prochain joueur pioche 4 cartes + choix de couleur
  - **Inversion** : inverse le sens de jeu
  - **Passe ton tour** : saute le prochain joueur
  - **Changement de couleur** : choix de couleur
- Gestion du **“UNO !”** :
  - Si un joueur a 1 carte, il doit cliquer sur “UNO”
  - Si oublié et dénoncé (feature future), pénalité (piocher 2 cartes)
- Condition de victoire :
  - Premier joueur à ne plus avoir de cartes
  - Classement final (ordre de sortie)

---

## 4. Architecture globale

### 4.1 Vue d’ensemble

- **Client** :
  - UI de lobby (liste des salles, création)
  - UI de jeu (main du joueur, plateau, joueurs, chat)
  - Communication temps réel via WebSocket
- **Serveur** :
  - API REST pour :
    - Création / liste des salles
    - Récupération d’infos de base
  - WebSocket pour :
    - Événements de jeu (piocher, jouer une carte, changement de tour)
    - Synchronisation de l’état de la partie
    - Chat en temps réel

### 4.2 Modèle de données (simplifié)

#### Joueur

```ts
type Player = {
  id: string;
  name: string;
  avatarColor: string;
  hand: Card[];
  hasSaidUno: boolean;
  isConnected: boolean;
};
```
