import type { Brand } from '../../domain/entities/brand';

export interface BrandRepository {
  create(brand: Brand): Promise<Brand>;
  findById(id: string): Promise<Brand | null>;
  /**
   * Exact match on name, ignoring case and surrounding space, the lookup a
   * create/rename runs first to refuse a duplicate before hitting the unique
   * index (which IS case-sensitive, so it would let "toyota" through).
   */
  findByName(name: string): Promise<Brand | null>;
  /**
   * Every brand, A→Z. Brands are a small curated set the client caches whole,
   * so there is no pagination; `search` is an optional substring filter for
   * type-ahead. Add a `Page` overload here if the set ever outgrows one screen.
   */
  findAll(search?: string): Promise<Brand[]>;
  update(id: string, patch: Partial<Brand>): Promise<Brand>;
  /**
   * Removes the brand only. Series pointing at it are NOT cascaded, whether an
   * in-use brand may be deleted is a use-case decision, made by asking the
   * series repository first.
   */
  delete(id: string): Promise<void>;
}
