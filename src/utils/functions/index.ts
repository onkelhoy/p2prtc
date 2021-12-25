import { reactor } from 'utils/reactor';

const DELAY = 12 * 1000;

type DoWaitResponse<T> = (data: object, resolve: TResolve<T>, reject: TReject) => void;
type TResolve<T> = (value: T | PromiseLike<T>) => void;
type TReject = (reason?: any) => void;

export async function DoAndWait<T> (eventName: string, executor: Function, responser: DoWaitResponse<T>) {
  return new Promise<T>((resolve, reject) => {
    if (!reactor.has(eventName)) reactor.register(eventName);
    
    const timer = window.setTimeout(() => {
      reactor.removeEventListener(eventName, waiter);
      reject({ error: "timeout" });
    }, DELAY);

    const waiter = (data: object) => {
      window.clearTimeout(timer);
      reactor.removeEventListener(eventName, waiter);
      responser(data, resolve, reject);
    }

    reactor.addEventListener(eventName, waiter);
    executor();
  });
}