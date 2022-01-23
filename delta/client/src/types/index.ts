export type ID = string;
export type LogType = 'fatal'|'error'|'warning'|'info'|'debug'|'none';
export type PrintFunction = (type: string, ...args: any[]) => void;

export enum Events {
  Target = "target",
  SendTarget = "send-target",
  NetworkUpdate = 'network-update',
  NewStream = 'new-stream',
  NewDataChannel = 'new-data-channel',
  PeerAdd = 'add-peer',
  PeerDelete = 'delete-peer',
  PeerConnectionOpen = 'peer-open',
  PeerMessage = 'peer-message', // onMessage
}

// NOTE good page for stun servers: 
// https://ourcodeworld.com/articles/read/1536/list-of-free-functional-public-stun-servers-2021
export interface Config {
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