export function printerror(name: string) {
  return (type: string, ...args: any[]) {
    console.error(`[${name.toUpperCase()} ${type}-error]`, ...args);
  }
}

// export async function trycatch(type: string, func:Function) {
//   try {
//     await func();
//     return null;
//   }
//   catch (e) {
//     this.printerror(type, e);
//     return e;
//   }
// }

// export function tryuntil(type: string, func:Function, tries: number, duration = 100) {
//   let attempts = 0;
//   const interval = setInterval(async () => {
//     attempts++;
//     const failed = await this.trycatch(type, func);
//     if (!failed || attempts > tries) {
//       clearInterval(interval);
//     }
//   }, duration);
// }