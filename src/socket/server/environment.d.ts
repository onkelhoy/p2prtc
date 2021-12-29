declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      SALT: string;
      MONGOURI: string;
    }
  }
}

export {};