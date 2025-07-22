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
  const requestInProgress = useRef(false);

  // Stable references to prevent re-render loops
  const serviceRef = useRef(service);
  const stateRef = useRef(state);

  // Update refs without causing re-renders
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchData = useCallback(async () => {
    if (!isMounted.current || requestInProgress.current) return;

    requestInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current();
      if (isMounted.current) {
        setData(result);
        stateRef.current?.setState?.(result);
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
      requestInProgress.current = false;
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []); // No dependencies - uses refs

  useEffect(() => {
    isMounted.current = true;
    requestInProgress.current = false;

    if (immediate) {
      fetchData();
    }

    return () => {
      isMounted.current = false;
    };
  }, [immediate, fetchData]); // Only depend on immediate and stable fetchData

  return {
    data,
    error,
    isLoading,
    refresh: fetchData,
  };
};
