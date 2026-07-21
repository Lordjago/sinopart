import type { Otp } from '../../domain/entities/otp';

export interface OtpRepository {
  create(otp: Otp): Promise<Otp>;

  findByCodeToken(codeToken: string): Promise<Otp | null>;

  update(otp: Otp): Promise<Otp>;
}
