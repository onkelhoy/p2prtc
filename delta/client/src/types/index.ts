export type ID = string;

export enum Events {
  NewPeer = "peer-new",
  Target = "target",
  SocketUpdateACK = "network-update-ack",
  SocketRegisterACK = "network-register-ack",
  SocketConnectionACK = "socket-connection-ack",
}

export interface ControllerConfig {
  socket: {
    url: string | URL;
    protocols?: string | string[];
  };
  rtcConfiguration?: RTCConfiguration;
}