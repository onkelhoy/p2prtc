// utils
export interface IUser {
  email: string;
}

export interface IToken {
  
}

export interface ICredentials {
  email: string;
  password: string;
}

// socket
export enum MessageType {
  TESTUnothenticated = "unothenticated", // for testing purposes
  TESTAuthenticated = "authenticated",
  Unothorized = "unothorized", // server response

  Logout = "logout",
  Login = "login",
  LoginAnswer = "login-answer",
}

export interface SocketMessage {
  type: MessageType;
}

export interface SocketErrorMessage extends SocketMessage {
  error?: string;
}

export interface SocketLoginMessage extends SocketMessage {
  credentials: ICredentials;
}

export interface SocketLoginResponse extends SocketErrorMessage {
  user?: IUser;
  token?: IToken;
}