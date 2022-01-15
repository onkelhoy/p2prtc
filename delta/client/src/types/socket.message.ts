import { ID } from '.';
import { NetworkInfo } from './network';

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
  ConnectionACK = "socket-connection-ack",
  RegisterACK = "network-register-ack",
  UpdateACK = "network-update-ack",
}
export interface IncomingMessage extends Message {
  type: IncomingMessageType|MessageType;
}
export interface NetworkMessage extends IncomingMessage {
  network: NetworkInfo;
}

// incomming messages
export enum OutgoingMessageType {
  Register = "network-register",
  Update = "network-update",
}
export interface OutgoingMessage extends Message {
  type: OutgoingMessageType|MessageType;
}