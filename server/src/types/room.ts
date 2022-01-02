import { ID } from 'types';
import { SocketMessage, MessageCategory, MessageType } from 'types/socket';

export interface RoomConfig {
  limit?: number;
  password?: string;
  name: string;
  id: ID;
}

export interface RoomInfo {
  limit: number;
  locked: boolean;
  name: string;
  id: ID;
}

export enum RoomType {
  Leave = "room-leave",
  Join = "room-join",
  Host = "room-host",
  Kick = "room-kick",
  Ban = "room-ban",
  Created = "room-created",
  Welcome = "room-welcome",
  Unban = "room-unban",
  Unothorized = "room-unothorized",
  Create = "room-create",
  NotFound = "room-notFound",
}

export enum UnothorizedReason {
  Full = "room-unothorized-full",
  Banned = "room-unothorized-banned",
  NotHost = "room-unothorized-host",
  Password = "room-unothorized-password",
  Duplicate = "room-unothorized-duplicate", // NOTE should never be sent 
}

// NOTE this is technically not a room message but it uses room-info
export interface WelcomeMessage extends SocketMessage {
  category: MessageCategory.Socket;
  type: MessageType.Welcome;
  rooms: RoomInfo[];
}

export interface RoomMessage extends SocketMessage {
  category: MessageCategory.Room,
  type: RoomType;
}

export interface UnothorizedMessage extends RoomMessage {
  type: RoomType.Unothorized;
  reason: UnothorizedReason;
}

export interface RoomIncommingMessage extends RoomMessage {
  room: ID;
}

export interface RoomJoinMessage extends RoomIncommingMessage {
  password?: string;
}

export interface RoomTargetMessage extends RoomIncommingMessage {
  socket: ID;
}