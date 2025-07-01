// ./src/hooks/__tests__/useInfiniteQuery.test.tsx

import { renderHook, waitFor, act } from "@testing-library/react";
import { useInfiniteQuery } from "../useInfiniteQuery";
import { QueryResult } from "../../types";

// Mock types for testing
interface TestFilters {
  search?: string;
  status?: string;
}

interface TestData {
  id: number;
  name: string;
}

describe("useInfiniteQuery", () => {
  // Mock data for tests
  const mockMetaDataPage1 = {
    page: 1,
    limit: 10,
    pages: 3,
    total: 25,
    hasNextPage: true,
    hasPrevPage: false,
  };

  const mockMetaDataPage2 = {
    page: 2,
    limit: 10,
    pages: 3,
    total: 25,
    hasNextPage: true,
    hasPrevPage: true,
  };

  const mockMetaDataPage3 = {
    page: 3,
    limit: 10,
    pages: 3,
    total: 25,
    hasNextPage: false,
    hasPrevPage: true,
  };

  const mockPage1Items = [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    { id: 3, name: "Item 3" },
  ];

  const mockPage2Items = [
    { id: 4, name: "Item 4" },
    { id: 5, name: "Item 5" },
    { id: 6, name: "Item 6" },
  ];

  const mockPage3Items = [
    { id: 7, name: "Item 7" },
    { id: 8, name: "Item 8" },
  ];

  const mockResponsePage1: QueryResult<TestData> = {
    data: mockPage1Items,
    meta: mockMetaDataPage1,
  };

  const mockResponsePage2: QueryResult<TestData> = {
    data: mockPage2Items,
    meta: mockMetaDataPage2,
  };

  const mockResponsePage3: QueryResult<TestData> = {
    data: mockPage3Items,
    meta: mockMetaDataPage3,
  };

  // Test initial data loading
  test("loads initial data correctly", async () => {
    const mockGetData = jest.fn().mockResolvedValue(mockResponsePage1);

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        pageSize: 10,
      })
    );

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data.allData).toEqual([]);

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have loaded data with correct parameters
    expect(mockGetData).toHaveBeenCalledWith({
      pagination: { page: 1, limit: 10 },
      filters: undefined,
      sort: undefined,
    });

    expect(result.current.data.data).toEqual(mockPage1Items);
    expect(result.current.data.allData).toEqual(mockPage1Items);
    expect(result.current.data.meta).toEqual(mockMetaDataPage1);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.error).toBeNull();
  });

  // Test loading more data
  test("loads more data correctly", async () => {
    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponsePage1)
      .mockResolvedValueOnce(mockResponsePage2);

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        pageSize: 10,
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Load more data
    act(() => {
      result.current.loadMore();
    });

    // Should be loading more
    expect(result.current.isLoadingMore).toBe(true);

    // Wait for the second query to complete
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    // Should have called with page 2
    expect(mockGetData).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: { page: 2, limit: 10 },
      })
    );

    // Should have accumulated data
    expect(result.current.data.data).toEqual(mockPage2Items); // Current page data
    expect(result.current.data.allData).toEqual([
      ...mockPage1Items,
      ...mockPage2Items,
    ]); // All accumulated data
    expect(result.current.data.meta).toEqual(mockMetaDataPage2);
    expect(result.current.hasNextPage).toBe(true);
  });

  // Test loading multiple pages
  test("loads multiple pages correctly", async () => {
    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponsePage1)
      .mockResolvedValueOnce(mockResponsePage2)
      .mockResolvedValueOnce(mockResponsePage3);

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        pageSize: 10,
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Load page 2
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    // Load page 3
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    // Should have all data accumulated
    expect(result.current.data.allData).toEqual([
      ...mockPage1Items,
      ...mockPage2Items,
      ...mockPage3Items,
    ]);
    expect(result.current.hasNextPage).toBe(false);
    expect(mockGetData).toHaveBeenCalledTimes(3);
  });

  // Test that loadMore doesn't trigger when no next page
  test("doesn't load more when hasNextPage is false", async () => {
    const mockGetData = jest.fn().mockResolvedValue({
      ...mockResponsePage1,
      meta: { ...mockMetaDataPage1, hasNextPage: false },
    });

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        pageSize: 10,
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockGetData.mockClear();

    // Try to load more
    act(() => {
      result.current.loadMore();
    });

    // Should not have called service again
    expect(mockGetData).not.toHaveBeenCalled();
    expect(result.current.isLoadingMore).toBe(false);
  });

  // Test filter updates reset the query
  test("handles filter updates and resets data", async () => {
    jest.useFakeTimers();

    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponsePage1)
      .mockResolvedValueOnce({
        ...mockResponsePage1,
        data: [{ id: 10, name: "Filtered Item" }],
      });

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        initialFilters: { search: "" },
        debounceTime: 500,
        pageSize: 10,
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockGetData.mockClear();

    // Update filters
    act(() => {
      result.current.setFilters({ search: "test query" });
    });

    // Fast forward past debounce time
    act(() => {
      jest.advanceTimersByTime(600);
    });

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have called service with new filters and reset to page 1
    expect(mockGetData).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { search: "test query" },
        pagination: { page: 1, limit: 10 },
      })
    );

    // Should have new data (not accumulated)
    expect(result.current.data.data).toEqual([
      { id: 10, name: "Filtered Item" },
    ]);
    expect(result.current.data.allData).toEqual([
      { id: 10, name: "Filtered Item" },
    ]);

    jest.useRealTimers();
  });

  // Test sort updates reset the query
  test("handles sort changes and resets data", async () => {
    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponsePage1)
      .mockResolvedValueOnce({
        ...mockResponsePage1,
        data: [{ id: 20, name: "Sorted Item" }],
      });

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        pageSize: 10,
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockGetData.mockClear();

    // Update sort
    act(() => {
      result.current.setSort({ field: "name", direction: "desc" });
    });

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have called service with new sort and reset to page 1
    expect(mockGetData).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: { field: "name", direction: "desc" },
        pagination: { page: 1, limit: 10 },
      })
    );

    // Should have new data (not accumulated)
    expect(result.current.data.allData).toEqual([
      { id: 20, name: "Sorted Item" },
    ]);
  });

  // Test error handling
  test("handles error states correctly", async () => {
    const mockError = new Error("API error");
    const mockGetData = jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        pageSize: 10,
      })
    );

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have error state
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain("API error");
    expect(result.current.data.allData).toEqual([]);
  });

  // Test error handling during loadMore
  test("handles error during loadMore correctly", async () => {
    const mockError = new Error("Load more error");
    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponsePage1)
      .mockRejectedValueOnce(mockError);

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        pageSize: 10,
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Try to load more (should fail)
    act(() => {
      result.current.loadMore();
    });

    // Wait for error
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    // Should have error but keep existing data
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain("Load more error");
    expect(result.current.data.allData).toEqual(mockPage1Items); // Should keep first page data
  });

  // Test state management
  test("uses and updates external state", async () => {
    const initialState = {
      data: [{ id: 0, name: "Initial" }],
      meta: { ...mockMetaDataPage1, total: 1 },
      allData: [{ id: 0, name: "Initial" }],
    };

    const mockPromise = Promise.resolve(mockResponsePage1);
    const mockGetData = jest.fn().mockReturnValue(mockPromise);
    const mockSetState = jest.fn();
    const mockGetState = jest.fn().mockReturnValue(initialState);

    renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        state: {
          setState: mockSetState,
          getState: mockGetState,
        },
        pageSize: 10,
      })
    );

    // Verify initial interactions
    expect(mockGetState).toHaveBeenCalled();
    expect(mockGetData).toHaveBeenCalledTimes(1);

    // Let the promise resolve
    await mockPromise;
    await new Promise(process.nextTick);

    // Wait for setState to be called
    await waitFor(() =>
      expect(mockSetState).toHaveBeenCalledWith({
        data: mockPage1Items,
        meta: mockMetaDataPage1,
        allData: mockPage1Items,
      })
    );
  });

  // Test manual refresh
  test("allows manual refresh of data", async () => {
    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponsePage1)
      .mockResolvedValueOnce(mockResponsePage2)
      .mockResolvedValueOnce(mockResponsePage1); // Refresh returns to page 1

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        pageSize: 10,
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Load more data
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    // Should have accumulated data
    expect(result.current.data.allData).toEqual([
      ...mockPage1Items,
      ...mockPage2Items,
    ]);

    // Manually refresh
    act(() => {
      result.current.refresh();
    });

    // Should be loading again
    expect(result.current.isLoading).toBe(true);

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have reset to page 1 data only
    expect(result.current.data.allData).toEqual(mockPage1Items);
    expect(mockGetData).toHaveBeenCalledTimes(3);
  });

  // Test reset functionality
  test("allows manual reset of data", async () => {
    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponsePage1)
      .mockResolvedValueOnce(mockResponsePage2)
      .mockResolvedValueOnce(mockResponsePage1); // Reset refetches

    const { result } = renderHook(() =>
      useInfiniteQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        pageSize: 10,
      })
    );

    // Wait for initial load and load more
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    // Should have accumulated data
    expect(result.current.data.allData).toEqual([
      ...mockPage1Items,
      ...mockPage2Items,
    ]);

    // Reset
    act(() => {
      result.current.reset();
    });

    // Should immediately clear data and start loading
    expect(result.current.data.allData).toEqual([]);
    expect(result.current.isLoading).toBe(true);

    // Wait for reset to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have fresh page 1 data
    expect(result.current.data.allData).toEqual(mockPage1Items);
    expect(mockGetData).toHaveBeenCalledTimes(3);
  });

  // Test enabled/disabled functionality
  test("respects enabled option", async () => {
    const mockGetData = jest.fn().mockResolvedValue(mockResponsePage1);

    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useInfiniteQuery<TestFilters, TestData>({
          service: {
            getData: mockGetData,
          },
          enabled,
          pageSize: 10,
        }),
      {
        initialProps: { enabled: false },
      }
    );

    // Should not be loading and should not have called service
    expect(result.current.isLoading).toBe(false);
    expect(mockGetData).not.toHaveBeenCalled();

    // Enable the query
    rerender({ enabled: true });

    // Should start loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have loaded data
    expect(mockGetData).toHaveBeenCalledTimes(1);
    expect(result.current.data.allData).toEqual(mockPage1Items);

    // Disable again
    mockGetData.mockClear();
    rerender({ enabled: false });

    // Should stop loading
    expect(result.current.isLoading).toBe(false);

    // Try to load more (should not work when disabled)
    act(() => {
      result.current.loadMore();
    });

    expect(mockGetData).not.toHaveBeenCalled();
  });
});
