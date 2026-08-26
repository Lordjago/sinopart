/**
 * Human names for the dealer's documents.
 *
 * These exist so an error message can say "upload your CAC certificate"
 * instead of echoing `cac_certificate` at someone. The admin panel keeps its
 * own label map for display; this one is only for messages the core produces.
 */
import {
  KycDocumentType,
  REQUIRED_DEALER_KYC_DOCUMENTS,
} from '../../domain/value-object/kyc';

export const DEALER_DOC_LABEL: Record<string, string> = {
  [KycDocumentType.CAC_CERTIFICATE]: 'a CAC certificate',
  [KycDocumentType.PROOF_OF_ADDRESS]: 'proof of address',
  [KycDocumentType.LIVENESS]: 'a liveness selfie',
};

export const REQUIRED_DEALER_DOC_LABELS = REQUIRED_DEALER_KYC_DOCUMENTS.map(
  (type) => DEALER_DOC_LABEL[type] ?? type,
);