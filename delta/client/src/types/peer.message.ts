import { UserInfo } from "types";
import { MessageType, TargetMessage, TargetType } from "./socket.message";

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