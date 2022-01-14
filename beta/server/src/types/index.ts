export type ID = string;

export interface SendEvent {
  message: any;
  sockets: ID[];
}

export enum ReactorEvents {
  Send = "socket-send",
  RoomRemove = "room-remove",
}
