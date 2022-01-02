import ws from 'ws';
import http from 'http';
import chalk from 'chalk';
import { Reactor } from 'reactor';
import { ReactorEvents, ID, SendEvent } from 'types';
import { ISocket, MessageCategory, MessageType, SocketInfo, SocketMessage, TargetMessage } from 'types/socket';
import { Room } from 'room';
import { RoomMessage, RoomType, RoomInfo, RoomIncommingMessage, WelcomeMessage, RoomJoinMessage, RoomTargetMessage } from 'types/room';

const reactor = new Reactor();
const socketmap = new Map<ID, ISocket>();
const rooms = new Map<ID, Room>();
let wss:ws.WebSocketServer;
let heartbeat_timer: NodeJS.Timer;
const idcounter = {
  first: 0,
  second: 0,
  third: 0,
}
//  = new ws.WebSocketServer({ noServer: true });

// CONSTANTS
const SPAM_DURATION = Number(process.env.SPAM_DURATION || 200);
const SPAM_RESET = Number(process.env.SPAM_RESET || 1500);
const MAX_STRIKES = Number(process.env.MAX_STRIKES || 3);
const HEARTBEAT_INTERVAL = Number(process.env.HEARTBEAT_INTERVAL || 2000);
const ID_MAX = Number(process.env.ID_MAX || 2000);

// register the events
reactor.register(ReactorEvents.Send);
reactor.register(ReactorEvents.RoomRemove);

// add event listeners
reactor.addEventListener(ReactorEvents.Send, send);
reactor.addEventListener(ReactorEvents.RoomRemove, removeroom);


export function startup(server:http.Server, setClientInfo?: (socket: ISocket, request: http.IncomingMessage) => SocketInfo) {
  wss = new ws.WebSocketServer({ server });
  wss.on('connection', function (socket: ISocket, request) {
    socket.id = getID();
    welcome(socket);

    if (setClientInfo) {
      socket.info = setClientInfo(socket, request);
    }
  
    socket.onmessage = onmessage;
    socket.onclose = onclose;
    socket.on("pong", function () {
      socket.is_alive = true;
    })
  });
  
  wss.on("error", function (err) {
    printerror(err.message);
  });
  
  // heartbeat
  heartbeat_timer = setInterval(function () {
    socketmap.forEach(socket => {
      if (!socket.is_alive) {
        socket.close();
      }
      else {
        socket.is_alive = false;
        socket.ping();
      }
    });
  }, HEARTBEAT_INTERVAL);
}

export function teardown() {
  for (const socket of wss.clients) {
    socket.terminate();
  }

  idcounter.first = 0;
  idcounter.second = 0;
  idcounter.third = 0;

  wss.close();

  clearInterval(heartbeat_timer);
}

// event functions
function send(event: SendEvent) {
  const message = JSON.stringify(event.message);

  for (const id of event.sockets) {
    const socket = socketmap.get(id);
    if (socket) {
      if (event.message.type === RoomType.Welcome) socket.rooms.push(event.message.room);
      if (event.message.type === RoomType.Leave) socket.rooms = socket.rooms.filter(id => id !== event.message.room);
      socket.send(message);
    }
  }
}

function removeroom(id:ID) {
  const room = rooms.get(id);
  if (room) {
    // should never happen (as a room is only removed when empty but..)
    const sids = room.clientids;
    for (const sid of sids) {
      const socket = socketmap.get(sid);
      if (socket) {
        socket.rooms = socket.rooms.filter(room => room !== id);
      }
    }
    rooms.delete(id);
  }
}

function onmessage(this:ISocket, event: ws.MessageEvent) {
  if (spamcheck(this)) {
    printerror(`socket ${this.id} is spamming server`);
    this.close();
    return;
  }

  const message = JSON.parse(event.data as string) as SocketMessage;

  switch (message.category) {
    case MessageCategory.Room: {
      roomIncommingMessage(this, message as RoomMessage);
      break;
    }
    case MessageCategory.Socket: {
      socketIncommingMessage(this, message as SocketMessage);
      break;
    }
    default: {
      send({
        sockets: [this.id],
        message: {
          category: MessageCategory.Socket,
          type: MessageType.Error,
          error: `incoming message with wrong category ${message.category}`
        }
      });
    }
  }
}

function onclose(this: ISocket) {
  for (const id of this.rooms) {
    const room = rooms.get(id);

    if (room) {
      room.leave(this.id);
    }
  }

  socketmap.delete(this.id);
}
// message functions
function roomIncommingMessage(socket: ISocket, message: RoomMessage) {
  if (message.type === RoomType.Create) {

    return;
  }

  const { room:roomid } = message as RoomIncommingMessage;
  const room = rooms.get(roomid);
  if (!room) {
    send({
      sockets: [socket.id],
      message: { category: MessageCategory.Room, type: RoomType.NotFound } as RoomMessage
    });

    return;
  }

  switch (message.type) {
    case RoomType.Join: {
      const { password } = message as RoomJoinMessage;
      room.join(socket, password);
      break;
    }
    case RoomType.Leave: {
      room.leave(socket.id);
      break;
    }
    case RoomType.Kick: {
      const { socket:target } = message as RoomTargetMessage;
      room.kick(socket.id, target);
      break;
    }
    case RoomType.Ban: {
      const { socket:target } = message as RoomTargetMessage;
      room.ban(socket.id, target);
      break;
    }
    case RoomType.Unban: {
      const { socket:target } = message as RoomTargetMessage;
      room.unban(socket.id, target);
      break;
    }
    default: {
      send({
        sockets: [socket.id],
        message: {
          category: MessageCategory.Socket,
          type: MessageType.Error,
          error: `room incoming message of unknown type ${message.type}`
        }
      })
    }
  }
}

function socketIncommingMessage(socket: ISocket, message: SocketMessage) {
  switch (message.type) {
    case MessageType.Target: {
      const { socket:socketid } = message as TargetMessage;
      send({
        sockets: [socketid],
        message,
      });
      break;
    }
    default: {
      send({
        sockets: [socket.id],
        message: {
          category: MessageCategory.Socket,
          type: MessageType.Error,
          error: `incoming socket-message with wrong type ${message.type}`
        }
      });
    }
  }
}

// helper functions
function welcome(socket: ISocket) {
  const roomsinfo: RoomInfo[] = [];
  rooms.forEach(room => roomsinfo.push(room.info));

  socket.is_alive = true;
  socketmap.set(socket.id, socket);
  // send all available rooms
  send({
    sockets: [socket.id],
    message: {
      category: MessageCategory.Socket,
      type: MessageType.Welcome,
      rooms: roomsinfo
    } as WelcomeMessage,
  });
}

function spamcheck (socket: ISocket):boolean {
  if (socket.lastmessage) {
    const duration = performance.now() - socket.lastmessage;
    if (duration < SPAM_DURATION) {
      // user sent message before duration time has passed, user should have MAXSTRIKES strikes and then banned
      socket.strike++;
    }
    else if (duration >= SPAM_RESET) {
      socket.strike = 0;
    }
  }

  socket.lastmessage = performance.now();
  return socket.strike >= MAX_STRIKES;
}

function printerror(error:string) {
  console.log(
    chalk.bgBlue.white("socket server error"),
    chalk.yellow(performance.now()),
    chalk.redBright(error)
  );
}

function getID():ID {
  idcounter.first++;
  if (idcounter.first > ID_MAX) {
    idcounter.first = 0;
    idcounter.second++;

    if (idcounter.second > ID_MAX) {
      idcounter.second = 0;
      idcounter.third++;

      if (idcounter.third > ID_MAX) {
        idcounter.third = 0;
      }
    }
  }

  return `${idcounter.first}${idcounter.second}${idcounter.third}`;
}
