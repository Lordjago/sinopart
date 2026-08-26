import type { Series } from '../../core/domain/entities/series';
import { idOf } from './ref.util';

export class SeriesMapper {
  static toDomain(document: any): Series | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      brandId: idOf(raw.brandId),
      name: raw.name,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as Series;
  }

  static toPersistence(series: Partial<Series>): Record<string, any> {
    return {
      brandId: series.brandId,
      name: series.name,
    };
  }

  /**
   * A patch for `update`: only the keys actually present are written.
   * `brandId` is excluded. Moving a series to another brand would silently
   * re-parent every vehicle under it, so it is not a field edit.
   */
  static toUpdate(patch: Partial<Series>): Record<string, any> {
    const out: Record<string, any> = {};
    if (patch.name !== undefined) out.name = patch.name;
    return out;
  }
}
