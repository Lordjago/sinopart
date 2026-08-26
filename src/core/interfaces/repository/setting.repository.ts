import type { Setting } from '../../domain/entities/setting';

export interface SettingRepository {
  /** Every stored override. Keys with no row fall back to their default. */
  findAll(): Promise<Setting[]>;
  findByKey(key: string): Promise<Setting | null>;
  /** Write or overwrite one key. Upsert: a key may have never been set. */
  put(key: string, value: string, updatedBy?: string | null): Promise<Setting>;
}
