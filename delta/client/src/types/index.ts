export type ID = string;
export type LogType = 'fatal'|'error'|'warning'|'info'|'debug'|'none';
export type PrintFunction = (type: string, ...args: any[]) => void;

export enum Events {
  Target = "target",
  SendTarget = "send-target",
  NetworkUpdate = 'network',
  NewStream = 'new-stream',
  NewDataChannel = 'new-data-channel',
  PeerAdd = 'pre-add-peer',
  PeerDelete = 'delete-peer',
  PeerConnectionOpen = 'add-peer',
  PeerMessage = 'peer-message', // onMessage
}

export enum SetType {
  User = 'user',
  Network = 'network',
  Media = "media",
}

// NOTE good page for stun servers: 
// https://ourcodeworld.com/articles/read/1536/list-of-free-functional-public-stun-servers-2021
export interface Config {
  logger?: LogType;
  socket: {
    url: string | URL;
    protocols?: string | string[];
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