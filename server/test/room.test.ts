import { Room } from "../src/room";
import { ISocketSimple } from '../src/types/socket';

function getClient(id: number): ISocketSimple {
  return { id: id.toString(), info: {} };
}

describe("Core room tests", () => {
  it("create room", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
    });

    expect(room.size).toBe(1);
    expect(room.host).toBe('0');
  });

  it("join room", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
    });
    room.join(getClient(1));

    expect(room.size).toBe(2);
  });

  it("room limit", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
      limit: 1,
    });
    room.join(getClient(1));

    expect(room.size).toBe(1);
  });

  it("join locked room", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
      password: '123',
    });
    room.join(getClient(1), '123');

    expect(room.size).toBe(2);
  });

  it("no password", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
      password: '123',
    });
    room.join(getClient(1));

    expect(room.size).toBe(1);
  });

  it("wrong password", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
      password: '123',
    });
    room.join(getClient(1), '1234');

    expect(room.size).toBe(1);
  });
});