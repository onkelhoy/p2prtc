import { ID, SendEvent } from 'types';
import { MessageCategory } from 'types/socket.msg';
import { RoomMessage, RoomType, UnothorizedReason } from 'types/room.msg';
import { ISocket, ISocketSimple, SocketInfo } from 'types/socket';
import { Reactor } from 'reactor';

const reactor = new Reactor();

interface RoomConfig {
  limit?: number;
  password?: string;
  name: string;
  id: ID;
}

enum Events {
  Send = "socket-send",
  RoomRemove = "room-remove",
}

export class Room {
  private sockets!: Map<ID, SocketInfo>;
  private password!: string|undefined;
  private limit!: number;
  private banned!: Set<ID>;
  public name!: string;
  public host!: ID;
  public id!: ID;

  constructor(creator: ISocketSimple, config: RoomConfig) {
    this.host = creator.id;
    this.limit = config.limit || Infinity;
    this.sockets = new Map();
    this.name = config.name;
    this.password = config.password;
    this.id = config.id;
    this.banned = new Set();
    
    // register events
    if (!reactor.has(Events.Send)) reactor.register(Events.Send);
    if (!reactor.has(Events.RoomRemove)) reactor.register(Events.RoomRemove);
    
    // join the creator
    this.join(creator, this.password);
  }

  private canjoin(socket: ID, password?: string): UnothorizedReason|null {
    if (this.limit === this.sockets.size) return UnothorizedReason.Full;
    if (this.banned.has(socket)) return UnothorizedReason.Banned;
    if (this.sockets.has(socket)) return UnothorizedReason.Duplicate;
    if (this.password && this.password !== password) return UnothorizedReason.Password;

    return null;
  }

  private authorize(socket: ID) {
    if (socket !== this.host) {
      // send (room unothorized)
      reactor.dispatch(
        Events.Send, 
        this.getmessage(socket, { reason: UnothorizedReason.NotHost, type: RoomType.Unothorized })
      );
      return false;
    }

    return true;
  }

  private getmessage(sockets: ID|ID[], data:object): SendEvent {
    const message = { category: MessageCategory.Room, ...data  } as RoomMessage;
    return {
      sockets: sockets instanceof Array ? sockets : [sockets],
      message,
    }
  }

  private get clientids() {
    const ids: ID[] = [];
    this.sockets.forEach((_info, id) => ids.push(id));

    return ids;
  }

  private get clients() {
    const clients: ISocketSimple[] = [];
    this.sockets.forEach((info, id) => clients.push({ id, info }));

    return clients;
  }

  public get size() { // mainly for testing
    return this.sockets.size;
  }
  public join(socket: ISocketSimple, password?: string) {
    const reason = this.canjoin(socket.id, password);
    if (!reason) {
      // broadcast to room that client joined 
      reactor.dispatch(
        Events.Send,
        this.getmessage(this.clientids, { type: RoomType.Join, sockets: [socket] })
      );
      // send to socket all client infos
      reactor.dispatch(
        Events.Send,
        this.getmessage(socket.id, { type: RoomType.Join, sockets: [this.clients] })
      );

      this.sockets.set(socket.id, socket.info);
    }
    else {
      // use reason to send unothorized message
      reactor.dispatch(
        Events.Send, 
        this.getmessage(socket.id, { reason, type: RoomType.Unothorized })
      );
    }
  }
  public leave(socket: ID) {
    this.sockets.delete(socket);

    if (this.sockets.size <= 0) {
      // parent should now remove the room
      reactor.dispatch(Events.RoomRemove, this.id);
    }
    else if (this.host === socket) {
      const next = this.sockets.keys().next();
      this.host = next.value;
      
      // host change
      reactor.dispatch(
        Events.Send, 
        this.getmessage(this.clientids, { type: RoomType.Host, socket: this.host }),
      );
    }
    else {
      // socket leave room
      reactor.dispatch(
        Events.Send, 
        this.getmessage(this.clientids, { type: RoomType.Leave, socket: socket }),
      );
    }
  }
  public kick(socket: ID, target: ID) {
    if (this.authorize(socket)) {
      this.leave(target);
    }
  }
  public ban(socket: ID, target: ID) {
    if (this.authorize(socket)) {
      this.leave(target);
      this.banned.add(target);
    }
  }
  public unban(socket: ID, target: ID) {
    if (this.authorize(socket)) {
      this.banned.delete(target);
    }
  }
}