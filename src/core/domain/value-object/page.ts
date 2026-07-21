/**
 * Page<T> — a value object describing one page of a paginated list
 * ---------------------------------------------------------------------------
 * A "value object" is a small, immutable object defined entirely by its data
 * (not by an identity). This one is the standard envelope every list endpoint
 * returns: the rows plus the metadata a UI needs to render pagination.
 *
 * It lives in `core/domain` because pagination is a business concept, not a
 * detail of HTTP or MongoDB — repositories return it and use cases pass it on.
 */
export class Page<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextPage: number | null;

  constructor(data: T[], page: number, limit: number, total: number) {
    this.data = data;
    this.page = page;
    this.limit = limit;
    this.total = total;
    // Round UP: 21 items at 20/page => 2 pages.
    this.totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    // `null` (not 0) signals "no more pages" so the UI can hide a Next button.
    this.nextPage = page < this.totalPages ? page + 1 : null;
  }
}
