import { Global } from 'utils/global';
import { 
  EventWait,
  print as printfunction,
  trycatch,
  tryuntil, 

  wait, // test helper function
} from 'utils/helper';
import { Reactor } from 'utils/reactor';

const print = printfunction("test", "error");
let logs: string[] = [];

const reactor = new Reactor();

beforeAll(() => {
  Global.logger = 'debug';
});

beforeEach(() => {
  console.error = function(...args: any[]) {
    logs.push(args.join(" "));
  }
})

afterEach(() => {
  logs = [];
});

describe('printerror', () => {
  it("printerror should return a print function", () => {
    expect(typeof print).toBe("function");
  });
  it("printerror should log with format: '[NAME type-error] ...errors'", () => {
    print("test", "test");

    expect(logs.length).toBe(1);
    expect(logs[0]).toBe("[TEST test-error] test");
  });
});

describe("trycatch", () => {
  it("successfull should return null", async () => {
    const ans = await trycatch("test", () => {
      return 1;
    }, print);

    expect(ans).toBeNull();
  });
  it("unsuccessful should return error + print", async () => {
    const ans = await trycatch("test", () => {
      throw new Error("test-error");
    }, print);

    expect(logs.length).toBe(1);
    expect(logs[0]).toBe("[TEST test-error] Error: test-error");
    expect(ans).not.toBeNull();
  });
});

describe("tryuntil", () => {
  it("should return full error array", async () => {
    const errors = await tryuntil("test", () => {
      throw new Error("test-fail");
    }, 3, print, 1);

    expect(errors).toHaveLength(3);
  });

  it("should return current attempt number", async () => {
    let testattempts = 0;
    await tryuntil("test", attempt => {
      testattempts+=attempt;
      throw new Error("test-continue failed");
    }, 5, print, 1);

    expect(testattempts).toBe(10); // 0 + 1 + 2 + 3 + 4 = 10
  })

  it("one success should quit process", async () => {
    const errors = await tryuntil("test", attempt => {
      if (attempt === 2) return 2;

      throw new Error("test-fail");
    }, 3, print, 1);

    expect(errors).not.toHaveLength(3);
  });
});

describe("EventWait", () => {
  beforeAll(() => {
    reactor.on('test-success', (n:number) => {
      reactor.dispatch('test-success-success', n + 10);
    });
  
    reactor.on('test-error', (n:number) => {
      reactor.dispatch('test-error-error', n - 10);
    });
  })

  it("should be successfull", async () => {
    const result = await EventWait("test-success", () => {
      reactor.dispatch('test-success', 100);
    });

    expect(result).toBe(110);
  });

  it("should be unsuccessfull", async () => {
    try {
      await EventWait("test-error", () => {
        reactor.dispatch('test-error', 100);
      });
    }
    catch (e) {
      expect(e).toBe(90);
    }
  });
});