// ./src/types.ts

export type Maybe<T> = T | null;

export interface Pagination {
  page?: Maybe<number>;
  limit?: Maybe<number>;
}

export type SortInput = Record<string, string>;

export interface Meta {
  page?: Maybe<number>;
  limit?: Maybe<number>;
  pages?: Maybe<number>;
  total?: Maybe<number>;
  hasNextPage?: Maybe<boolean>;
  hasPrevPage?: Maybe<boolean>;
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
