import { ID } from 'types';
import { UnothorizedReason } from 'types/room.msg';
import { ISocket, ISocketSimple, SocketInfo } from 'types/socket';

interface RoomConfig {
  limit?: number;
  password?: string;
  name: string;
  id: ID;
}

export class Room {
  private clients!: Map<ID, SocketInfo>;
  private password!: string;
  private limit!: number;
  private banned!: Set<ID>;
  public name!: string;
  public host!: ID;
  public id!: ID;

  constructor(creator: ISocketSimple, config: RoomConfig) {
    this.host = creator.id;
    this.limit = config.limit || Infinity;
    this.clients = new Map();
    this.name = config.name;
    this.id = config.id;
    this.banned = new Set();
    
    this.join(creator);
  }

  private canjoin(socket: ID) {
    if (this.limit === this.clients.size) return UnothorizedReason.Full;
    if (this.banned.has(socket)) return UnothorizedReason.Banned;
    if (this.clients.has(socket)) return UnothorizedReason.Duplicate;

    return null;
  }

  private authorize(socket: ID) {
    if (socket !== this.host) {
      // TODO send (room unothorized)
      return false;
    }

    return true;
  }

  public get size() { // mainly for testing
    return this.clients.size;
  }
  public join(socket: ISocketSimple, password?: string) {
    const reason = this.canjoin(socket.id);
    if (!reason) {
      // TODO broadcast to room that client joined 
      // TODO send to socket all client infos

      this.clients.set(socket.id, socket.info);
    }
    else {
      // TODO use reason to send unothorized message
      // { reason, type: RoomType.Unothorized }
    }
  }
  public leave(socket: ID) {
    this.clients.delete(socket);

    if (this.clients.size <= 0) {
      // TODO parent should now remove the room
    }
    else if (this.host === socket) {
      const next = this.clients.keys().next();
      this.host = next.value;
      // TODO send (room host)
    }
    else {
      // TODO send (room leave)
    }
  }
  public kick(socket: ID, target: ID) {
    if (this.authorize(socket)) {
      this.clients.delete(target);
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