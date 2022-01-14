import { ID } from '.';

export enum MessageType {
  Target = "target",
  Update = "update",
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