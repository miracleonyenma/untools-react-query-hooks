# @untools/react-query-hooks

![npm version](https://img.shields.io/npm/v/@untools/react-query-hooks)
![license](https://img.shields.io/npm/l/@untools/react-query-hooks)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)

A lightweight, TypeScript-first library of React hooks for data fetching, pagination, and query management. Built for modern React applications that need flexible data fetching solutions.

## Features

- 🔄 **Simple data fetching** with `useQuery`
- 📄 **Pagination support** with `usePaginatedQuery`
- ⏱️ **Debouncing** for search and filter inputs
- 🔍 **Sorting and filtering** capabilities
- 🧩 **TypeScript support** with full type safety
- 🎯 **Customizable types** for pagination, sorting, and metadata
- 🪶 **Lightweight** with zero dependencies
- 🧪 **Well tested** and reliable

## Installation

```bash
# npm
npm install @untools/react-query-hooks

# yarn
yarn add @untools/react-query-hooks

# pnpm
pnpm add @untools/react-query-hooks
```

## Usage

### Basic Query

The `useQuery` hook provides a simple way to fetch data:

```tsx
import { useQuery } from '@untools/react-query-hooks';

function UserProfile({ userId }) {
  const { data, isLoading, error, refresh } = useQuery({
    service: () => fetch(`/api/users/${userId}`).then(res => res.json()),
    immediate: true
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### Paginated Query

The `usePaginatedQuery` hook handles pagination, sorting, and filtering:

```tsx
import { usePaginatedQuery } from '@untools/react-query-hooks';

function UserList() {
  const {
    data,
    isLoading,
    error,
    setPagination,
    setFilters,
    setSort,
    refresh
  } = usePaginatedQuery({
    service: {
      getData: (options) => fetch(`/api/users?page=${options.pagination.page}&limit=${options.pagination.limit}&search=${options.filters?.search || ''}`).then(res => res.json())
    },
    initialPagination: { page: 1, limit: 10 },
    initialFilters: { search: '' },
    debounceTime: 300
  });

  if (isLoading && !data.data.length) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <input
        type="text"
        placeholder="Search users..."
        onChange={(e) => setFilters({ search: e.target.value })}
      />
      
      <table>
        <thead>
          <tr>
            <th onClick={() => setSort({ field: 'name', direction: 'asc' })}>Name</th>
            <th onClick={() => setSort({ field: 'email', direction: 'asc' })}>Email</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="pagination">
        <button 
          disabled={!data.meta.hasPrevPage}
          onClick={() => setPagination({ page: data.meta.page - 1, limit: data.meta.limit })}
        >
          Previous
        </button>
        <span>Page {data.meta.page} of {data.meta.pages}</span>
        <button 
          disabled={!data.meta.hasNextPage}
          onClick={() => setPagination({ page: data.meta.page + 1, limit: data.meta.limit })}
        >
          Next
        </button>
      </div>
      
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### Custom Types for Different APIs

One of the key features of this library is the ability to customize types for pagination, sorting, and metadata to match your API's response structure:

```tsx
import { usePaginatedQuery } from '@untools/react-query-hooks';

// Define custom types to match your API
interface CustomMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean; // Your API uses this instead of hasPrevPage
}

interface CustomPagination {
  pageNumber?: number;
  pageSize?: number;
  offset?: number;
}

interface CustomSort {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UserFilters {
  search?: string;
  status?: 'active' | 'inactive';
}

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

function CustomUserList() {
  const {
    data,
    isLoading,
    error,
    setPagination,
    setFilters,
    setSort,
  } = usePaginatedQuery<UserFilters, User, CustomPagination, CustomSort, CustomMeta>({
    service: {
      getData: async (options) => {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });
        return response.json();
      },
    },
    initialPagination: { pageNumber: 1, pageSize: 20 },
    initialSort: { sortBy: 'name', sortOrder: 'asc' },
    initialFilters: { status: 'active' },
  });

  return (
    <div>
      {/* Your component JSX */}
      <button 
        disabled={!data.meta?.hasPreviousPage}
        onClick={() => setPagination(prev => ({ 
          ...prev, 
          pageNumber: (prev.pageNumber || 1) - 1 
        }))}
      >
        Previous
      </button>
      
      <button 
        disabled={!data.meta?.hasNextPage}
        onClick={() => setPagination(prev => ({ 
          ...prev, 
          pageNumber: (prev.pageNumber || 1) + 1 
        }))}
      >
        Next
      </button>
    </div>
  );
}
```

### Debounced Input

You can also use the `useDebounce` hook directly:

```tsx
import { useDebounce } from '@untools/react-query-hooks';
import { useState } from 'react';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // debouncedSearchTerm will update 300ms after searchTerm stops changing
  // Use it for API calls to prevent excessive requests
  
  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### Enabled/Disabled Queries

Control when queries should run using the `enabled` option:

```tsx
import { usePaginatedQuery } from '@untools/react-query-hooks';

function ConditionalUserList({ shouldFetch }) {
  const {
    data,
    isLoading,
    error,
    refresh,
  } = usePaginatedQuery({
    service: {
      getData: (options) => fetchUsers(options)
    },
    enabled: shouldFetch, // Only fetch when this is true
    initialPagination: { page: 1, limit: 10 },
  });

  // You can still manually trigger the query even when disabled
  const handleManualRefresh = () => {
    refresh();
  };

  return (
    <div>
      {shouldFetch ? (
        <>
          {isLoading && <div>Loading...</div>}
          {error && <div>Error: {error.message}</div>}
          {data.data.map(user => (
            <div key={user.id}>{user.name}</div>
          ))}
        </>
      ) : (
        <button onClick={handleManualRefresh}>
          Load Users
        </button>
      )}
    </div>
  );
}
```

## API Reference

### useQuery

```typescript
function useQuery<T>({
  service,
  state,
  immediate
}: QueryOptions<T>): {
  data: T | null | undefined;
  error: Error | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}
```

#### Options

- `service`: Function that returns a Promise with the data
- `state?`: Optional object for external state management
  - `setState?`: Function to update external state
  - `getState?`: Function to get initial state
- `immediate?`: Boolean to determine if the query should run immediately (default: true)

#### Returns

- `data`: The fetched data or null
- `error`: Error object if the request failed, or null
- `isLoading`: Boolean indicating if the request is in progress
- `refresh`: Function to manually trigger the query

### usePaginatedQuery

```typescript
function usePaginatedQuery<F, D, P = DefaultPagination, S = DefaultSortInput, M = DefaultMeta>({
  service,
  initialFilters,
  initialPagination,
  initialSort,
  debounceTime,
  state,
  enabled
}: PaginatedQueryOptions<F, D, P, S, M>): {
  data: QueryResult<D, M>;
  error: Error | null;
  isLoading: boolean;
  setFilters: (filters: React.SetStateAction<F>) => void;
  setPagination: (pagination: React.SetStateAction<P>) => void;
  setSort: (sort: React.SetStateAction<S | undefined>) => void;
  refresh: () => Promise<void>;
}
```

#### Generic Type Parameters

- `F`: Type for filters
- `D`: Type for data items
- `P`: Type for pagination (defaults to `DefaultPagination`)
- `S`: Type for sorting (defaults to `DefaultSortInput`)
- `M`: Type for metadata (defaults to `DefaultMeta`)

#### Options

- `service`: Object containing a getData function that accepts filters, pagination, and sort options
- `initialFilters?`: Initial filter values
- `initialPagination?`: Initial pagination state (default: `{ page: 1, limit: 10 }`)
- `initialSort?`: Initial sort configuration
- `debounceTime?`: Debounce time in milliseconds for filter changes (default: 500)
- `enabled?`: Boolean to control when the query should run (default: true)
- `state?`: Optional object for external state management
  - `setState?`: Function to update external state
  - `getState?`: Function to get initial state

#### Returns

- `data`: The fetched data with metadata
- `error`: Error object if the request failed, or null
- `isLoading`: Boolean indicating if the request is in progress
- `setFilters`: Function to update filter values
- `setPagination`: Function to update pagination
- `setSort`: Function to update sort configuration
- `refresh`: Function to manually trigger the query

### useDebounce

```typescript
function useDebounce<T>(value: T, delay: number): T
```

#### Parameters

- `value`: The value to debounce
- `delay`: Debounce delay in milliseconds

#### Returns

- The debounced value

## TypeScript Support

This library is built with TypeScript and provides full type safety. The hooks are generic and can be typed to match your data structures:

### Basic Usage

```typescript
// Define your data types
interface User {
  id: number;
  name: string;
  email: string;
}

interface UserFilters {
  search: string;
  status?: 'active' | 'inactive';
}

// Use them with the hooks
const { data } = useQuery<User>({
  service: () => fetchUser(id)
});

const { data, setFilters } = usePaginatedQuery<UserFilters, User>({
  service: {
    getData: (options) => fetchUsers(options)
  },
  initialFilters: { search: '' }
});
```

### Custom Types for API Compatibility

```typescript
// Define custom types to match your API response structure
interface CustomMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface CustomPagination {
  pageNum: number;
  size: number;
}

interface CustomSort {
  field: string;
  direction: 'ascending' | 'descending';
}

// Use with custom types
const { data } = usePaginatedQuery<
  UserFilters,
  User,
  CustomPagination,
  CustomSort,
  CustomMeta
>({
  service: {
    getData: (options) => fetchUsers(options)
  },
  initialPagination: { pageNum: 1, size: 20 },
  initialSort: { field: 'name', direction: 'ascending' }
});

// Now data.meta will have your custom structure
const canGoNext = data.meta?.hasNext;
const canGoPrev = data.meta?.hasPrev;
```

### Default Types

If you don't specify custom types, the library uses these defaults:

```typescript
// Default Pagination
interface DefaultPagination {
  page?: number | null;
  limit?: number | null;
}

// Default Sort
type DefaultSortInput = Record<string, string>;

// Default Meta
interface DefaultMeta {
  page?: number | null;
  limit?: number | null;
  pages?: number | null;
  total?: number | null;
  hasNextPage?: boolean | null;
  hasPrevPage?: boolean | null;
}
```

## Migration Guide

### From v0.1.x to v0.2.x

The library maintains full backwards compatibility. Existing code will continue to work without any changes:

```typescript
// This still works exactly as before
const { data } = usePaginatedQuery<UserFilters, User>({
  service: { getData: fetchUsers },
  initialFilters: { search: '' }
});
```

To use the new custom types feature, simply add the additional generic parameters:

```typescript
// Enhanced with custom types
const { data } = usePaginatedQuery<UserFilters, User, CustomPagination, CustomSort, CustomMeta>({
  service: { getData: fetchUsers },
  initialFilters: { search: '' }
});
```

## License

MIT © [Miracle Onyenma](https://github.com/miracleonyenma)
