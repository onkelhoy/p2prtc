import WebSocket from 'ws';
import { ID } from 'types';

export interface SocketInfo extends Object {
  // NOTE this is where custom info would be added (username etc..)
}

export interface ISocket extends WebSocket {
  info: SocketInfo; 
  id: ID;
}

export type ISocketSimple = Pick<ISocket, "info" | "id">;