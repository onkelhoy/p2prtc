export type ID = string;
export type LogType = 'fatal'|'error'|'warning'|'info'|'debug'|'none';
export type PrintFunction = (type: string, ...args: any[]) => void;

export enum Events {
  Target = "target",
  SendTarget = "send-target",
  SocketUpdateACK = "network-update-ack",
  SocketRegisterACK = "network-register-ack",
  SocketConnectionACK = "socket-connection-ack",

  NetworkUpdate = 'network-update',
  NewStream = 'new-stream',
  NewDataChannel = 'new-data-channel',
  ForwardMessage = 'forward-message',

  PeerAdd = 'add-peer',
  PeerDelete = 'delete-peer',
  PeerMessage = 'peer-message',
  PeerConnectionOpen = 'peer-open',
}

export enum UIEvents {
  Network = 'network',
  PeerAdd = 'peer-add',
  PeerDelete = 'peer-delete',
};

// NOTE good page for stun servers: 
// https://ourcodeworld.com/articles/read/1536/list-of-free-functional-public-stun-servers-2021
export interface ControllerConfig {
  logger?: LogType;
  info?: Object;
  socket: {
    url: string | URL;
    protocols?: string | string[];
  };
  testing?: {
    peers: boolean;
  };
  user?: SparseUserInfo;
  rtcConfiguration?: RTCConfiguration;
}

export interface SparseUserInfo extends Record<string, any> {
  // everything you'd like goes here (updatable)
}
export interface UserInfo extends SparseUserInfo {
  id: ID;
}