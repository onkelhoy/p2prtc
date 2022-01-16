import { Socket } from "socket";

import * as mockserver from './mockserver';

const URL = "ws://localhost:8000";
let socket: Socket;

//#region ############ SETUP #####################

beforeAll(() => {
  mockserver.setup(8000);
});

afterAll(() => {
  mockserver.teardown();
});

beforeEach(async () => {
  // clear socket
  socket = new Socket(URL);
});

afterEach(() => {
  socket.close();
});

//#endregion ########### TESTS ######################

describe('Socket Connection', () => {
  it('Should connect successfully', async () => {
    await wait();

  });

  it('Should reconnect on failure', async () => {
    
  });

  it('Should disconnect successfully', () => {
    
  });

  it('Should handle connection loss', async () => {

  });

  it('Should receive message', async () => {

  })
});

describe('Socket Send', () => {
  it('Should send message', () => {
    
  });

  it('Should store message on offline', () => {
    // instance.Terminate();
    // const now = instance.OfflineCount;
    // instance.Send({ type: MessageType.TESTUnothenticated });
    // instance.Send({ type: MessageType.TESTUnothenticated });
    // instance.Send({ type: MessageType.TESTUnothenticated });
    // expect(instance.OfflineCount - now).toBe(3);
  });

  it('Should send all offline messages on reconnect', async () => {
    // instance.Terminate();
    // expect(instance.OfflineCount).toBe(0);
    // instance.Send({ type: MessageType.TESTUnothenticated });
    // instance.Send({ type: MessageType.TESTUnothenticated });
    // instance.Send({ type: MessageType.TESTUnothenticated });
    // expect(instance.OfflineCount).toBe(3);

    // instance.Reconnect();
    // await wait(3000);
    // expect(instance.OfflineCount).toBeLessThan(3);
  });
});

// helper functions
