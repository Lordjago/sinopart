import type { Brand } from '../../core/domain/entities/brand';

export class BrandMapper {
  static toDomain(document: any): Brand | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      name: raw.name,
      description: raw.description ?? undefined,
      logo: raw.logo ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as Brand;
  }

  static toPersistence(brand: Partial<Brand>): Record<string, any> {
    return {
      name: brand.name,
      description: brand.description ?? null,
      logo: brand.logo ?? null,
    };
  }

  /**
   * A patch for `update`: only the keys actually present are written, so
   * renaming a brand never wipes its logo.
   */
  static toUpdate(patch: Partial<Brand>): Record<string, any> {
    const out: Record<string, any> = {};
    const fields: (keyof Brand)[] = ['name', 'description', 'logo'];
    for (const f of fields) {
      if (patch[f] !== undefined) out[f] = patch[f];
    }
    return out;
  }
}
