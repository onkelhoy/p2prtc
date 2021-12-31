import { DoAndWait } from 'utils/functions';
import { Socket } from "socket";
import { MessageType } from "utils/types";

import * as mockserver from './mockserver';

const URL = "ws://localhost:8000";
let instance: Socket;

// ############ SETUP #####################

before(() => {
  mockserver.setup(8000);
});

after(() => {
  mockserver.teardown();
});

beforeEach(async () => {
  // clear instance
  instance = new Socket(URL);
  expect(instance).toBeInstanceOf(Socket);
});

afterEach(() => {
  if (instance) instance.Logout();
});

// helper functions
async function wait (x:number): Promise<void> {
  return await new Promise((r) => setTimeout(r, x));
}

// ########### TESTS ######################

describe('Socket Connection', () => {
  it('Should connect successfully', async () => {
    try {
      await wait(3000);
      expect(1).toBe(1);
    }
    catch (e) {
      expect(e).toBe(2);
    }
  });

  it('Should reconnect on failure', async () => {
    try {
      instance.Terminate(true);
      expect([WebSocket.CLOSED, WebSocket.CLOSING].includes(instance.Status)).toBe(true);
      await wait(2000);

      expect([WebSocket.OPEN, WebSocket.CONNECTING].includes(instance.Status)).toBe(true);
    }
    catch (e) {
      expect(e).toBe(2);
    }
  });

  it('Should disconnect successfully', () => {
    try {
      instance.Logout();
      expect([WebSocket.CLOSED, WebSocket.CLOSING].includes(instance.Status)).toBe(true);
    }
    catch (e) {
      expect(e).toBe(2);
    }
  });

  it('Should handle connection loss', async () => {
    mockserver.teardown();
    await wait(100);
    expect([WebSocket.CLOSED, WebSocket.CLOSING].includes(instance.Status)).toBe(true);
    mockserver.setup(8000);
    await wait(1000);
    expect([WebSocket.OPEN, WebSocket.CONNECTING].includes(instance.Status)).toBe(true);
  });
});

describe('Socket Authentication', () => {
  it('Should login successfully', async () => {
    try { 
      await instance.Login({ email: 'foo', password: 'bar' });
      expect(instance.token).toBe('banana');
    }
    catch (e) {
      expect(e).toBe(1);
    }
  });
});

describe('Socket Send', () => {
  beforeEach(async () => {
    // clear instance
    expect(instance).toBeInstanceOf(Socket);
    try { 
      await instance.Login({ email: 'foo', password: 'bar' });
      expect(instance.token).toBe('banana');
    }
    catch (e) {
      expect(e).toMatch("error");
    }
  });

  it('Should send message', () => {
    const success = instance.Send({ type: MessageType.TESTUnothenticated });
    expect(success).toBe(true);
  });

  it('Unothenticated messages should not be tolorated', async () => {
    try {
      instance.Logout();
      instance.Reconnect();
      
      await DoAndWait(
        MessageType.Unothorized,
        () => instance.Send({ type: MessageType.TESTAuthenticated }),
        (message, resolve) => {
          expect(1).toBe(1);
          resolve(true);
        }
      )
    }
    catch (e) {
      expect(e).toBe(2);
    }
  });

  it('Should store message on offline', () => {
    instance.Terminate();
    const now = instance.OfflineCount;
    instance.Send({ type: MessageType.TESTUnothenticated });
    instance.Send({ type: MessageType.TESTUnothenticated });
    instance.Send({ type: MessageType.TESTUnothenticated });
    expect(instance.OfflineCount - now).toBe(3);
  });

  it('Should send all offline messages on reconnect', async () => {
    instance.Terminate();
    expect(instance.OfflineCount).toBe(0);
    instance.Send({ type: MessageType.TESTUnothenticated });
    instance.Send({ type: MessageType.TESTUnothenticated });
    instance.Send({ type: MessageType.TESTUnothenticated });
    expect(instance.OfflineCount).toBe(3);

    instance.Reconnect();
    await wait(3000);
    expect(instance.OfflineCount).toBeLessThan(3);
  });
});