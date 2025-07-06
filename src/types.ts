// ./src/types.ts

export type Maybe<T> = T | null;

// Default types for backwards compatibility
export interface DefaultPagination {
  page?: Maybe<number>;
  limit?: Maybe<number>;
}

export type DefaultSortInput = Record<string, string>;

export interface DefaultMeta {
  page?: Maybe<number>;
  limit?: Maybe<number>;
  pages?: Maybe<number>;
  total?: Maybe<number>;
  hasNextPage?: Maybe<boolean>;
  hasPrevPage?: Maybe<boolean>;
}

// Generic interfaces that can be customized
export interface QueryResult<D, M = DefaultMeta> {
  data?: Maybe<Maybe<D>[]> | undefined;
  meta?: Maybe<M> | undefined;
}

export interface BaseServiceOptions<
  F,
  P = DefaultPagination,
  S = DefaultSortInput
> {
  pagination?: P;
  sort?: S;
  filters?: F;
}

// Export the defaults for backwards compatibility
export type Pagination = DefaultPagination;
export type SortInput = DefaultSortInput;
export type Meta = DefaultMeta;
