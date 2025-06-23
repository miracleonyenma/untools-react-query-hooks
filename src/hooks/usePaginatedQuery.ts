// ./src/hooks/usePaginatedQuery.ts

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pagination,
  // Meta, // Unused import
  SortInput,
  // Maybe, // Unused import
  QueryResult,
  BaseServiceOptions,
} from "../types";
import { logger } from "../utils/logger";
import { useDebounce } from "./useDebounce";

export interface PaginatedQueryOptions<F, D> {
  service: {
    getData: (options: BaseServiceOptions<F>) => Promise<QueryResult<D>>;
  };
  state?: {
    setState?: (state: QueryResult<D>) => void;
    getState?: () => QueryResult<D> | null;
  };
  initialFilters?: F;
  initialSort?: BaseServiceOptions<F>["sort"];
  initialPagination?: BaseServiceOptions<F>["pagination"];
  debounceTime?: number;
}

export const usePaginatedQuery = <F, D>({
  service,
  initialFilters,
  initialPagination = { page: 1, limit: 10 },
  initialSort,
  debounceTime = 500,
  state,
}: PaginatedQueryOptions<F, D>) => {
  const [data, setData] = useState<QueryResult<D>>(
    state?.getState?.() || {
      data: [],
      meta: {
        page: 1,
        limit: 10,
        pages: 1,
        total: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  );
  const [error, setError] = useState<Error | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<F>(initialFilters as F);
  const [pagination, setPagination] = useState(initialPagination);
  const [sort, setSort] = useState(initialSort);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  // Track if a request is in progress
  const requestInProgress = useRef(false);

  const debouncedFilters = useDebounce(filters, debounceTime);

  // Stable reference to service
  const serviceRef = useRef(service);
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  const fetchData = useCallback(async () => {
    // Prevent concurrent requests and don't fetch if unmounted
    if (requestInProgress.current || !isMounted.current) return;

    requestInProgress.current = true;
    setIsLoading(true);
    setError(null);

    logger.debug("Calling service");

    let result: QueryResult<D>;

    try {
      logger.debug("Calling service");
      result = await serviceRef.current.getData({
        pagination,
        sort,
        filters: debouncedFilters,
      });

      if (isMounted.current) {
        setData(result);
        state?.setState?.(result);
      }
    } catch (error) {
      logger.error("Error fetching paginated data:", error);
      if (isMounted.current) {
        setError(() => {
          // construct a new error object with a message
          return new Error(
            `${
              typeof error === "string"
                ? error
                : typeof (error as { message: string })?.message === "string"
                ? (error as { message: string })?.message
                : "Unknown error"
            }`
          );
        });
      }
    } finally {
      requestInProgress.current = false;
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [pagination, sort, debouncedFilters, state]);

  // Handle cleanup
  useEffect(() => {
    // Reset both flags on mount
    isMounted.current = true;
    requestInProgress.current = false;

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination when filters change
  useEffect(() => {
    // When filters change, reset to page 1
    if (pagination.page !== 1) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [debouncedFilters, pagination.page]);

  useEffect(() => {
    logger.debug({
      requestInProgress: requestInProgress.current,
      isMounted: isMounted.current,
      data,
    });
  }, [data]);

  useEffect(() => {
    logger.debug({
      data,
      isLoading,
    });
  }, [data, isLoading]);

  return {
    data,
    error,
    isLoading,
    setFilters: useCallback((value: React.SetStateAction<F>) => {
      setFilters(value);
    }, []),
    setPagination: useCallback((value: React.SetStateAction<Pagination>) => {
      setPagination(value);
    }, []),
    setSort: useCallback(
      (value: React.SetStateAction<SortInput | undefined>) => {
        setSort(value);
      },
      []
    ),
    refresh: fetchData,
  };
};
