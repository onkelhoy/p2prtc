import { ID } from '.';
import { PeerType } from './peer';

// for update purposes
export interface PartialNetworkInfo extends Record<string, any> {
  limit?: number;
  current?: number; 
  name?: string;
}

// required fields
export interface NetworkInfo extends PartialNetworkInfo {
  id: ID; 
  host: ID;
}

export interface RouterInfo {
  connection: ID[];
  type: PeerType;
}