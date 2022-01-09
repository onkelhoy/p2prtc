import { ID, ReactorEvents, SendEvent } from 'types';
import { RoomMessage, RoomType, UnothorizedReason, RoomConfig, RoomInfo } from 'types/room';
import { ISocketSimple, SocketInfo, MessageCategory } from 'types/socket';
import { Reactor } from 'reactor';

const reactor = new Reactor();

export class Room {
  private sockets!: Map<ID, SocketInfo|undefined>;
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
    if (!reactor.has(ReactorEvents.Send)) reactor.register(ReactorEvents.Send);
    if (!reactor.has(ReactorEvents.RoomRemove)) reactor.register(ReactorEvents.RoomRemove);
    
    // join the creator
    this.join(creator, this.password);
  }

  private cantjoin(socket: ID, password?: string): UnothorizedReason|null {
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
        ReactorEvents.Send, 
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

  private get clients() {
    const clients: ISocketSimple[] = [];
    this.sockets.forEach((info, id) => clients.push({ id, info }));

    return clients;
  }

  public get info(): RoomInfo {
    return {
      limit: this.limit,
      name: this.name,
      locked: !!this.password,
      id: this.id,
    }
  }
  public get size() { // mainly for testing
    return this.sockets.size;
  }
  public get clientids() {
    const ids: ID[] = [];
    this.sockets.forEach((_info, id) => ids.push(id));

    return ids;
  }
  public join(socket: ISocketSimple, password?: string) {
    const reason = this.cantjoin(socket.id, password);
    if (!reason) {
      if (this.size > 0) {
        // broadcast to room that client joined 
        reactor.dispatch(
          ReactorEvents.Send,
          this.getmessage(this.clientids, { type: RoomType.Join, socket })
        );
        // send to socket all client infos
        reactor.dispatch(
          ReactorEvents.Send,
          this.getmessage(socket.id, { type: RoomType.Welcome, sockets: this.clients, room: this.id, host: this.host })
        );
      }
      else {
        // send welcome message confirming room creation and host
        reactor.dispatch(
          ReactorEvents.Send,
          this.getmessage(socket.id, { type: RoomType.Created, room: this.id })
        );
      }

      this.sockets.set(socket.id, socket.info);
    }
    else {
      // use reason to send unothorized message
      reactor.dispatch(
        ReactorEvents.Send, 
        this.getmessage(socket.id, { reason, type: RoomType.Unothorized })
      );
    }
  }
  public leave(socket: ID) {
    this.sockets.delete(socket);

    if (this.sockets.size <= 0) {
      // parent should now remove the room
      reactor.dispatch(ReactorEvents.RoomRemove, this.id);
      return;
    }

    // socket leave room
    reactor.dispatch(
      ReactorEvents.Send, 
      this.getmessage(this.clientids, { type: RoomType.Leave, socket, room: this.id }),
    );

    if (this.host === socket) {
      const next = this.sockets.keys().next();
      this.host = next.value;
      
      // host change
      reactor.dispatch(
        ReactorEvents.Send, 
        this.getmessage(this.clientids, { type: RoomType.Host, host: this.host }),
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