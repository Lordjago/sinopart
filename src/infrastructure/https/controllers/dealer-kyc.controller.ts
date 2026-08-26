/**
 * A dealer's own verification file.
 *
 *   GET  /kyc/status      -> where I am, what is left, why anything bounced
 *   POST /kyc/details     -> save one wizard step's typed answers
 *   POST /kyc/bank        -> save where refunds go
 *   POST /kyc/documents   -> upload one document (multipart)
 *   POST /kyc/submit      -> confirm and send for review
 *
 * Every route is BUYER-only and takes the dealer's id from the token, never
 * from the path or body: there is no way to address someone else's file here.
 * The back office reads and decides these through /admin/kyc/dealers.
 */
import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { GetDealerKycStatusUseCase } from '../../../core/usecase/dealer-kyc/get-dealer-kyc-status.usecase';
import { SaveDealerKycDetailsUseCase } from '../../../core/usecase/dealer-kyc/save-dealer-kyc-details.usecase';
import { SaveDealerBankAccountUseCase } from '../../../core/usecase/dealer-kyc/save-dealer-bank-account.usecase';
import { UploadDealerKycDocumentUseCase } from '../../../core/usecase/dealer-kyc/upload-dealer-kyc-document.usecase';
import { SubmitDealerKycUseCase } from '../../../core/usecase/dealer-kyc/submit-dealer-kyc.usecase';
import {
  SaveDealerBankAccountDto,
  SaveDealerKycDetailsDto,
  SubmitDealerKycDto,
  UploadDealerKycDocumentDto,
} from '../../../application/dtos/dealer-kyc/dealer-kyc.dto';

@Controller('kyc')
@Roles(UserRole.BUYER)
export class DealerKycController {
  constructor(
    private readonly getStatus: GetDealerKycStatusUseCase,
    private readonly saveDetails: SaveDealerKycDetailsUseCase,
    private readonly saveBank: SaveDealerBankAccountUseCase,
    private readonly uploadDocument: UploadDealerKycDocumentUseCase,
    private readonly submit: SubmitDealerKycUseCase,
  ) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.getStatus.execute(user.id);
  }

  @Post('details')
  details(@CurrentUser() user: AuthUser, @Body() dto: SaveDealerKycDetailsDto) {
    return this.saveDetails.execute({ userId: user.id, ...dto });
  }

  @Post('bank')
  bank(@CurrentUser() user: AuthUser, @Body() dto: SaveDealerBankAccountDto) {
    return this.saveBank.execute({
      userId: user.id,
      holder: dto.holder,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
    });
  }

  /** One document per call. The multipart body carries the file under `file`
   *  and the document `type` alongside it. */
  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadDealerKycDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadDocument.execute({
      userId: user.id,
      type: dto.type,
      buffer: file?.buffer,
      filename: file?.originalname,
      mimeType: file?.mimetype,
      size: file?.size ?? 0,
    });
  }

  @Post('submit')
  send(@CurrentUser() user: AuthUser, @Body() dto: SubmitDealerKycDto) {
    return this.submit.execute({
      userId: user.id,
      termsAccepted: dto.termsAccepted,
    });
  }
}