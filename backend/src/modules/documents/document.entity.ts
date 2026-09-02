import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DocumentVerificationStatus } from './document-verification-status.enum.js';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  applicationId!: string;

  @Column()
  requirementCode!: string;

  @Column()
  originalFilename!: string;

  @Column()
  storageKey!: string;

  @Column({ nullable: true })
  mimeType?: string;

  @Column({ type: 'bigint', nullable: true })
  sizeBytes?: number;

  @Column({
    type: 'enum', enum: DocumentVerificationStatus, enumName: 'document_verification_status',
    default: DocumentVerificationStatus.PENDING,
  })
  verificationStatus!: DocumentVerificationStatus;

  @Column({ type: 'text', nullable: true })
  verificationNote?: string;

  @Column({ nullable: true })
  uploadedBy?: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;
}
