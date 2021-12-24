import WebSocket from 'ws';

// utils 
export interface IToken {
  
}

// socket 
export enum MessageType {
  Unothorized = "unothorized", // server response
  Logout = "logout",

  Login = "login",
  LoginAnswer = "login-answer",
  Register = "register",
  RegisterAnswer = "register-answer",
  Target = "target",
}

export interface ISocket extends WebSocket {
  public: IUserPublicInfo; // the info that can be public to others
  system: IUserSystemInfo; // system info (does not reach clients)
  lastmessage: number;
  strike: number;
};

export interface SocketMessage {
  type: string;
} 

export interface SocketAuthenticatedMessage extends SocketMessage {
  token: IToken;
}

export interface SocketErrorMessage extends SocketMessage {
  error?: string;
}

export interface SocketLoginMessage extends SocketMessage {
  credentials: ICredentials;
}

export interface SocketRegisterMessage extends SocketMessage {
  user: IUserPublicInfo;
}

export interface SocketRegisterResponse extends SocketErrorMessage {
  user?: IUser;
}

export interface SocketLoginResponse extends SocketRegisterResponse {
  token?: IToken;
}

export interface SocketTargetMessage extends SocketAuthenticatedMessage {
  target: string; // socket id
}

// user 
export enum UserStatus {
  created,
  confirmed,
  banned,
}
export interface IUser {
  id: string;
  email: string;
  name: string;
  score: number;
  password: string;
  status: UserStatus;
}
export interface IUserPublicInfo {
  email: string;
  name: string;
  score: number;
}
export interface IUserSystemInfo {
  id: string;
  status: UserStatus;
} 
interface IUserRegisterInfo {
  email: string;
  password: string;
  name: string;
}

export interface ICredentials {
  email: string;
  password: string;
} 