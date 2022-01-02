declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SPAM_DURATION: string;
      SPAM_RESET: string;
      MAX_STRIKES: string;
    }
  }
}

export {};