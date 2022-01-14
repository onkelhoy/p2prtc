import { ID } from '.';

export enum MessageType {
  Target = "target",
  Update = "update",
}
export interface Message extends Object {
  type: any;
}

// outgoing messages 
export enum OutgoingMessageType {
  Welcome = "welcome",
  Deleted = "delete",
  Error = "error",
}

export interface OutgoingMessage extends Message {
  type: OutgoingMessageType;
}

// incomming messages
export enum IncomingMessageType {
  Register = "register",
}

export interface IncomingMessage extends Message {
  type: IncomingMessageType;
}

