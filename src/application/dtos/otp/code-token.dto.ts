import { IsNotEmpty, IsString } from 'class-validator';

export class CodeTokenDto {
  @IsNotEmpty()
  @IsString()
  codeToken: string;

  expiresInMinutes: number;
}
