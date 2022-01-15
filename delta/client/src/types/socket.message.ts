import { ID } from '.';
import { NetworkInfo } from './socket';

export enum MessageType {
  Target = "target",
}
export interface Message extends Object {
  type: any;
}

// target message 
export enum TargetType {
  Join = "join",
  Reject = "reject",
  Signal = "signal",
}
export interface TargetMessage extends Message {
  type: MessageType.Target;
  targetType: TargetType;
  target: ID;
}

// outgoing messages 
export enum IncomingMessageType {
  Error = "error",
  RegisterACK = "register-ack",
  UpdateACK = "update-ack",
}
export interface IncomingMessage extends Message {
  type: IncomingMessageType|MessageType;
}
export interface NetworkMessage extends IncomingMessage {
  network: NetworkInfo;
}

// incomming messages
export enum OutgoingMessageType {
  Register = "register",
  Update = "update",
}
export interface OutgoingMessage extends Message {
  type: OutgoingMessageType|MessageType;
}