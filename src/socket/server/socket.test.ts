/**
 * @jest-environment jsdom
 */

import { startServer, shutdownServer } from 'utils/createServer';
import { InitSocketServer } from './socket';
import { MessageType, SocketMessage } from './types';

// ############ SETUP #####################

beforeAll(() => {
  console.log('Mock server startup');
  startServer(8000, InitSocketServer);
});

afterAll(() => {
  console.log('Mock server shutdown');
  shutdownServer();
});

describe('Connection Test', () => {
  it('Should accept connection', () => {

  });

  it('Should handle disconnect', () => {

  });

  it('Should handle unothorized users', () => {

  });

  it('Should prevent spamming', () => {

  });
});

describe('Login, Register, Logout Test', () => {
  it('Should handle successful login', () => {

  });

  it('Should handle unsuccessful login', () => {

  });

  it('Should handle successful register', () => {

  });

  it('Should handle unsuccessful register', () => {

  });

  it('Should handle logout successfully', () => {

  });
});

// helper functions 

function getSocket() {
  const socket = new WebSocket("ws://localhost:8000");
  const messages = {};

  socket.onmessage = function (event: MessageEvent) {
    const message: SocketMessage = JSON.parse(event.data);
    // if (message.)
  }
}