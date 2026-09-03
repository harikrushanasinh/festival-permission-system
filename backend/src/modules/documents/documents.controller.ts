import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Res, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service.js';
import { VerifyDocumentDto } from './dto/verify-document.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches configuration.ts default

@UseGuards(JwtAuthGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('applications/:applicationId/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async upload(
    @CurrentUser() user: JwtPayload,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body('requirementCode') requirementCode: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded (expected multipart field "file")');
    if (!requirementCode) throw new BadRequestException('requirementCode is required');
    return this.documentsService.upload(applicationId, user, requirementCode, file);
  }

  @Get('applications/:applicationId/documents')
  findByApplication(@CurrentUser() user: JwtPayload, @Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.documentsService.findByApplication(applicationId, user);
  }

  @Get('documents/:id/download')
  async download(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { document, buffer } = await this.documentsService.download(id, user);
    res.set({
      'Content-Type': document.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${document.originalFilename}"`,
    });
    res.send(buffer);
  }

  @Delete('documents/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.remove(id, user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER)
  @Patch('documents/:id/verify')
  verify(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VerifyDocumentDto) {
    return this.documentsService.verify(id, dto);
  }
}
