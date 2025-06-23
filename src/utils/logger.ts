// Simple logger utility for the package
// You can replace this with your preferred logging solution

interface Logger {
  debug: (message: any, ...args: any[]) => void;
  error: (message: any, ...args: any[]) => void;
  info: (message: any, ...args: any[]) => void;
  warn: (message: any, ...args: any[]) => void;
}

const createLogger = (): Logger => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    debug: (message: any, ...args: any[]) => {
      if (isDevelopment) {
        console.debug("[react-query-hooks]", message, ...args);
      }
    },
    error: (message: any, ...args: any[]) => {
      console.error("[react-query-hooks]", message, ...args);
    },
    info: (message: any, ...args: any[]) => {
      console.info("[react-query-hooks]", message, ...args);
    },
    warn: (message: any, ...args: any[]) => {
      console.warn("[react-query-hooks]", message, ...args);
    },
  };
};

export const logger = createLogger();
