/**
 * Reading configuration, wherever the rest of the platform needs it.
 * ---------------------------------------------------------------------------
 * Every key resolves against the registry default unless an admin has written
 * an override, so a fresh database behaves exactly as the old hard-coded
 * constants did and no key can ever resolve to undefined.
 *
 * Reads are cached for a few seconds. These values are read on nearly every
 * catalog and checkout request but changed a handful of times a year, so going
 * to Mongo each time buys nothing. The window is short enough that an admin
 * saving a new fee sees it take effect while they are still on the screen.
 */
import { Inject, Injectable } from '@nestjs/common';
import { SETTING_REPOSITORY } from '../../injection.token';
import type { SettingRepository } from '../../interfaces/repository/setting.repository';
import {
  coerce,
  findDefinition,
  SETTING_DEFINITIONS,
  SETTING_KEYS,
} from '../../domain/entities/setting';

/** How long a resolved snapshot is reused before going back to the database. */
const CACHE_MS = 10_000;

@Injectable()
export class SettingsService {
  private cache: Record<string, string> | null = null;
  private cachedAt = 0;

  constructor(
    @Inject(SETTING_REPOSITORY)
    private readonly settings: SettingRepository,
  ) {}

  /** Every key, defaults first, overridden by whatever is stored. */
  async all(): Promise<Record<string, string>> {
    if (this.cache && Date.now() - this.cachedAt < CACHE_MS) {
      return this.cache;
    }
    const stored = await this.settings.findAll();
    const resolved: Record<string, string> = {};
    for (const definition of SETTING_DEFINITIONS) {
      resolved[definition.key] = definition.defaultValue;
    }
    for (const row of stored) {
      // A stored key with no definition is a leftover from a removed feature.
      // Ignored rather than surfaced, so deleting a definition is safe.
      if (findDefinition(row.key)) resolved[row.key] = row.value;
    }
    this.cache = resolved;
    this.cachedAt = Date.now();
    return resolved;
  }

  /** Drop the cache, so the next read sees a just-saved value immediately. */
  invalidate(): void {
    this.cache = null;
  }

  async number(key: string): Promise<number> {
    const definition = findDefinition(key);
    if (!definition) return NaN;
    const all = await this.all();
    return Number(coerce(definition, all[key]));
  }

  /** The pricing inputs, in one read, for the landed-cost calculation. */
  async pricing(): Promise<{
    cnyToNgn: number;
    freightInsurance: number;
    feeRate: number;
    dutyRate: number;
  }> {
    const all = await this.all();
    const num = (key: string) => Number(all[key]);
    return {
      cnyToNgn: num(SETTING_KEYS.CNY_TO_NGN),
      freightInsurance: num(SETTING_KEYS.FREIGHT_INSURANCE),
      feeRate: num(SETTING_KEYS.SINOPART_FEE_RATE),
      dutyRate: num(SETTING_KEYS.DUTY_RATE),
    };
  }

  async inspectionFee(): Promise<number> {
    return this.number(SETTING_KEYS.INSPECTION_FEE);
  }

  async reservationHours(): Promise<number> {
    return this.number(SETTING_KEYS.RESERVATION_HOURS);
  }
}
