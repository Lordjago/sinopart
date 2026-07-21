import type { User } from '../../core/domain/entities/user';
import { UserRole, UserTier } from '../../core/domain/entities/user';
import type { PublicUser } from '../dtos/auth/auth.response';

export class UserMapper {
  static toDomain(document: any): User | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      name: raw.name,
      business: raw.business ?? '',
      email: raw.email,
      phone: raw.phone ?? '',
      passwordHash: raw.passwordHash,
      role: raw.role,
      tier: raw.tier,
      verified: raw.verified,
      emailVerified: raw.emailVerified ?? false,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toPersistence(user: Partial<User>): Record<string, any> {
    return {
      name: user.name,
      business: user.business ?? '',
      email: user.email,
      phone: user.phone ?? '',
      passwordHash: user.passwordHash,
      role: user.role ?? UserRole.BUYER,
      tier: user.tier ?? UserTier.TIER_1,
      verified: user.verified ?? false,
      emailVerified: user.emailVerified ?? false,
    };
  }

  static toPublic(user: User): PublicUser {
    return {
      id: user._id!,
      name: user.name,
      business: user.business,
      email: user.email,
      phone: user.phone,
      role: user.role,
      tier: user.tier,
      verified: user.verified,
      emailVerified: user.emailVerified,
    };
  }
}
