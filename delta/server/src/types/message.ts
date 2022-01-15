import { ID } from '.';
import { NetworkInfo } from './socket';

export enum MessageType {
  Target = "target",
  Update = "update",
}
export interface Message extends Object {
  type: any;
}
export interface TargetMessage extends Message {
  type: MessageType.Target;
  target: ID;
}

// outgoing messages 
export enum OutgoingMessageType {
  Welcome = "welcome",
  Deleted = "delete",
  Error = "error",
}
export interface OutgoingMessage extends Message {
  type: OutgoingMessageType|MessageType;
}

// incomming messages
export enum IncomingMessageType {
  Register = "register",
}
export interface IncomingMessage extends Message {
  type: IncomingMessageType|MessageType;
}
export interface NetworkMessage extends IncomingMessage {
  network: NetworkInfo;
}