/**
 * Reading and changing platform configuration.
 * (GET /admin/config, PATCH /admin/config/:key, GET /config/public)
 * ---------------------------------------------------------------------------
 * The admin screen renders straight off the registry, so adding a configurable
 * value is one entry in SETTING_DEFINITIONS and nothing here changes: label,
 * help text, units, bounds and grouping all travel with the definition.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SETTING_REPOSITORY, USER_REPOSITORY } from '../../injection.token';
import type { SettingRepository } from '../../interfaces/repository/setting.repository';
import type { UserRepository } from '../../interfaces/repository/user.repository';
import {
  coerce,
  findDefinition,
  validate,
  SETTING_DEFINITIONS,
  type SettingDefinition,
} from '../../domain/entities/setting';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';
import { SettingsService } from './settings.service';

/** One row on the config screen: what it is, what it holds, who last touched it. */
export interface SettingView extends SettingDefinition {
  value: string;
  /** The same value as its declared type, for anything doing maths. */
  typed: number | string | boolean;
  /** True while the key has never been overridden. */
  isDefault: boolean;
  updatedAt: Date | null;
  updatedByName: string | null;
}

@Injectable()
export class ListSettingsUseCase extends BaseUseCase<void, SettingView[]> {
  constructor(
    @Inject(SETTING_REPOSITORY)
    private readonly settings: SettingRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {
    super();
  }

  async execute(): Promise<SettingView[]> {
    const stored = await this.settings.findAll();
    const byKey = new Map(stored.map((s) => [s.key, s]));

    // Resolve the editors once rather than per row: several settings are
    // usually changed by the same admin in one sitting.
    const editorIds = [
      ...new Set(stored.map((s) => s.updatedBy).filter(Boolean)),
    ] as string[];
    const editors = new Map<string, string>();
    await Promise.all(
      editorIds.map(async (id) => {
        const user = await this.users.findById(id);
        if (user) editors.set(id, user.name);
      }),
    );

    return SETTING_DEFINITIONS.map((definition) => {
      const row = byKey.get(definition.key);
      const value = row?.value ?? definition.defaultValue;
      return {
        ...definition,
        value,
        typed: coerce(definition, value),
        isDefault: !row,
        updatedAt: row?.updatedAt ?? null,
        updatedByName: row?.updatedBy
          ? (editors.get(row.updatedBy) ?? null)
          : null,
      };
    });
  }
}

export interface UpdateSettingInput {
  key: string;
  value: string;
  adminId: string;
}

@Injectable()
export class UpdateSettingUseCase extends BaseUseCase<
  UpdateSettingInput,
  SettingView
> {
  constructor(
    @Inject(SETTING_REPOSITORY)
    private readonly settings: SettingRepository,
    private readonly cache: SettingsService,
    private readonly list: ListSettingsUseCase,
  ) {
    super();
  }

  async execute({ key, value, adminId }: UpdateSettingInput) {
    // Only keys the platform actually reads may be written. Without this, the
    // settings collection becomes a junk drawer nothing consumes.
    const definition = findDefinition(key);
    if (!definition) {
      throw new ResourceNotFoundError(`No such setting: ${key}`);
    }

    const trimmed = String(value).trim();
    const problem = validate(definition, trimmed);
    if (problem) throw new ValidationError(problem);

    await this.settings.put(key, trimmed, adminId);
    // Drop the cached snapshot so the new value is live immediately, rather
    // than after the read window expires.
    this.cache.invalidate();

    const rows = await this.list.execute();
    return rows.find((r) => r.key === key)!;
  }
}

/**
 * The subset a signed-out dealer app may read.
 *
 * An allow-list via `definition.public`, so adding an internal setting cannot
 * leak it by accident: a new key is private unless someone says otherwise.
 */
@Injectable()
export class GetPublicConfigUseCase extends BaseUseCase<
  void,
  Record<string, number | string | boolean>
> {
  constructor(private readonly settings: SettingsService) {
    super();
  }

  async execute(): Promise<Record<string, number | string | boolean>> {
    const all = await this.settings.all();
    const out: Record<string, number | string | boolean> = {};
    for (const definition of SETTING_DEFINITIONS) {
      if (definition.public) {
        out[definition.key] = coerce(definition, all[definition.key]);
      }
    }
    return out;
  }
}
