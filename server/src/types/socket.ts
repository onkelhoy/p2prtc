import WebSocket from 'ws';
import { ID } from 'types';
import { RoomInfo } from './room';

// 
export interface SocketInfo extends Object {
  // NOTE this is where custom info would be added (username etc..)
}

export interface ISocket extends WebSocket {
  info: SocketInfo; 
  id: ID;
  rooms: ID[];
  strike: number;
  lastmessage: number;
  is_alive: boolean;
}

export type ISocketSimple = Pick<ISocket, "info" | "id">;

// Messages
export enum MessageCategory {
  Room,
  Socket,
}

export enum MessageType {
  Welcome,
  Target,
  Error,
}

export interface SocketMessage {
  category: MessageCategory;
  type: any;
}

export interface TargetMessage extends SocketMessage {
  category: MessageCategory.Socket;
  type: MessageType.Target;
  socket: ID;
}
