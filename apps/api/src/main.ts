import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

function copyLogs() {
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
      
      // Diagnostic: Copy frontend configuration files
      const frontendDir = '/home/u163598660/domains/sales.granthinfotech.in';
      const frontendHtaccess = path.join(frontendDir, 'public_html/.htaccess');
      const frontendNodejsDir = path.join(frontendDir, 'nodejs');
      
      if (fs.existsSync(frontendHtaccess)) {
        fs.copyFileSync(frontendHtaccess, path.join(publicHtmlDir, 'copied-frontend-htaccess'));
        console.log('[Diagnostic] Copied frontend .htaccess successfully!');
      } else {
        console.log('[Diagnostic] Frontend .htaccess not found at:', frontendHtaccess);
      }
      
      if (fs.existsSync(frontendNodejsDir)) {
        const frontendFiles = fs.readdirSync(frontendNodejsDir);
        fs.writeFileSync(path.join(publicHtmlDir, 'copied-frontend-files.txt'), frontendFiles.join('\n'));
      }
    }
  } catch (err) {
    // ignore
  }
}

async function bootstrap() {
  // Inject production database credentials dynamically on Hostinger
  if (__dirname.includes('u163598660')) {
    process.env.DATABASE_URL = 'mysql://u163598660_apisales:Happydiwali123%23@127.0.0.1:3306/u163598660_apisales';
  }

  // Automatically generate Prisma Client and apply migrations on startup
  const schemaPath = path.join(__dirname, '../../../packages/db/prisma/schema.prisma');
  const prismaCliPath = path.join(__dirname, '../../../packages/db/node_modules/prisma/build/index.js');
  console.log('[Prisma Bootstrap] Checking schema at:', schemaPath);
  if (fs.existsSync(schemaPath) && fs.existsSync(prismaCliPath)) {
    try {
      console.log('[Prisma Bootstrap] Generating Prisma client...');
      execSync(`"${process.execPath}" "${prismaCliPath}" generate --schema="${schemaPath}"`, { stdio: 'inherit' });
      console.log('[Prisma Bootstrap] Prisma client generated successfully.');

      console.log('[Prisma Bootstrap] Applying database migrations...');
      execSync(`"${process.execPath}" "${prismaCliPath}" migrate deploy --schema="${schemaPath}"`, { stdio: 'inherit' });
      console.log('[Prisma Bootstrap] Database migrations applied successfully.');
      copyLogs(); // Copy logs after successful migration
    } catch (error) {
      console.error('[Prisma Bootstrap] Error during Prisma setup:', error);
      copyLogs(); // Copy logs after failure
    }
  } else {
    console.log('[Prisma Bootstrap] Schema or Prisma CLI file not found. Skipping auto-setup.');
  }

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors();
  app.setGlobalPrefix('api');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
  copyLogs(); // Copy logs after app starts successfully
}
bootstrap();

