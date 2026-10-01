// Must be the literal first import: @WebSocketGateway's decorator options (CORS origin,
// among others) are evaluated at class-definition/module-import time, before
// ConfigModule.forRoot() ever runs - so FRONTEND_URL (and any other env var a decorator
// reads directly) has to already be in process.env before AppModule is imported below.
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

// The config layer falls back to these if the corresponding env vars are unset, so a
// fresh checkout boots without any .env for local dev. In production that silent
// fallback is a real vulnerability (anyone who reads this source code can forge a
// valid JWT), so bootstrap refuses to start rather than let it through quietly.
const INSECURE_JWT_DEFAULTS = ['dev_access_secret', 'dev_refresh_secret'];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  if (config.get<string>('nodeEnv') === 'production') {
    const accessSecret = config.get<string>('jwt.accessSecret');
    const refreshSecret = config.get<string>('jwt.refreshSecret');
    if (INSECURE_JWT_DEFAULTS.includes(accessSecret!) || INSECURE_JWT_DEFAULTS.includes(refreshSecret!)) {
      throw new Error(
        'Refusing to start in production with default JWT_ACCESS_SECRET/JWT_REFRESH_SECRET. ' +
          'Set real secrets via environment variables before deploying.',
      );
    }
  }

  app.use(helmet());
  app.setGlobalPrefix(config.get<string>('apiPrefix') || 'api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: config.get<string>('frontendUrl'),
    credentials: true,
  });

  const port = config.get<number>('port') || 3000;
  await app.listen(port);
  Logger.log(`Festival API running on http://localhost:${port}/${config.get<string>('apiPrefix')}`, 'Bootstrap');
}

await bootstrap();
