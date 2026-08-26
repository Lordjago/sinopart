/**
 * The full catalog. Brands are grouped by origin only for authoring
 * convenience; nothing downstream cares which file a brand came from.
 *
 * To add a brand: create it in the file its origin belongs to (or a new file),
 * export it, and add it to the spread below. The seed is idempotent, so
 * re-running after an edit adds the new rows and leaves everything else alone.
 */
import type { BrandSpec } from '../types';
import { TOYOTA_GROUP } from './toyota-group';
import { JAPANESE } from './japanese';
import { KOREAN } from './korean';
import { CHINESE } from './chinese';
import { GERMAN } from './german';
import { AMERICAN } from './american';
import { EUROPEAN } from './european';

export const CATALOG: BrandSpec[] = [
  ...CHINESE,
  ...TOYOTA_GROUP,
  ...JAPANESE,
  ...KOREAN,
  ...GERMAN,
  ...AMERICAN,
  ...EUROPEAN,
];
