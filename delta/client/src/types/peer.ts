import { ID } from "types";

export type MediaType = "screen" | "video" | "audio";

export type PeerType = "calling" | "receiving";

export interface PeerConfiguration {
  id: ID;
  rtcConfiguration: RTCConfiguration;
  offer?: RTCSessionDescriptionInit;
}