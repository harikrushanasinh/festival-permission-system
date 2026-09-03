import {
  BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Document } from './document.entity.js';
import { DocumentVerificationStatus } from './document-verification-status.enum.js';
import { VerifyDocumentDto } from './dto/verify-document.dto.js';
import { STORAGE_DRIVER, type StorageDriver } from './storage/storage-driver.interface.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export interface RequestingUser {
  sub: string;
  role: UserRole;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private readonly repo: Repository<Document>,
    private readonly dataSource: DataSource,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {}

  private async assertApplicationAccess(applicationId: string, user: RequestingUser): Promise<void> {
    if (STAFF_ROLES.includes(user.role)) return;
    const [app] = await this.dataSource.query('SELECT organizer_id AS "organizerId" FROM applications WHERE id = $1', [applicationId]);
    if (!app) throw new NotFoundException('Application not found');
    if (app.organizerId !== user.sub) throw new ForbiddenException('You do not have access to this application');
  }

  private async validateRequirementCode(applicationId: string, requirementCode: string): Promise<void> {
    const [row] = await this.dataSource.query(
      `SELECT dr.code FROM document_requirements dr
       JOIN applications a ON a.event_type_id = dr.event_type_id
       WHERE a.id = $1 AND dr.code = $2`,
      [applicationId, requirementCode],
    );
    if (!row) {
      throw new BadRequestException(`"${requirementCode}" is not a valid document requirement for this application's event type`);
    }
  }

  async upload(
    applicationId: string,
    user: RequestingUser,
    requirementCode: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<Document> {
    await this.assertApplicationAccess(applicationId, user);
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type "${file.mimetype}" is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }
    await this.validateRequirementCode(applicationId, requirementCode);

    const saved = await this.storage.save(applicationId, file.originalname, file.buffer);

    return this.repo.save(
      this.repo.create({
        applicationId,
        requirementCode,
        originalFilename: file.originalname,
        storageKey: saved.key,
        mimeType: file.mimetype,
        sizeBytes: saved.sizeBytes,
        uploadedBy: user.sub,
        verificationStatus: DocumentVerificationStatus.PENDING,
      }),
    );
  }

  async findByApplication(applicationId: string, user: RequestingUser): Promise<Document[]> {
    await this.assertApplicationAccess(applicationId, user);
    return this.repo.find({ where: { applicationId }, order: { uploadedAt: 'DESC' } });
  }

  private async findOneOrThrow(id: string): Promise<Document> {
    const document = await this.repo.findOneBy({ id });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async download(id: string, user: RequestingUser): Promise<{ document: Document; buffer: Buffer }> {
    const document = await this.findOneOrThrow(id);
    await this.assertApplicationAccess(document.applicationId, user);
    const buffer = await this.storage.read(document.storageKey);
    return { document, buffer };
  }

  async remove(id: string, user: RequestingUser): Promise<void> {
    const document = await this.findOneOrThrow(id);
    if (!STAFF_ROLES.includes(user.role)) {
      const [app] = await this.dataSource.query('SELECT organizer_id AS "organizerId" FROM applications WHERE id = $1', [document.applicationId]);
      if (!app || app.organizerId !== user.sub) throw new ForbiddenException('You do not have access to this document');
    }
    await this.storage.delete(document.storageKey);
    await this.repo.remove(document);
  }

  async verify(id: string, dto: VerifyDocumentDto): Promise<Document> {
    const document = await this.findOneOrThrow(id);
    document.verificationStatus = dto.status;
    document.verificationNote = dto.note;
    return this.repo.save(document);
  }
}
