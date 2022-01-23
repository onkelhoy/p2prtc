import { ID, UserInfo } from "types";

export type PeerType = "calling" | "receiving";
export interface PeerConfiguration {
  id: ID;
  rtcConfiguration?: RTCConfiguration;
  offer?: RTCSessionDescriptionInit;

  streams: Map<Omit<MediaType, 'data'>, MediaStream>;
  channels: Map<string, RTCDataChannelInit | undefined>;
}

// media related
export enum MediaType {
  Screen = "screen",
  Video = "video",
  Audio = "audio",
  Data = "data",
};
export type MediaConfig = DataChannelConfig|MediaStreamConstraints|DisplayMediaStreamConstraints;

export interface DataChannelConfig {
  label: string;
  dataChannelDict?: RTCDataChannelInit | undefined;
}