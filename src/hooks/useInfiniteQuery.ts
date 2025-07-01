// ./src/hooks/useInfiniteQuery.ts

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SortInput,
  QueryResult,
  BaseServiceOptions,
  Meta,
  Maybe,
} from "../types";
import { logger } from "../utils/logger";
import { useDebounce } from "./useDebounce";

export interface InfiniteQueryOptions<F, D> {
  service: {
    getData: (options: BaseServiceOptions<F>) => Promise<QueryResult<D>>;
  };
  state?: {
    setState?: (state: InfiniteQueryResult<D>) => void;
    getState?: () => InfiniteQueryResult<D> | null;
  };
  initialFilters?: F;
  initialSort?: BaseServiceOptions<F>["sort"];
  pageSize?: number;
  debounceTime?: number;
  enabled?: boolean;
}

export interface InfiniteQueryResult<D> {
  data?: Maybe<D>[];
  meta?: Maybe<Meta>;
  allData?: Maybe<Maybe<D>[]>; // Flattened array of all loaded data
}

export const useInfiniteQuery = <F, D>({
  service,
  initialFilters,
  initialSort,
  pageSize = 10,
  debounceTime = 500,
  state,
  enabled = true,
}: InfiniteQueryOptions<F, D>) => {
  const [data, setData] = useState<InfiniteQueryResult<D>>(
    state?.getState?.() || {
      data: [],
      meta: {
        page: 1,
        limit: pageSize,
        pages: 1,
        total: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
      allData: [],
    }
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filters, setFilters] = useState<F>(initialFilters as F);
  const [sort, setSort] = useState(initialSort);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  // Track if a request is in progress
  const requestInProgress = useRef(false);
  // Stable reference to service
  const serviceRef = useRef(service);
  // Stable reference to state callbacks
  const stateRef = useRef(state);
  // Track current page for infinite loading
  const currentPageRef = useRef(1);

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
      page: number,
      currentSort: typeof sort,
      currentFilters: F,
      append: boolean = false
    ) => {
      // Prevent concurrent requests, don't fetch if unmounted, or if disabled
      if (requestInProgress.current || !isMounted.current || !enabled) return;

      requestInProgress.current = true;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        logger.debug("Calling service with params:", {
          pagination: { page, limit: pageSize },
          sort: currentSort,
          filters: currentFilters,
        });

        const result = await serviceRef.current.getData({
          pagination: { page, limit: pageSize },
          sort: currentSort,
          filters: currentFilters,
        });

        if (isMounted.current) {
          setData((prevData) => {
            const newData = append
              ? [...(prevData?.allData || []), ...(result?.data || [])]
              : result.data;

            const infiniteResult: InfiniteQueryResult<D> = {
              data: result.data || [], // Current page data
              meta: result.meta,
              allData: newData, // All accumulated data
            };

            stateRef.current?.setState?.(infiniteResult);
            logger.debug("Data fetched successfully:", infiniteResult);

            return infiniteResult;
          });

          currentPageRef.current = page;
        }
      } catch (error) {
        logger.error("Error fetching infinite data:", error);
        if (isMounted.current) {
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
          setIsLoadingMore(false);
        }
      }
    },
    [enabled, pageSize]
  );

  // Handle cleanup and initial data fetch
  useEffect(() => {
    isMounted.current = true;
    requestInProgress.current = false;
    currentPageRef.current = 1;

    // Only fetch data immediately on mount if enabled
    if (enabled) {
      fetchData(1, sort, debouncedFilters, false);
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Reset and refetch when filters or sort change
  const prevFiltersRef = useRef(debouncedFilters);
  const prevSortRef = useRef(sort);

  useEffect(() => {
    if (!enabled) return;

    const filtersChanged = prevFiltersRef.current !== debouncedFilters;
    const sortChanged = prevSortRef.current !== sort;

    prevFiltersRef.current = debouncedFilters;
    prevSortRef.current = sort;

    if (filtersChanged || sortChanged) {
      logger.debug("Filters or sort changed, resetting infinite query");
      currentPageRef.current = 1;
      fetchData(1, sort, debouncedFilters, false);
    }
  }, [debouncedFilters, sort, fetchData, enabled]);

  // Effect to handle when enabled changes from false to true
  useEffect(() => {
    if (enabled) {
      logger.debug("Infinite query enabled, fetching data");
      currentPageRef.current = 1;
      fetchData(1, sort, debouncedFilters, false);
    } else {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [enabled, fetchData, sort, debouncedFilters]);

  // Load more function
  const loadMore = useCallback(() => {
    if (!data?.meta?.hasNextPage || requestInProgress.current) return;

    const nextPage = currentPageRef.current + 1;
    logger.debug("Loading more data, page:", nextPage);
    fetchData(nextPage, sort, debouncedFilters, true);
  }, [fetchData, sort, debouncedFilters, data?.meta?.hasNextPage]);

  // Manual refresh function - resets to first page
  const refresh = useCallback(() => {
    logger.debug("Manual refresh triggered");
    currentPageRef.current = 1;
    fetchData(1, sort, debouncedFilters, false);
  }, [fetchData, sort, debouncedFilters]);

  // Reset function - clears all data and starts fresh
  const reset = useCallback(() => {
    logger.debug("Reset triggered");
    currentPageRef.current = 1;
    setData({
      data: [],
      meta: {
        page: 1,
        limit: pageSize,
        pages: 1,
        total: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
      allData: [],
    });
    setError(null);
    if (enabled) {
      fetchData(1, sort, debouncedFilters, false);
    }
  }, [fetchData, sort, debouncedFilters, enabled, pageSize]);

  return {
    data,
    error,
    isLoading,
    isLoadingMore,
    hasNextPage: data?.meta?.hasNextPage,
    loadMore,
    setFilters: useCallback((value: React.SetStateAction<F>) => {
      setFilters(value);
    }, []),
    setSort: useCallback(
      (value: React.SetStateAction<SortInput | undefined>) => {
        setSort(value);
      },
      []
    ),
    refresh,
    reset,
  };
};
