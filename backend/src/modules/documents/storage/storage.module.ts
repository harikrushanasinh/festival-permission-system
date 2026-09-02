import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_DRIVER } from './storage-driver.interface.js';
import { LocalStorageDriver } from './local-storage.driver.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const driver = config.get<string>('storage.driver');
        if (driver === 'local') return new LocalStorageDriver(config);
        // S3/R2 drivers are not implemented yet - fail at boot rather than
        // silently falling back to local storage, which would be a surprise
        // in a deployed environment expecting object storage.
        throw new Error(
          `STORAGE_DRIVER="${driver}" is not implemented. Only "local" is currently supported.`,
        );
      },
    },
  ],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}
