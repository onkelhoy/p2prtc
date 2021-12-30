import { reactor } from "utils/reactor";

describe('Reactor Pattern', () => {

  it('register foo and add listerners', () => {
    reactor.register("foo");
    const fooevent = reactor.get("foo");
    expect(fooevent).toMatchObject({ callbacks: [], name: "foo" });

    reactor.addEventListener("foo", () => 5);
    expect(fooevent?.callbacks.length).toBe(1);
  });

  it("dispatch event", async () => {
    let comp = 0;
    reactor.register("foo");
    for (let i=0; i<10; i++) {
      reactor.addEventListener("foo", (value:number) => {
        comp+=value;
      });
    }
    reactor.disptatch("foo", 5);

    expect(comp).toBe(50);
  });
});