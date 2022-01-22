import { ID } from '.';

// for update purposes
export interface PartialNetworkInfo extends Record<string, any> {
  limit?: number;
  current?: number; 
  name?: string;
}

// required fields
export interface NetworkInfo extends PartialNetworkInfo {
  id: ID; 
}

export interface RouterInfo {
  connection: ID[];
}