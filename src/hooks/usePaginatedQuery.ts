// ./src/hooks/usePaginatedQuery.ts

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DefaultPagination,
  DefaultSortInput,
  DefaultMeta,
  QueryResult,
  BaseServiceOptions,
  Maybe,
} from "../types";
import { logger } from "../utils/logger";
import { useDebounce } from "./useDebounce";

export interface PaginatedQueryOptions<
  F,
  D,
  P = DefaultPagination,
  S = DefaultSortInput,
  M = DefaultMeta
> {
  service: {
    getData: (
      options: BaseServiceOptions<F, P, S>
    ) => Promise<Maybe<QueryResult<D, M>> | undefined>;
  };
  state?: {
    setState?: (state: Maybe<QueryResult<D, M>> | undefined) => void;
    getState?: () => QueryResult<D, M> | null;
  };
  initialFilters?: F;
  initialSort?: BaseServiceOptions<F, P, S>["sort"];
  initialPagination?: BaseServiceOptions<F, P, S>["pagination"];
  debounceTime?: number;
  enabled?: boolean;
}

export const usePaginatedQuery = <
  F,
  D,
  P = DefaultPagination,
  S = DefaultSortInput,
  M = DefaultMeta
>({
  service,
  initialFilters,
  initialPagination = { page: 1, limit: 10 } as P,
  initialSort,
  debounceTime = 500,
  state,
  enabled = true,
}: PaginatedQueryOptions<F, D, P, S, M>) => {
  const [data, setData] = useState<Maybe<QueryResult<D, M>> | undefined>(
    state?.getState?.() || {
      data: [],
      meta: {
        page: 1,
        limit: 10,
        pages: 1,
        total: 0,
        hasNextPage: false,
        hasPrevPage: false,
      } as M,
    }
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [filters, setFilters] = useState<F>(initialFilters as F);
  const [pagination, setPagination] = useState(initialPagination);
  const [sort, setSort] = useState(initialSort);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  // Track if a request is in progress
  const requestInProgress = useRef(false);
  // Stable reference to service
  const serviceRef = useRef(service);
  // Stable reference to state callbacks
  const stateRef = useRef(state);

  const debouncedFilters = useDebounce(filters, debounceTime);

  // Update refs without causing re-renders
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Create stable fetchData function
  const fetchData = useCallback(
    async (
      currentPagination: typeof pagination,
      currentSort: typeof sort,
      currentFilters: F
    ) => {
      // Prevent concurrent requests, don't fetch if unmounted, or if disabled
      if (requestInProgress.current || !isMounted.current || !enabled) return;

      requestInProgress.current = true;
      setIsLoading(true);
      setError(null);

      try {
        logger.debug("Calling service with params:", {
          pagination: currentPagination,
          sort: currentSort,
          filters: currentFilters,
        });

        const result = await serviceRef.current.getData({
          pagination: currentPagination,
          sort: currentSort,
          filters: currentFilters,
        });

        if (isMounted.current) {
          setData(result);
          stateRef.current?.setState?.(result);
          logger.debug("Data fetched successfully:", result);
        }
      } catch (error) {
        logger.error("Error fetching paginated data:", error);
        if (isMounted.current) {
          // Directly set the error for more reliable state updates
          const errorMessage =
            typeof error === "string"
              ? error
              : typeof (error as { message: string })?.message === "string"
              ? (error as { message: string })?.message
              : "Unknown error";

          setError(new Error(errorMessage));
        }
      } finally {
        requestInProgress.current = false;
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [enabled]
  );

  // Handle cleanup and initial data fetch
  useEffect(() => {
    isMounted.current = true;
    requestInProgress.current = false;

    // Only fetch data immediately on mount if enabled
    if (enabled) {
      fetchData(pagination, sort, debouncedFilters);
    } else {
      // If disabled, ensure loading state is false
      setIsLoading(false);
    }

    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Reset pagination when filters change (but prevent infinite loop)
  const prevFiltersRef = useRef(debouncedFilters);
  useEffect(() => {
    // Don't do anything if disabled
    if (!enabled) return;

    const filtersChanged = prevFiltersRef.current !== debouncedFilters;
    prevFiltersRef.current = debouncedFilters;

    // Type-safe way to check if pagination has a page property
    const currentPage =
      pagination && typeof pagination === "object" && "page" in pagination
        ? pagination.page
        : 1;

    if (filtersChanged && currentPage !== 1) {
      logger.debug("Filters changed, resetting pagination to page 1");
      setPagination((prev) => ({ ...prev, page: 1 } as P));
      return; // Don't fetch data here, let the pagination change trigger it
    }

    // Only fetch if filters changed and we're already on page 1, or if this is initial load
    if (filtersChanged || (!prevFiltersRef.current && debouncedFilters)) {
      logger.debug("Fetching data due to filter change");
      fetchData(pagination, sort, debouncedFilters);
    }
  }, [debouncedFilters, pagination, sort, fetchData, enabled]);

  // Fetch data when pagination or sort changes (but not filters, handled above)
  const prevPaginationRef = useRef(pagination);
  const prevSortRef = useRef(sort);

  useEffect(() => {
    // Don't do anything if disabled
    if (!enabled) return;

    const paginationChanged = prevPaginationRef.current !== pagination;
    const sortChanged = prevSortRef.current !== sort;

    prevPaginationRef.current = pagination;
    prevSortRef.current = sort;

    if (paginationChanged || sortChanged) {
      logger.debug("Fetching data due to pagination/sort change");
      fetchData(pagination, sort, debouncedFilters);
    }
  }, [pagination, sort, debouncedFilters, fetchData, enabled]);

  // Effect to handle when enabled changes from false to true
  useEffect(() => {
    if (enabled) {
      // When enabled becomes true, fetch data with current parameters
      logger.debug("Query enabled, fetching data");
      fetchData(pagination, sort, debouncedFilters);
    } else {
      // When disabled, clear loading state and potentially clear error
      setIsLoading(false);
      // Optionally clear error when disabled:
      // setError(null);
    }
  }, [enabled, fetchData, pagination, sort, debouncedFilters]);

  // Manual refresh function - should work regardless of enabled state
  // This allows manual triggering even when auto-fetching is disabled
  const refresh = useCallback(() => {
    logger.debug("Manual refresh triggered");
    fetchData(pagination, sort, debouncedFilters);
  }, [fetchData, pagination, sort, debouncedFilters]);

  return {
    data,
    error,
    isLoading,
    setFilters: useCallback((value: React.SetStateAction<F>) => {
      setFilters(value);
    }, []),
    setPagination: useCallback((value: React.SetStateAction<P>) => {
      setPagination(value);
    }, []),
    setSort: useCallback((value: React.SetStateAction<S | undefined>) => {
      setSort(value);
    }, []),
    refresh,
  };
};
