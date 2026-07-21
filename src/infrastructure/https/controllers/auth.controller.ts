/**
 * AuthController — HTTP endpoints for authentication (a DRIVING adapter)
 * ---------------------------------------------------------------------------
 * Controllers are thin: they map a URL + verb to a use case and return its
 * result. No try/catch (the exception filter formats errors) and no response
 * wrapping (the interceptor adds { success, data }).
 *
 *   POST /auth/register         (public) -> create account, return { user, token }
 *   POST /auth/login            (public) -> sign in,        return { user, token }
 *   POST /auth/logout           (auth)   -> acknowledge logout
 *   GET  /auth/me               (auth)   -> return the current user
 *
 *   --- password reset (all public: the user cannot log in) ---
 *   POST /auth/forgot-password  (public) -> email a code,  return { codeToken }
 *   POST /auth/verify-otp       (public) -> check the code, mark it verified
 *   POST /auth/resend-otp       (public) -> rotate + resend the code
 *   POST /auth/reset-password   (public) -> set the new password
 */
import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../decorator/is-public.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { RegisterUserUseCase } from '../../../core/usecase/auth/register-user.usecase';
import { AuthenticateUserUseCase } from '../../../core/usecase/auth/authenticate-user.usecase';
import { GetProfileUseCase } from '../../../core/usecase/auth/get-profile.usecase';
import { ForgotPasswordUseCase } from '../../../core/usecase/auth/forgot-password.usecase';
import { VerifyOtpUseCase } from '../../../core/usecase/auth/verify-otp.usecase';
import { ResendOtpUseCase } from '../../../core/usecase/auth/resend-otp.usecase';
import { ResetPasswordUseCase } from '../../../core/usecase/auth/reset-password.usecase';
import { SendEmailVerificationUseCase } from '../../../core/usecase/auth/send-email-verification.usecase';
import { VerifyEmailUseCase } from '../../../core/usecase/auth/verify-email.usecase';
import { RegisterDto } from '../../../application/dtos/auth/register.dto';
import { LoginDto } from '../../../application/dtos/auth/login.dto';
import { EmailDto } from '../../../application/dtos/auth/email.dto';
import { ResetPasswordDto } from '../../../application/dtos/auth/reset-password.dto';
import { CodeTokenDto } from '../../../application/dtos/otp/code-token.dto';
import { VerifyTokenDto } from '../../../application/dtos/otp/verify-token.dto';
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly getProfile: GetProfileUseCase,
    private readonly forgotPassword: ForgotPasswordUseCase,
    private readonly verifyOtp: VerifyOtpUseCase,
    private readonly resendOtp: ResendOtpUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly sendEmailVerification: SendEmailVerificationUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registerUser.execute(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authenticateUser.execute(dto);
  }

  // Stateless JWTs have nothing to invalidate server-side; the client discards
  // its token. We expose the endpoint so the frontend's logout() call succeeds.
  @Post('logout')
  logout() {
    return { loggedOut: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.getProfile.execute(user.id);
  }

  @Public()
  @Post('forgot-password')
  forgot(@Body() dto: EmailDto) {
    return this.forgotPassword.execute(dto);
  }

  @Public()
  @Post('verify-otp')
  verify(@Body() dto: VerifyTokenDto) {
    return this.verifyOtp.execute(dto);
  }

  @Public()
  @Post('resend-otp')
  resend(@Body() dto: CodeTokenDto) {
    return this.resendOtp.execute(dto);
  }

  @Public()
  @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) {
    return this.resetPassword.execute(dto);
  }

  // --- email verification (authenticated: the client already holds a JWT from
  // registering, and we take the identity from the token, not the body) ---

  @Post('send-verification')
  sendVerification(@CurrentUser() user: AuthUser) {
    return this.sendEmailVerification.execute(user.id);
  }

  @Post('verify-email')
  confirmEmail(@CurrentUser() user: AuthUser, @Body() dto: VerifyTokenDto) {
    return this.verifyEmail.execute({
      userId: user.id,
      codeToken: dto.codeToken,
      code: dto.code,
    });
  }
}
