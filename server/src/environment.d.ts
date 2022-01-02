declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SPAM_DURATION: string;
      SPAM_RESET: string;
      MAX_STRIKES: string;
      PORT: string;
      ID_MAX: string;
      HEARTBEAT_INTERVAL: string;
    }
  }
}

export {};