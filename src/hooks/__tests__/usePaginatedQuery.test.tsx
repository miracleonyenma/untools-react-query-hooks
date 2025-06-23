import { renderHook, waitFor, act } from "@testing-library/react";
import { usePaginatedQuery } from "../usePaginatedQuery";
import { QueryResult, SortInput } from "../../types";

// Mock types for testing
interface TestFilters {
  search?: string;
  status?: string;
}

interface TestData {
  id: number;
  name: string;
}

describe("usePaginatedQuery", () => {
  // Mock data for tests
  const mockMetaData = {
    page: 1,
    limit: 10,
    pages: 2,
    total: 15,
    hasNextPage: true,
    hasPrevPage: false,
  };

  const mockItems = [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    { id: 3, name: "Item 3" },
  ];

  const mockResponse: QueryResult<TestData> = {
    data: mockItems,
    meta: mockMetaData,
  };

  // Test initial data loading
  test("loads initial data correctly", async () => {
    const mockGetData = jest.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        initialPagination: { page: 1, limit: 10 },
      })
    );

    // Initially should not be loading due to new effect structure
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data.data).toEqual([]);

    // Wait for the query to start and complete
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have loaded data with correct parameters
    expect(mockGetData).toHaveBeenCalledWith({
      pagination: { page: 1, limit: 10 },
      filters: undefined,
      sort: undefined,
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
  });

  // Test pagination changes
  test("handles pagination changes correctly", async () => {
    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({
        ...mockResponse,
        meta: { ...mockMetaData, page: 2 },
      });

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        initialPagination: { page: 1, limit: 10 },
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Change page
    act(() => {
      result.current.setPagination({ page: 2, limit: 10 });
    });

    // Should be loading again
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    // Wait for the second query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have called with new pagination
    expect(mockGetData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pagination: { page: 2, limit: 10 },
      })
    );

    // Should have updated data
    expect(result.current.data.meta?.page).toBe(2);
  });

  // Test filter updates
  test("handles filter updates and debouncing", async () => {
    jest.useFakeTimers();

    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({
        ...mockResponse,
        data: [{ id: 4, name: "Filtered Item" }],
      });

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        initialFilters: { search: "" },
        debounceTime: 500,
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const initialCallCount = mockGetData.mock.calls.length;

    // Update filters
    act(() => {
      result.current.setFilters({ search: "test query" });
    });

    // Should not call service immediately due to debounce
    expect(mockGetData).toHaveBeenCalledTimes(initialCallCount);

    // Fast forward past debounce time
    act(() => {
      jest.advanceTimersByTime(600);
    });

    // Now should call service with new filters
    await waitFor(() =>
      expect(mockGetData).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { search: "test query" },
        })
      )
    );

    // Reset page to 1 when filters change
    expect(mockGetData).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: { page: 1, limit: 10 },
      })
    );

    jest.useRealTimers();
  });

  // Test sort updates
  test("handles sort changes correctly", async () => {
    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({
        ...mockResponse,
        data: [{ id: 1, name: "Sorted Item" }],
      });

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const initialCallCount = mockGetData.mock.calls.length;

    // Update sort
    act(() => {
      result.current.setSort({ field: "name", order: "ASC" } as SortInput);
    });

    // Wait for the query to complete
    await waitFor(() =>
      expect(mockGetData).toHaveBeenCalledTimes(initialCallCount + 1)
    );

    expect(mockGetData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: { field: "name", order: "ASC" },
      })
    );
  });

  // Test error handling
  test("handles error states correctly", async () => {
    const mockError = new Error("API error");
    const mockGetData = jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
      })
    );

    // Wait for the query to start
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    // Wait for the query to complete with error
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have error state
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain("API error");
      expect(result.current.data.data).toEqual([]);
    });
  });

  // Test state management
  test("uses and updates external state", async () => {
    const initialState: QueryResult<TestData> = {
      data: [{ id: 0, name: "Initial" }],
      meta: { ...mockMetaData, total: 1 },
    };

    const mockGetData = jest.fn().mockResolvedValue(mockResponse);
    const mockSetState = jest.fn();
    const mockGetState = jest.fn().mockReturnValue(initialState);

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        state: {
          setState: mockSetState,
          getState: mockGetState,
        },
      })
    );

    // Verify initial state is used
    expect(mockGetState).toHaveBeenCalled();
    expect(result.current.data).toEqual(initialState);

    // Wait for the service to be called
    await waitFor(() => expect(mockGetData).toHaveBeenCalledTimes(1));

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify state was updated
    expect(mockSetState).toHaveBeenCalledWith(mockResponse);
  });

  // Test manual refresh
  test("allows manual refresh of data", async () => {
    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({
        ...mockResponse,
        data: [{ id: 5, name: "Refreshed Item" }],
      });

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const initialCallCount = mockGetData.mock.calls.length;

    // Manually refresh
    act(() => {
      result.current.refresh();
    });

    // Should be loading again
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have called service again
    expect(mockGetData).toHaveBeenCalledTimes(initialCallCount + 1);
  });

  // Test that filters reset pagination
  test("resets pagination when filters change", async () => {
    jest.useFakeTimers();

    const mockGetData = jest
      .fn()
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({
        ...mockResponse,
        meta: { ...mockMetaData, page: 2 },
      })
      .mockResolvedValueOnce({
        ...mockResponse,
        data: [{ id: 4, name: "Filtered Item" }],
        meta: { ...mockMetaData, page: 1 },
      });

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
        initialFilters: { search: "" },
        debounceTime: 500,
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Change to page 2
    act(() => {
      result.current.setPagination({ page: 2, limit: 10 });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify we're on page 2
    expect(result.current.data.meta?.page).toBe(2);

    // Now change filters - this should reset pagination to page 1
    act(() => {
      result.current.setFilters({ search: "test" });
    });

    // Fast forward past debounce time
    act(() => {
      jest.advanceTimersByTime(600);
    });

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have reset to page 1
    expect(mockGetData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pagination: { page: 1, limit: 10 },
        filters: { search: "test" },
      })
    );

    jest.useRealTimers();
  });

  // Test concurrent request prevention
  test("prevents concurrent requests", async () => {
    let resolveFirst: (value: QueryResult<TestData>) => void;
    let resolveSecond: (value: QueryResult<TestData>) => void;

    const firstPromise = new Promise<QueryResult<TestData>>((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise<QueryResult<TestData>>((resolve) => {
      resolveSecond = resolve;
    });

    const mockGetData = jest
      .fn()
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
      })
    );

    // Wait for first request to start
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    // Try to trigger another request while first is in progress
    act(() => {
      result.current.refresh();
    });

    // Should not have called getData again while first request is in progress
    expect(mockGetData).toHaveBeenCalledTimes(1);

    // Resolve first request
    act(() => {
      resolveFirst!(mockResponse);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Now refresh should work
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockGetData).toHaveBeenCalledTimes(2));

    // Resolve second request
    act(() => {
      resolveSecond!(mockResponse);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
