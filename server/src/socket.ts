import ws from 'ws';
import chalk from 'chalk';
import { IncomingMessage } from 'http';

// import local modules
import { Room } from 'room';
import { Reactor } from 'reactor';

// import types
import { ReactorEvents, ID, SendEvent } from 'types';
import { ISocket, MessageCategory, MessageType, SocketInfo, SocketMessage, TargetMessage } from 'types/socket';
import { RoomMessage, RoomType, RoomInfo, RoomIncommingMessage, WelcomeMessage, RoomJoinMessage, RoomTargetMessage } from 'types/room';

export interface ServerOptions extends ws.ServerOptions {
  setClientInfo?(socket: ISocket, request: IncomingMessage): SocketInfo;
  heartbeat_interval?: number;
  spam_duration?: number;
  spam_reset?: number;
  id_max?: number;
  strikes?: number;
}

const reactor = new Reactor();
export class SocketServer extends ws.WebSocketServer {

  private heartbeat_timer: NodeJS.Timer;
  private rooms!: Map<ID, Room>; 
  private sockets!: Map<ID, ISocket>;
  // NOTE id-counter is used to tick up the current id
  private idc = {
    first: 0,
    second: 0,
    third: 0,
  }
  options!: ServerOptions;

  constructor(options: ServerOptions, callback?: (() => void) | undefined) {
    super(options, callback);

    this.on('connection', (socket: ISocket, request) => {
      if (this.options.setClientInfo) {
        socket.info = this.options.setClientInfo(socket, request);
      }
      this.welcome(socket, request);
  
      socket.onmessage = this.onclientmessage();
      socket.onclose = this.onclientclose();
      socket.on("pong", function () {
        socket.is_alive = true;
      })
    });
    
    this.on("error", (err) => {
      this.printerror(err.message);
    });

    // register the events
    reactor.register(ReactorEvents.Send);
    reactor.register(ReactorEvents.RoomRemove);

    // add event listeners
    reactor.addEventListener(ReactorEvents.Send, this.send);
    reactor.addEventListener(ReactorEvents.RoomRemove, this.removeroom);

    // heartbeat
    this.heartbeat_timer = setInterval(() => {
      this.sockets.forEach(socket => {
        if (!socket.is_alive) {
          socket.close();
        }
        else {
          socket.is_alive = false;
          socket.ping();
        }
      });
    }, this.options.heartbeat_interval || 2000);
  }

  getClient (id:ID) {
    return this.sockets.get(id);
  }

  private send(event: SendEvent): void {
    const message = JSON.stringify(event.message);

    for (const id of event.sockets) {
      const socket = this.sockets.get(id);
      if (socket) {
        if (event.message.type === RoomType.Welcome) socket.rooms.push(event.message.room);
        if (event.message.type === RoomType.Leave) socket.rooms = socket.rooms.filter(id => id !== event.message.room);
        socket.send(message);
      }
    }
  }
  private removeroom(id:ID) {
    const room = this.rooms.get(id);
    if (room) {
      // should never happen (as a room is only removed when empty but..)
      const sids = room.clientids;
      for (const sid of sids) {
        const socket = this.sockets.get(sid);
        if (socket) {
          socket.rooms = socket.rooms.filter(room => room !== id);
        }
      }
      this.rooms.delete(id);
    }
  }
  private onclientmessage() {
    const wss = this;
    return function (this: ISocket, event: ws.MessageEvent) {
      if (wss.spamcheck(this)) {
        wss.printerror(`socket ${this.id} is spamming server`);
        this.close();
        return;
      }
    
      const message = JSON.parse(event.data as string) as SocketMessage;
    
      switch (message.category) {
        case MessageCategory.Room: {
          wss.roomIncommingMessage(this, message as RoomMessage);
          break;
        }
        case MessageCategory.Socket: {
          wss.socketIncommingMessage(this, message as SocketMessage);
          break;
        }
        default: {
          wss.send({
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
  }
  private onclientclose() {
    const wss = this;
    return function(this: ISocket) {
      for (const id of this.rooms) {
        const room = wss.rooms.get(id);
    
        if (room) {
          room.leave(this.id);
        }
      }
    
      wss.sockets.delete(this.id);
    }
  }
  private roomIncommingMessage(socket: ISocket, message: RoomMessage) {
    if (message.type === RoomType.Create) {
  
      return;
    }
  
    const { room:roomid } = message as RoomIncommingMessage;
    const room = this.rooms.get(roomid);
    if (!room) {
      this.send({
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
        this.send({
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
  private socketIncommingMessage(socket: ISocket, message: SocketMessage) {
    switch (message.type) {
      case MessageType.Target: {
        const { socket:socketid } = message as TargetMessage;
        this.send({
          sockets: [socketid],
          message,
        });
        break;
      }
      default: {
        this.send({
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
  private welcome(socket: ISocket, request: IncomingMessage) {
    const roomsinfo: RoomInfo[] = [];
    this.rooms.forEach(room => roomsinfo.push(room.info));

    socket.is_alive = true;
    socket.id = this.getID();
    socket.rooms = [];

    this.sockets.set(socket.id, socket);
    // send all available rooms
    this.send({
      sockets: [socket.id],
      message: {
        category: MessageCategory.Socket,
        type: MessageType.Welcome,
        rooms: roomsinfo
      } as WelcomeMessage,
    });
  }
  private spamcheck(socket: ISocket):boolean {
    if (socket.lastmessage) {
      const duration = performance.now() - socket.lastmessage;
      if (duration < (this.options.spam_duration || 200)) {
        // user sent message before duration time has passed, user should have MAXSTRIKES strikes and then banned
        socket.strike++;
      }
      else if (duration >= (this.options.spam_reset || 1500)) {
        socket.strike = 0;
      }
    }
  
    socket.lastmessage = performance.now();
    return socket.strike >= (this.options.strikes || 5);
  }
  private printerror(error:string) {
    console.log(
      chalk.bgBlue.white("socket server error"),
      chalk.yellow(performance.now()),
      chalk.redBright(error)
    );
  }
  private getID(): ID {
    this.idc.first++;
    const id_max = this.options.id_max || 2000;
    if (this.idc.first > id_max) {
      this.idc.first = 0;
      this.idc.second++;

      if (this.idc.second > id_max) {
        this.idc.second = 0;
        this.idc.third++;

        if (this.idc.third > id_max) {
          this.idc.third = 0;
        }
      }
    }

    return `${this.idc.first}${this.idc.second}${this.idc.third}`;
  }

  // override functions 
  close() {
    for (const socket of this.clients) {
      socket.terminate();
    }
  
    this.idc.first = 0;
    this.idc.second = 0;
    this.idc.third = 0;
  
    super.close();
  
    clearInterval(this.heartbeat_timer);
  }
}