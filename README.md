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
function usePaginatedQuery<F, D>({
  service,
  initialFilters,
  initialPagination,
  initialSort,
  debounceTime,
  state
}: PaginatedQueryOptions<F, D>): {
  data: QueryResult<D>;
  error: Error | null;
  isLoading: boolean;
  setFilters: (filters: F) => void;
  setPagination: (pagination: Pagination) => void;
  setSort: (sort: SortInput) => void;
  refresh: () => Promise<void>;
}
```

#### Options

- `service`: Object containing a getData function that accepts filters, pagination, and sort options
- `initialFilters?`: Initial filter values
- `initialPagination?`: Initial pagination state (default: `{ page: 1, limit: 10 }`)
- `initialSort?`: Initial sort configuration
- `debounceTime?`: Debounce time in milliseconds for filter changes (default: 500)
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

## License

MIT © [Miracle Onyenma](https://github.com/miracleonyenma)

