import { reactor } from 'utils/reactor';
import { DoAndWait } from 'utils/functions';

describe('util function test', () => {
  it('DoAndWait', async () => {
    try {
      const value = await DoAndWait<number>(
        "test",
        () => setTimeout(() => reactor.disptatch("test"), 1000),
        (message, resolve) => {
          resolve(5);
        }
      );
      expect(value).toBe(5);
    }
    catch (e) {
      expect(e).toBe(2);
    }
  });

  it('DoAndWait multiple', async () => {
    try {
      let total = 0;

      await DoAndWait<void>(
        "test",
        () => setTimeout(() => reactor.disptatch("test"), 100),
        (message, resolve) => {
          total++;
          resolve();
        }
      );
      await DoAndWait<void>(
        "test",
        () => setTimeout(() => reactor.disptatch("test"), 100),
        (message, resolve) => {
          total++;
          resolve();
        }
      );
      await DoAndWait<void>(
        "test",
        () => setTimeout(() => reactor.disptatch("test"), 100),
        (message, resolve) => {
          total++;
          resolve();
        }
      );

      expect(total).toBe(3);
    }
    catch (e) {
      expect(e).toBe(2);
    }
  });
});