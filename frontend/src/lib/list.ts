/** Envelope metadata returned alongside list data by the API. */
export interface ListMeta {
  limit: number;
  capped: boolean;
}

export interface ListResponse<T> {
  data: T[];
  meta?: ListMeta;
}
