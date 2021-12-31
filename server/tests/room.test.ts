import assert from 'assert';
import { Room } from "room";
import { ISocketSimple } from 'types/socket';

function getClient(id: number): ISocketSimple {
  return { id: id.toString(), info: {} };
}

describe("Core room tests", () => {
  it("create room", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
    });

    assert.equal(room.size, 1);
    assert.equal(room.host, '0');
  });

  it("join room", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
    });
    room.join(getClient(1));

    assert.equal(room.size, 2);
  });

  it("room limit", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
      limit: 1,
    });
    room.join(getClient(1));

    assert.equal(room.size, 1);
  });

  it("join locked room", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
      password: '123',
    });
    room.join(getClient(1), '123');

    assert.equal(room.size, 2);
  });

  it("no password", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
      password: '123',
    });
    room.join(getClient(1));

    assert.equal(room.size, 1);
  });

  it("wrong password", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
      password: '123',
    });
    room.join(getClient(1), '1234');

    assert.equal(room.size, 1);
  });
});