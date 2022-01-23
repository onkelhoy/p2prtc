import { WebSocket } from 'ws';
import { ID } from '.';

export interface Socket extends WebSocket {
  id: ID;
  is_alive: boolean;
  strike: number;
  lastmessage?: number;
}

export interface NetworkInfo extends Record<string, any> {
  id: ID;
  host: ID;
}