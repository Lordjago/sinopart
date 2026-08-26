import type { Series } from '../../domain/entities/series';

export interface SeriesFilters {
  /** Restrict to one brand: how the catalog drills down from a brand page. */
  brandId?: string;
  /** Substring type-ahead on the series name. */
  search?: string;
}

export interface SeriesRepository {
  create(series: Series): Promise<Series>;
  findById(id: string): Promise<Series | null>;
  /**
   * Exact match on name WITHIN one brand, ignoring case and surrounding space.
   * Mirrors the `{ brandId, name }` unique index, which is case-sensitive and
   * would otherwise let "Camry" and "camry" coexist under one brand.
   */
  findByName(brandId: string, name: string): Promise<Series | null>;
  /** Matching series, A→Z. Unpaginated: a brand has tens of series, not thousands. */
  findAll(filters: SeriesFilters): Promise<Series[]>;
  /**
   * How many series hang off a brand. The brand-delete guard reads this, a
   * brand with series cannot be removed without orphaning them.
   */
  countByBrand(brandId: string): Promise<number>;
  update(id: string, patch: Partial<Series>): Promise<Series>;
  delete(id: string): Promise<void>;
}
