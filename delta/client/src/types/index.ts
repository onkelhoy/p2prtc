export type ID = string;
export type PrintFunction = (type: string, ...args: any[]) => void;

export enum Events {
  Target = "target",
  SocketUpdateACK = "network-update-ack",
  SocketRegisterACK = "network-register-ack",
  SocketConnectionACK = "socket-connection-ack",
}

export interface ControllerConfig {
  printinfo?: boolean;
  socket: {
    url: string | URL;
    protocols?: string | string[];
  };
  rtcConfiguration?: RTCConfiguration;
}