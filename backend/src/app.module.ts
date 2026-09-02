import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration from './config/configuration.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { User } from './modules/users/user.entity.js';
import { SnakeNamingStrategy } from './database/snake-naming.strategy.js';
import { FestivalsModule } from './modules/festivals/festivals.module.js';
import { Festival } from './modules/festivals/festival.entity.js';
import { EventTypesModule } from './modules/event-types/event-types.module.js';
import { EventType } from './modules/event-types/event-type.entity.js';
import { PoliceStationsModule } from './modules/police-stations/police-stations.module.js';
import { PoliceStation } from './modules/police-stations/police-station.entity.js';
import { AreasModule } from './modules/areas/areas.module.js';
import { Area } from './modules/areas/area.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [User, Festival, EventType, PoliceStation, Area],
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
        // Schema is fully owned by database/migrations (run via `npm run migrate` in
        // database/) — TypeORM here is query/entity layer only, never a schema source.
      }),
    }),
    AuthModule,
    UsersModule,
    FestivalsModule,
    EventTypesModule,
    PoliceStationsModule,
    AreasModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
