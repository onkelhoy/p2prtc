import { ID } from '.';
import { NetworkInfo } from './socket';

export enum MessageType {
  Target = "target",
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
  Error = "error",
  RegisterACK = "register-ack",
  UpdateACK = "update-ack",
}
export interface OutgoingMessage extends Message {
  type: OutgoingMessageType|MessageType;
}

// incomming messages
export enum IncomingMessageType {
  Register = "register",
  Update = "update",
}
export interface IncomingMessage extends Message {
  type: IncomingMessageType|MessageType;
}
export interface NetworkMessage extends IncomingMessage {
  network: NetworkInfo;
}