import { PrintFunction } from "types";

export function print(name: string, printtype: 'error'|'log' = 'log'): PrintFunction {
  return (type: string, ...args: any[]) => {
    const label = `[${name.toUpperCase()} ${type}-${printtype}]`;
    if (printtype === 'log') 
      console.log(label, ...args);
    else 
      console.error(label, ...args);
  }
}

export async function trycatch(type: string, func:Function, printerror: PrintFunction): Promise<null|any> {
  try {
    await func();
    return null;
  }
  catch (e) {
    printerror(type, e);
    return e;
  }
}

export function tryuntil(type: string, func:(attempt: number) => void, tries: number, printerror: PrintFunction, duration = 100) :Promise<any[]> {
  return new Promise((resolve) => {
    let attempts = 0;
    const errors = [] as any[];
    const interval = setInterval(async () => {
      const error = await trycatch(type, func.bind(null, attempts), printerror);
      if (error) errors.push(error);
      attempts++;
      
      if (!error || attempts >= tries) {
        clearInterval(interval);
        resolve(errors);
      }
    }, duration);
  })
}

export async function wait (x:number = 100): Promise<void> {
  return await new Promise((r) => setTimeout(r, x));
}