import { SocketMessage } from "./socket.msg";

export type ID = string;

export interface SendEvent {
  message: any;
  sockets: ID[];
}