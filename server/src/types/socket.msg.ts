export enum MessageCategory {
  Room,
}

export interface SocketMessage {
  category: MessageCategory;
  type: any;
}