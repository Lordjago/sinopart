/**
 * Does the name the registry holds for an id match the name on the account?
 *
 * The reference implementation this was modelled on skipped this entirely — it
 * only checked that the lookup returned *something*, which means anyone who
 * knows someone else's BVN passes. Comparing the names is the whole point of
 * the check.
 *
 * The comparison is deliberately forgiving, because the two sources disagree
 * for innocent reasons far more often than fraudulent ones:
 *   - registries store "ADEBAYO OLUWASEUN", accounts hold "Adebayo Oluwaseun"
 *   - order differs: "surname firstname" vs "firstname surname"
 *   - accounts carry a middle name the registry does not, or the reverse
 *   - punctuation and double spaces
 *
 * So: casefold, strip anything that is not a letter or space, split into parts,
 * and require that the registry's first and last names BOTH appear among the
 * account's parts. Extra parts on either side are ignored.
 *
 * This is intentionally not fuzzy matching. A near-miss on spelling should
 * reach a human, not be silently accepted.
 */

/** Casefold, drop punctuation/diacritic noise, collapse whitespace, split. */
function parts(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export interface NameMatchResult {
  matched: boolean;
  /** Human-readable why-not, for the audit row. Null when matched. */
  reason: string | null;
}

export function matchesAccountName(
  accountName: string,
  registryFirstName: string | null,
  registryLastName: string | null,
): NameMatchResult {
  const account = new Set(parts(accountName ?? ''));
  const first = parts(registryFirstName ?? '');
  const last = parts(registryLastName ?? '');

  if (!first.length && !last.length) {
    return { matched: false, reason: 'Registry returned no name to compare.' };
  }
  if (!account.size) {
    return { matched: false, reason: 'Account has no name to compare.' };
  }

  const missing: string[] = [];
  // Each registry name may itself be multi-part ("oluwaseun ade"); every part
  // of it must be present, or a shared surname alone would pass.
  if (first.length && !first.every((p) => account.has(p))) {
    missing.push('first name');
  }
  if (last.length && !last.every((p) => account.has(p))) {
    missing.push('last name');
  }

  if (missing.length) {
    return {
      matched: false,
      // The registry's actual name is NOT quoted back: it belongs to whoever
      // owns that id, who may not be the person making this request.
      reason: `The ${missing.join(' and ')} on this ID does not match the name on your account.`,
    };
  }
  return { matched: true, reason: null };
}
