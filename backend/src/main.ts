import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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
  console.log(`Festival API running on http://localhost:${port}/${config.get<string>('apiPrefix')}`);
}
await bootstrap();
