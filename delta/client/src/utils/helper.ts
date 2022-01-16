import { PrintErrorFunction } from "types";

export function printerror(name: string): PrintErrorFunction {
  return (type: string, ...args: any[]) => {
    console.error(`[${name.toUpperCase()} ${type}-error]`, ...args);
  }
}

export async function trycatch(type: string, func:Function, printerror: PrintErrorFunction) {
  try {
    await func();
    return null;
  }
  catch (e) {
    printerror(type, e);
    return e;
  }
}

export function tryuntil(type: string, func:Function, tries: number, printerror: PrintErrorFunction, duration = 100) {
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    const failed = await trycatch(type, func, printerror);
    if (!failed || attempts > tries) {
      clearInterval(interval);
    }
  }, duration);
}

export async function wait (x:number = 100): Promise<void> {
  return await new Promise((r) => setTimeout(r, x));
}