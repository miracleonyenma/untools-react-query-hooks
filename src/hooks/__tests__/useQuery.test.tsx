// ./src/hooks/__tests__/useQuery.test.tsx

import { renderHook, waitFor, act } from "@testing-library/react";
import { useQuery } from "../useQuery";

describe("useQuery", () => {
  // Test for successful data fetching
  test("fetches data successfully", async () => {
    const mockData = { id: 1, name: "Test Data" };
    const mockService = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useQuery({
        service: mockService,
        immediate: true,
      })
    );

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have loaded data
    expect(mockService).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  // Test for handling errors
  test("handles errors properly", async () => {
    const mockError = new Error("Test error");
    const mockService = jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useQuery({
        service: mockService,
        immediate: true,
      })
    );

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have error, no data
    expect(mockService).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain("Test error");
  });

  // Test for delayed loading (immediate: false)
  test("does not fetch immediately when immediate is false", async () => {
    const mockData = { id: 1, name: "Test Data" };
    // Use a delayed promise to ensure we can check state changes
    const mockService = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockData), 100);
      });
    });

    const { result } = renderHook(() =>
      useQuery({
        service: mockService,
        immediate: false,
      })
    );

    // Should not be loading initially
    expect(result.current.isLoading).toBe(false);
    expect(mockService).not.toHaveBeenCalled();

    // Manually trigger refresh
    act(() => {
      result.current.refresh();
    });

    // Should start loading immediately after calling refresh
    expect(result.current.isLoading).toBe(true);

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have loaded data
    expect(mockService).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockData);
  });

  // Test for state management
  test("uses and updates external state", async () => {
    // Create a resolved promise for synchronous testing
    const mockData = { id: 1, name: "Test Data" };
    const mockPromise = Promise.resolve(mockData);
    const mockService = jest.fn().mockReturnValue(mockPromise);
    const mockSetState = jest.fn();
    const mockGetState = jest
      .fn()
      .mockReturnValue({ id: 2, name: "Initial State" });

    // Render the hook - the service will be called immediately
    renderHook(() =>
      useQuery({
        service: mockService,
        state: {
          setState: mockSetState,
          getState: mockGetState,
        },
        immediate: true,
      })
    );

    // Initial state should come from getState
    expect(mockGetState).toHaveBeenCalled();

    // Service should have been called once
    expect(mockService).toHaveBeenCalledTimes(1);

    // Let the promise resolve
    await mockPromise;

    // Wait for all promises to resolve
    await new Promise(process.nextTick);

    // Verify state was updated
    expect(mockSetState).toHaveBeenCalledWith(mockData);
  });
});
