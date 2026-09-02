import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentVerificationStatus } from '../document-verification-status.enum.js';

export class VerifyDocumentDto {
  @IsEnum([DocumentVerificationStatus.VERIFIED, DocumentVerificationStatus.REJECTED])
  status!: DocumentVerificationStatus.VERIFIED | DocumentVerificationStatus.REJECTED;

  @IsOptional() @IsString()
  note?: string;
}
