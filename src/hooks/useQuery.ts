// ./src/hooks/useQuery.ts

import { useCallback, useEffect, useRef, useState } from "react";
import { Maybe } from "../types";
import { logger } from "../utils/logger";

export interface QueryOptions<T> {
  service: () => Promise<Maybe<T> | undefined>;
  state?: {
    setState?: (state: Maybe<T> | undefined) => void;
    getState?: () => Maybe<T> | undefined;
  };
  immediate?: boolean;
}

export const useQuery = <T>({
  service,
  state,
  immediate = true,
}: QueryOptions<T>) => {
  const [data, setData] = useState<Maybe<T> | undefined>(
    state?.getState?.() || null
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(immediate);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await service();
      if (isMounted.current) {
        setData(result);
        state?.setState?.(result);
      }
    } catch (err) {
      logger.error("Error in useQuery:", err);
      if (isMounted.current) {
        setError(
          new Error(
            typeof err === "string"
              ? err
              : typeof (err as { message: string })?.message === "string"
              ? (err as { message: string })?.message
              : "Unknown error"
          )
        );
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [service, state]);

  useEffect(() => {
    isMounted.current = true;
    if (immediate) {
      fetchData();
    }
    return () => {
      isMounted.current = false;
    };
  }, [fetchData, immediate]);

  return {
    data,
    error,
    isLoading,
    refresh: fetchData,
  };
};
