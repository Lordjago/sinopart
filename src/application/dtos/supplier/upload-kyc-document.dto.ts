import { IsEnum } from 'class-validator';
import { KycDocumentType } from '../../../core/domain/value-object/kyc';

/** The `type` field that accompanies the multipart file upload. */
export class UploadKycDocumentDto {
  @IsEnum(KycDocumentType, {
    message: 'type must be one of: business_license, identity, store_photo.',
  })
  type: KycDocumentType;
}
