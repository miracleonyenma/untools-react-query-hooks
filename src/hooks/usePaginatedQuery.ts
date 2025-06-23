// ./src/hooks/usePaginatedQuery.ts

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pagination,
  SortInput,
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
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
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
      // Prevent concurrent requests and don't fetch if unmounted
      if (requestInProgress.current || !isMounted.current) return;

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
          const errorMessage = typeof error === "string"
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
    []
  ); // No dependencies to prevent recreation

  // Handle cleanup and initial data fetch
  useEffect(() => {
    isMounted.current = true;
    requestInProgress.current = false;
    
    // Fetch data immediately on mount
    fetchData(pagination, sort, debouncedFilters);

    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* Intentionally empty to run only on mount, using refs for updated values */]);

  // Reset pagination when filters change (but prevent infinite loop)
  const prevFiltersRef = useRef(debouncedFilters);
  useEffect(() => {
    const filtersChanged = prevFiltersRef.current !== debouncedFilters;
    prevFiltersRef.current = debouncedFilters;

    if (filtersChanged && pagination.page !== 1) {
      logger.debug("Filters changed, resetting pagination to page 1");
      setPagination((prev) => ({ ...prev, page: 1 }));
      return; // Don't fetch data here, let the pagination change trigger it
    }

    // Only fetch if filters changed and we're already on page 1, or if this is initial load
    if (filtersChanged || (!prevFiltersRef.current && debouncedFilters)) {
      logger.debug("Fetching data due to filter change");
      fetchData(pagination, sort, debouncedFilters);
    }
  }, [debouncedFilters, pagination, sort, fetchData]);

  // Fetch data when pagination or sort changes (but not filters, handled above)
  const prevPaginationRef = useRef(pagination);
  const prevSortRef = useRef(sort);

  useEffect(() => {
    const paginationChanged = prevPaginationRef.current !== pagination;
    const sortChanged = prevSortRef.current !== sort;

    prevPaginationRef.current = pagination;
    prevSortRef.current = sort;

    if (paginationChanged || sortChanged) {
      logger.debug("Fetching data due to pagination/sort change");
      fetchData(pagination, sort, debouncedFilters);
    }
  }, [pagination, sort, debouncedFilters, fetchData]);

  // Manual refresh function
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
    setPagination: useCallback((value: React.SetStateAction<Pagination>) => {
      setPagination(value);
    }, []),
    setSort: useCallback(
      (value: React.SetStateAction<SortInput | undefined>) => {
        setSort(value);
      },
      []
    ),
    refresh,
  };
};
