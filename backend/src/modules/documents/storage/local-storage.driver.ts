import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import type { SavedFile, StorageDriver } from './storage-driver.interface.js';

@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = config.get<string>('storage.localUploadsDir') ?? join(process.cwd(), 'uploads');
  }

  async save(applicationId: string, originalFilename: string, buffer: Buffer): Promise<SavedFile> {
    const key = join(applicationId, `${randomUUID()}${extname(originalFilename)}`);
    const fullPath = join(this.root, key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return { key, sizeBytes: buffer.length };
  }

  read(key: string): Promise<Buffer> {
    return readFile(join(this.root, key));
  }

  async delete(key: string): Promise<void> {
    await rm(join(this.root, key), { force: true });
  }
}
