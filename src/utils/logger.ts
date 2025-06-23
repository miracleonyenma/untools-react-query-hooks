// Simple logger utility for the package
// You can replace this with your preferred logging solution
// Define types for log messages
type LogMessage = string | Error | Record<string, unknown>;

interface Logger {
  debug: (message: LogMessage, ...args: unknown[]) => void;
  error: (message: LogMessage, ...args: unknown[]) => void;
  info: (message: LogMessage, ...args: unknown[]) => void;
  warn: (message: LogMessage, ...args: unknown[]) => void;
}

const createLogger = (): Logger => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    debug: (message: LogMessage, ...args: unknown[]) => {
      if (isDevelopment) {
        console.debug("[react-query-hooks]", message, ...args);
      }
    },
    error: (message: LogMessage, ...args: unknown[]) => {
      console.error("[react-query-hooks]", message, ...args);
    },
    info: (message: LogMessage, ...args: unknown[]) => {
      console.info("[react-query-hooks]", message, ...args);
    },
    warn: (message: LogMessage, ...args: unknown[]) => {
      console.warn("[react-query-hooks]", message, ...args);
    },
  };
};

export const logger = createLogger();
