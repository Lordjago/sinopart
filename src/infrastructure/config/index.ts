/**
 * config barrel — one import site for configuration helpers
 * ---------------------------------------------------------------------------
 * The infrastructure layer centralises configuration here. Today it re-exports
 * the env validator and typed env class; modules read individual values through
 * Nest's `ConfigService` (which is populated and validated at startup). Keeping
 * a single `infrastructure/config` entry point means new config concerns have an
 * obvious home.
 */
export * from './env.validation';
