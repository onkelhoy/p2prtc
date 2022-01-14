/**
 * @jest-environment jsdom
 */

import { SocketServer } from 'socket';
import http from 'http';
import { MessageCategory, MessageType, SocketMessage } from 'types/socket';
import { RoomCreateMessage, RoomType } from 'types/room';

// ############ SETUP #####################

let httpserver: http.Server;
let socketserver: SocketServer;
let idticker = 0;

beforeAll(async () => {
  return new Promise<void>(rs => {
    httpserver = http.createServer();
    httpserver.listen(8888, () => {
      console.log('Server Startup');
      rs();
    });
  });
});

afterAll(() => {
  httpserver.close();
  console.log('Server teardown');
});

describe('Connection Test', () => {
  beforeEach(() => {
    socketserver = new SocketServer({ 
      server: httpserver,
      setClientID: () => {
        idticker++;
        return idticker.toString();
      }
    });
  });
  
  afterEach(async () => {
    idticker = 0;
    socketserver.close();
    await wait();
  });

  it('Should accept connection', async () => {
    const { socket } = getSocket();
    await wait();

    expect(socketserver.sockets.size).toBe(1);
    expect(socket.readyState).toBe(WebSocket.OPEN);
  });

  it('Assigning custom IDs', async () => {
    socketserver.close();
    socketserver = new SocketServer({
      server: httpserver,
      setClientID: () => '55555',
    });
    await wait();
    getSocket();
    await wait();

    const socket = socketserver.sockets.get('55555');
    expect(socket?.id).toBe('55555');
  });

  it('Duplicate Id', async () => {
    socketserver.close();
    socketserver = new SocketServer({
      server: httpserver,
      setClientID: () => '55555',
    });
    await wait();
    getSocket();
    await wait();
    getSocket();
    await wait();
    
    expect(socketserver.sockets.size).toBe(1);
  });

  it('Should prevent spamming', async () => {
    const {socket} = getSocket();

    await wait();
    for (let i=0; i<6; i++) {
      socket.send('hello world');
    }
    await wait();

    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });

  it('Reset spamming', async () => {
    const {socket} = getSocket();

    await wait();
    for (let i=0; i<4; i++) {
      socket.send('hello world');
    }
    await wait(1500);
    socket.send('hello world');
    socket.send('hello world');
    await wait();

    expect(socket.readyState).toBe(WebSocket.OPEN);
  });
});

describe('Room events', () => {
  beforeAll(() => {
    socketserver = new SocketServer({ 
      server: httpserver,
      setClientID: () => {
        idticker++;
        return idticker.toString();
      }
    });
  });
  
  afterAll(() => {
    socketserver.close();
  });

  it('Create room', async () => {
    const { socket, messages } = getSocket();
    await wait();

    socket.send(JSON.stringify({
      category: MessageCategory.Room,
      type: RoomType.Create,
      config: {
        name: 'Room A',
      }
    } as RoomCreateMessage));
    await wait();

    expect(messages[0][RoomType.Created]).toBe(1);
  })
})

// helper functions 

function getSocket() {
  const socket = new WebSocket("ws://localhost:8888");
  const messages = {
    [MessageCategory.Socket]: {
      [MessageType.Welcome]: 0,
      [MessageType.Target]: 0,
      [MessageType.Error]: 0,
    },
    [MessageCategory.Room]: {
      [RoomType.Created]: 0,
      [RoomType.Leave]: 0,
      [RoomType.Join]: 0,
      [RoomType.Host]: 0,
      [RoomType.Kick]: 0,
      [RoomType.Ban]: 0,
      [RoomType.Created]: 0,
      [RoomType.Welcome]: 0,
      [RoomType.Unban]: 0,
      [RoomType.Unothorized]: 0,
      [RoomType.Create]: 0,
      [RoomType.NotFound]: 0,
    },
  };

  socket.onmessage = function (event: MessageEvent) {
    const message: SocketMessage = JSON.parse(event.data);

    if (message.category === MessageCategory.Room) {
      messages[MessageCategory.Room][message.type as RoomType]++;
    }
    else {
      messages[MessageCategory.Socket][message.type as MessageType]++;
    }
  }

  return { messages, socket };
}

function wait(milliseconds: number = 100): Promise<void> {
  return new Promise(rs => {
    setTimeout(rs, milliseconds);
  })
}