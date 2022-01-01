import { SocketMessage, MessageCategory } from 'types/socket.msg';
import { ISocket } from 'types/socket';

export enum RoomType {
  Leave = "room-leave",
  Join = "room-join",
  Host = "room-host",
  Kick = "room-kick",
  Ban = "room-ban",
  Unban = "room-unban",
  Unothorized = "room-unothorized",
}

export enum UnothorizedReason {
  Full = "room-unothorized-full",
  Banned = "room-unothorized-banned",
  NotHost = "room-unothorized-host",
  Password = "room-unothorized-password",
  Duplicate = "room-unothorized-duplicate", // NOTE should never be sent 
}

export interface RoomMessage extends SocketMessage {
  category: MessageCategory.Room,
  type: RoomType;
}

export interface RoomSocketMessage extends RoomMessage {
  socket: ISocket;
}

export interface UnothorizedMessage extends RoomMessage {
  type: RoomType.Unothorized;
  reason: UnothorizedReason;
}
