import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../decorator/is-public.decorator';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { CheckInvitationUseCase } from '../../../core/usecase/supplier-auth/check-invitation.usecase';
import { IssueInvitationUseCase } from '../../../core/usecase/supplier-auth/issue-invitation.usecase';
import { SendPhoneOtpUseCase } from '../../../core/usecase/supplier-auth/send-phone-otp.usecase';
import { VerifyPhoneOtpUseCase } from '../../../core/usecase/supplier-auth/verify-phone-otp.usecase';
import { ResendPhoneOtpUseCase } from '../../../core/usecase/supplier-auth/resend-phone-otp.usecase';
import { GetSupplierProfileUseCase } from '../../../core/usecase/supplier-auth/get-supplier-profile.usecase';
import { UploadKycDocumentUseCase } from '../../../core/usecase/supplier-auth/upload-kyc-document.usecase';
import { SubmitKycUseCase } from '../../../core/usecase/supplier-auth/submit-kyc.usecase';
import { GetKycStatusUseCase } from '../../../core/usecase/supplier-auth/get-kyc-status.usecase';
import { SendOtpDto } from '../../../application/dtos/supplier/send-otp.dto';
import { CreateInvitationDto } from '../../../application/dtos/supplier/create-invitation.dto';
import { UploadKycDocumentDto } from '../../../application/dtos/supplier/upload-kyc-document.dto';
import { SubmitKycDto } from '../../../application/dtos/supplier/submit-kyc.dto';
import { VerifyTokenDto } from '../../../application/dtos/otp/verify-token.dto';
import { CodeTokenDto } from '../../../application/dtos/otp/code-token.dto';

@Controller('supplier-auth')
export class SupplierAuthController {
  constructor(
    private readonly checkInvitation: CheckInvitationUseCase,
    private readonly issueInvitation: IssueInvitationUseCase,
    private readonly sendPhoneOtp: SendPhoneOtpUseCase,
    private readonly verifyPhoneOtp: VerifyPhoneOtpUseCase,
    private readonly resendPhoneOtp: ResendPhoneOtpUseCase,
    private readonly getSupplierProfile: GetSupplierProfileUseCase,
    private readonly uploadKycDocument: UploadKycDocumentUseCase,
    private readonly submitKyc: SubmitKycUseCase,
    private readonly getKycStatus: GetKycStatusUseCase,
  ) {}

  @Public()
  @Get('invitation/:code')
  invitation(@Param('code') code: string) {
    return this.checkInvitation.execute(code);
  }

  /**
   * Mint a fresh single-use invite. Authenticated by AuthGuard, authorized by
   * RolesGuard against @Roles(ADMIN).
   *
   * `issuedBy` is the calling admin's id, taken from the verified token rather
   * than the body: an audit trail the caller can write for themselves records
   * nothing worth knowing. The admin panel calls POST /admin/invitations, which
   * is the same use case. This route stays for the supplier-facing API shape.
   */
  @Roles(UserRole.ADMIN)
  @Post('invitations')
  createInvitation(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.issueInvitation.execute({
      storeName: dto.storeName,
      expiresInDays: dto.expiresInDays,
      issuedBy: admin.id,
    });
  }

  @Public()
  @Post('otp/send')
  send(@Body() dto: SendOtpDto) {
    return this.sendPhoneOtp.execute(dto);
  }

  @Public()
  @Post('otp/verify')
  verify(@Body() dto: VerifyTokenDto) {
    return this.verifyPhoneOtp.execute(dto);
  }

  @Public()
  @Post('otp/resend')
  resend(@Body() dto: CodeTokenDto) {
    return this.resendPhoneOtp.execute(dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.getSupplierProfile.execute(user.id);
  }

  // Authenticated: the supplier uploads their own KYC docs, one per call. The
  // multipart body carries the file under `file` and the doc `type` alongside.
  @Post('kyc/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadKyc(
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadKycDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadKycDocument.execute({
      supplierId: user.id,
      type: dto.type,
      buffer: file?.buffer,
      filename: file?.originalname,
      mimeType: file?.mimetype,
      size: file?.size ?? 0,
    });
  }

  // The supplier's own verification state: drives the "Verify your store" screen.
  @Get('kyc/status')
  kycStatus(@CurrentUser() user: AuthUser) {
    return this.getKycStatus.execute(user.id);
  }

  // Final step: office address + bank + terms + move to REVIEW. Documents are
  // uploaded separately (kyc/documents) before this is called.
  @Post('kyc/submit')
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitKycDto) {
    return this.submitKyc.execute({
      supplierId: user.id,
      bankHolder: dto.bankHolder,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      officeAddress: {
        street: dto.officeAddress.street,
        city: dto.officeAddress.city,
        province: dto.officeAddress.province,
        postalCode: dto.officeAddress.postalCode ?? null,
        country: dto.officeAddress.country,
      },
      termsAccepted: dto.termsAccepted,
    });
  }
}
