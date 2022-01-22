import { ID, UserInfo } from "types";
import { NetworkInfo } from "./network";
import { Message, MessageType, TargetMessage, TargetType } from "./socket.message";

// signaling 
export enum SignalType {
  candidate = "candidate",
  offer = "offer",
  answer = "answer",
}
export type SignalData = RTCIceCandidate|RTCSessionDescriptionInit;
export interface SignalMessage extends TargetMessage {
  type: MessageType.Target;
  targetType: TargetType.Signal;
  signal: SignalType;
  data: SignalData;
  user: UserInfo;
}

export enum SystemType {
  Target = "target",
  Init = "init",
  Forward = "forward",
}
export interface SystemMessage extends Message {
  type: SystemType;
}
export interface SystemInitMessage extends SystemMessage {
  type: SystemType.Init;
  user: UserInfo;
  network: NetworkInfo;
}

export interface ForwardMessage extends SystemMessage {
  type: SystemType.Forward;
  connections: ID[];
  target: ID;
}