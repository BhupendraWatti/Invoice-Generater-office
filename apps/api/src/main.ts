import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // Diagnostic: Copy logs from nodejs root to public_html for FTP access
  try {
    const nodejsDir = path.join(__dirname, '../../../');
    const publicHtmlDir = path.join(__dirname, '../../../../public_html');
    if (fs.existsSync(nodejsDir) && fs.existsSync(publicHtmlDir)) {
      const files = fs.readdirSync(nodejsDir);
      files.forEach(file => {
        if (file.endsWith('.log') || file.includes('log') || file.includes('err')) {
          fs.copyFileSync(path.join(nodejsDir, file), path.join(publicHtmlDir, `copied-${file}`));
        }
      });
    }
  } catch (err) {
    console.error('[Diagnostic] Log copy failed:', err);
  }

  // Automatically generate Prisma Client and apply migrations on startup
  const schemaPath = path.join(__dirname, '../../../packages/db/prisma/schema.prisma');
  console.log('[Prisma Bootstrap] Checking schema at:', schemaPath);
  if (fs.existsSync(schemaPath)) {
    try {
      console.log('[Prisma Bootstrap] Generating Prisma client...');
      execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
      console.log('[Prisma Bootstrap] Prisma client generated successfully.');

      console.log('[Prisma Bootstrap] Applying database migrations...');
      execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, { stdio: 'inherit' });
      console.log('[Prisma Bootstrap] Database migrations applied successfully.');
    } catch (error) {
      console.error('[Prisma Bootstrap] Error during Prisma setup:', error);
    }
  } else {
    console.log('[Prisma Bootstrap] Schema file not found. Skipping auto-setup.');
  }

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors();
  app.setGlobalPrefix('api');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();

