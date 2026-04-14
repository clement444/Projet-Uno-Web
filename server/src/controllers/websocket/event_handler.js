import { onJoinRoom }    from "./events/join_room.js";
import { onLeaveRoom }   from "./events/leave_room.js";
import { onStartGame }   from "./events/start_game.js";
import { onPlayCard }    from "./events/play_card.js";
import { onDrawCard }    from "./events/draw_card.js";
import { onUno }         from "./events/uno.js";
import { onCounterUno }  from "./events/counter_uno.js";

export function handleEvent(message, socket, wss) {
  switch (message.type) {
    case "join_room":    onJoinRoom(message, socket, wss);   break;
    case "leave_room":   onLeaveRoom(message, socket, wss);  break;
    case "start_game":   onStartGame(message, socket, wss);  break;
    case "play_card":    onPlayCard(message, socket, wss);   break;
    case "draw_card":    onDrawCard(message, socket, wss);   break;
    case "uno":          onUno(message, socket, wss);        break;
    case "counter_uno":  onCounterUno(message, socket, wss); break;
    default:
      socket.send(JSON.stringify({ error: `Unknown event type: ${message.type}` }));
  }
}
