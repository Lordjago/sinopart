/**
 * AuthUser — the authenticated principal carried on a request
 * ---------------------------------------------------------------------------
 * When a request presents a valid JWT, the auth guard decodes the token and
 * attaches this object to `request.user`; the `@CurrentUser()` decorator then
 * hands it to a controller, which passes it into a use case.
 *
 * These fields are exactly the "claims" we sign into the token at login. It is a
 * value object (identity-less, defined by its data) and lives in the core so
 * both the HTTP layer and the use cases agree on the shape of "who is calling".
 */
export interface AuthUser {
  /** The user's database id. Lives in the JWT's standard `sub` claim. */
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  verified: boolean;
}
