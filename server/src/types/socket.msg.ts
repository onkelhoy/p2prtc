export enum MessageCategory {
  Room,
}

export interface SocketMessage {
  category: MessageCategory;
  type: any;
}

export interface TargetMessage extends SocketMessage {
  socket: ID;
}