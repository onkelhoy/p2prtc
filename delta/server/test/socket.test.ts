/**
 * @jest-environment jsdom
 */

import { SocketServer } from 'socket';
import http from 'http';
import { IncomingMessageType, Message, MessageType, OutgoingMessageType } from 'types/message';

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


describe('Core Functionalities', () => {
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
  
  it('register network', async () => {
    const {socket} = getSocket();
    await wait();

    socket.send(JSON.stringify({
      type: IncomingMessageType.Register,
      network: { name: 'something' }
    }));
    await wait();

    expect(socketserver.hosts.size).toBe(1);
    expect(socketserver.hosts.get('1')).toHaveProperty('name', 'something');
  });
  

  it('host leave should result in network gone', async () => {
    const {socket} = getSocket();
    await wait();

    socket.send(JSON.stringify({
      type: IncomingMessageType.Register,
      network: { name: 'something' }
    }));
    await wait();
    socket.close();
    await wait();

    expect(socketserver.hosts.size).toBe(0);
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

  it('Network should be updated', async () => {
    const { socket } = getSocket();
    await wait();

    socket.send(JSON.stringify({
      type: IncomingMessageType.Register,
      network: { name: 'something' }
    }));
    await wait();
    socket.send(JSON.stringify({
      type: IncomingMessageType.Update,
      network: { name: 'something-else' }
    }));
    await wait();
    expect(socketserver.hosts.get('1')).toHaveProperty('name', 'something-else');
  });
});


// helper functions 

function getSocket() {
  const socket = new WebSocket("ws://localhost:8888");
  const messages = {
    [OutgoingMessageType.Error]: 0,
    [OutgoingMessageType.RegisterACK]: 0,
    [OutgoingMessageType.UpdateACK]: 0,
    [OutgoingMessageType.ConnectionACK]: 0,
    [MessageType.Target]: 0,
  };

  socket.onmessage = function (event: MessageEvent) {
    const message: Message = JSON.parse(event.data);

    messages[message.type as MessageType|OutgoingMessageType]++;
   }

  return { messages, socket };
}

function wait(milliseconds: number = 100): Promise<void> {
  return new Promise(rs => {
    setTimeout(rs, milliseconds);
  })
}