import { ID } from '.';

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