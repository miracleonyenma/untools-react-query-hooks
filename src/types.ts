// ./src/types.ts

export type Maybe<T> = T | null;

export interface Pagination {
  page: number;
  limit: number;
}

export type SortInput = Record<string, string>;

export interface Meta {
  page: number;
  limit: number;
  pages: number;
  total: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface QueryResult<D> {
  data?: Maybe<Maybe<D>[]> | undefined;
  meta?: Maybe<Meta> | undefined;
}

export interface BaseServiceOptions<F> {
  pagination?: Pagination;
  sort?: SortInput;
  filters?: F;
}
