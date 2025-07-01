// ./src/hooks/__tests__/usePaginatedQuery.test.tsx

import { renderHook, waitFor, act } from "@testing-library/react";
import { usePaginatedQuery } from "../usePaginatedQuery";
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

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data.data).toEqual([]);

    // Wait for the query to complete
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
    const mockGetData = jest.fn().mockResolvedValue({
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
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Change page
    act(() => {
      result.current.setPagination({ page: 2, limit: 10 });
    });

    // Should be loading again
    expect(result.current.isLoading).toBe(true);

    // Wait for the second query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have called with new pagination
    expect(mockGetData).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: { page: 2, limit: 10 },
      })
    );

    // Should have updated data
    expect(result?.current?.data?.meta?.page).toBe(2);
  });

  // Test filter updates
  test("handles filter updates and debouncing", async () => {
    jest.useFakeTimers();

    const mockGetData = jest.fn().mockResolvedValue(mockResponse);

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
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockGetData.mockClear();

    // Update filters
    act(() => {
      result.current.setFilters({ search: "test query" });
    });

    // Should not call service immediately due to debounce
    expect(mockGetData).not.toHaveBeenCalled();

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
    const mockGetData = jest.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockGetData.mockClear();

    // Update sort
    act(() => {
      result.current.setSort({ field: "name", direction: "asc" });
    });

    // Wait for the query to complete
    await waitFor(() =>
      expect(mockGetData).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { field: "name", direction: "asc" },
        })
      )
    );
  });

  // Test error handling
  test("handles error states correctly", async () => {
    const mockError = new Error("API error");
    const mockGetData = jest.fn().mockImplementation(() => {
      return Promise.reject(mockError);
    });

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
      })
    );

    // Wait for the query to complete
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

    // Create a synchronous promise for easier testing
    const mockPromise = Promise.resolve(mockResponse);
    const mockGetData = jest.fn().mockReturnValue(mockPromise);
    const mockSetState = jest.fn();
    const mockGetState = jest.fn().mockReturnValue(initialState);

    // Render the hook - service will be called immediately
    renderHook(() =>
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

    // Verify initial interactions
    expect(mockGetState).toHaveBeenCalled();
    expect(mockGetData).toHaveBeenCalledTimes(1);

    // Let the promise resolve
    await mockPromise;

    // Wait for all promises to resolve and state updates to complete
    await new Promise(process.nextTick);

    // Verify state was updated
    expect(mockSetState).toHaveBeenCalledWith(mockResponse);
  });

  // Test manual refresh
  test("allows manual refresh of data", async () => {
    const mockGetData = jest.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      usePaginatedQuery<TestFilters, TestData>({
        service: {
          getData: mockGetData,
        },
      })
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockGetData.mockClear();

    // Manually refresh
    act(() => {
      result.current.refresh();
    });

    // Should be loading again
    expect(result.current.isLoading).toBe(true);

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have called service again
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });
});
