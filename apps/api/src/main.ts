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
        
        // Dynamically modify frontend htaccess to run on Node 20 (fixing runtime crash) while allowing Node 22 builds
        try {
          let htaccessContent = fs.readFileSync(frontendHtaccess, 'utf8');
          if (htaccessContent.includes('alt-nodejs22')) {
            htaccessContent = htaccessContent.replace('alt-nodejs22', 'alt-nodejs20');
            fs.writeFileSync(frontendHtaccess, htaccessContent);
            console.log('[Diagnostic] Frontend .htaccess successfully modified to use Node 20 runtime!');
          }
        } catch (htaccessErr) {
          console.error('[Diagnostic] Failed to modify frontend htaccess:', htaccessErr);
        }
      } else {
        console.log('[Diagnostic] Frontend .htaccess not found at:', frontendHtaccess);
      }
      
      if (fs.existsSync(frontendNodejsDir)) {
        const frontendFiles = fs.readdirSync(frontendNodejsDir);
        fs.writeFileSync(path.join(publicHtmlDir, 'copied-frontend-files.txt'), frontendFiles.join('\n'));
        
        const frontendStderr = path.join(frontendNodejsDir, 'stderr.log');
        const frontendConsole = path.join(frontendNodejsDir, 'console.log');
        const frontendStartJs = path.join(frontendNodejsDir, 'start.js');
        if (fs.existsSync(frontendStderr)) {
          fs.copyFileSync(frontendStderr, path.join(publicHtmlDir, 'copied-frontend-stderr.log'));
        }
        if (fs.existsSync(frontendConsole)) {
          fs.copyFileSync(frontendConsole, path.join(publicHtmlDir, 'copied-frontend-console.log'));
        }
        if (fs.existsSync(frontendStartJs)) {
          fs.copyFileSync(frontendStartJs, path.join(publicHtmlDir, 'copied-frontend-start.js'));
        }

        // Run git pull for the frontend directory to update the source files
        try {
          console.log('[Diagnostic] Syncing frontend git...');
          const gitLog = execSync('git pull origin master', { 
            cwd: frontendNodejsDir,
            encoding: 'utf8'
          });
          
          // Copy compiled .next directory from successful Hostinger build source folder to active Node.js folder
          const srcNext = '/home/u163598660/domains/sales.granthinfotech.in/public_html/.builds/source/repository/apps/web/.next';
          const destNext = '/home/u163598660/domains/sales.granthinfotech.in/nodejs/apps/web/.next';
          
          let buildLog = '';
          if (fs.existsSync(srcNext)) {
            console.log(`[Diagnostic] Copying compiled .next from ${srcNext} to ${destNext}...`);
            execSync(`rm -rf "${destNext}"`);
            execSync(`cp -r "${srcNext}" "${destNext}"`);
            buildLog = `Successfully copied compiled .next folder from source/repository!`;
          } else {
            buildLog = `Compiled .next folder not found at: ${srcNext}`;
          }
          
          fs.writeFileSync(path.join(publicHtmlDir, 'copied-frontend-git.log'), `${gitLog}\n\nBuild Log:\n${buildLog}`);
          console.log('[Diagnostic] Frontend git pulled and build copied successfully.');
        } catch (gitErr) {
          fs.writeFileSync(path.join(publicHtmlDir, 'copied-frontend-git.log'), `Git pull/build failed:\n${gitErr.message}\n${gitErr.stderr || ''}`);
        }

        // Diagnostic: List alt nodejs versions
        try {
          if (fs.existsSync('/opt/alt')) {
            const versions = fs.readdirSync('/opt/alt');
            fs.writeFileSync(path.join(publicHtmlDir, 'copied-alt-versions.txt'), versions.join('\n'));
          }
        } catch (err) {
          // ignore
        }

        // Diagnostic: Copy frontend build logs if they exist
        try {
          const frontendBuildsDir = '/home/u163598660/domains/sales.granthinfotech.in/public_html/.builds/logs';
          if (fs.existsSync(frontendBuildsDir)) {
            const buildDirs = fs.readdirSync(frontendBuildsDir);
            fs.writeFileSync(path.join(publicHtmlDir, 'copied-frontend-builds-list.txt'), buildDirs.join('\n'));
            
            // Look for the latest build directory and copy its log
            if (buildDirs.length > 0) {
              const latestBuildDirName = buildDirs.sort().pop();
              if (latestBuildDirName) {
                const latestBuildPath = path.join(frontendBuildsDir, latestBuildDirName);
                const logFiles = fs.readdirSync(latestBuildPath);
                const logFile = logFiles.find(f => f.endsWith('.log'));
                if (logFile) {
                  fs.copyFileSync(path.join(latestBuildPath, logFile), path.join(publicHtmlDir, 'copied-frontend-build-failed.log'));
                }
              }
            }
          }
        } catch (err) {
          // ignore
        }

        // Diagnostic: List nodejs22 bin files
        try {
          const node22BinDir = '/opt/alt/alt-nodejs22/root/bin';
          if (fs.existsSync(node22BinDir)) {
            const binFiles = fs.readdirSync(node22BinDir);
            fs.writeFileSync(path.join(publicHtmlDir, 'copied-nodejs22-bin.txt'), binFiles.join('\n'));
          }
        } catch (err) {
          // ignore
        }

        // Diagnostic: Find .next directory inside latest frontend build
        try {
          const frontendBuildsLogsDir = '/home/u163598660/domains/sales.granthinfotech.in/public_html/.builds/logs';
          if (fs.existsSync(frontendBuildsLogsDir)) {
            const buildDirs = fs.readdirSync(frontendBuildsLogsDir);
            if (buildDirs.length > 0) {
              const latestBuildName = buildDirs.sort().pop();
              if (latestBuildName) {
                const latestBuildPath = path.join(frontendBuildsLogsDir, latestBuildName);
                
                // Helper function to recursively find .next directories
                const findDirs = (dir: string, depth = 0): string[] => {
                  if (depth > 5) return [];
                  let results: string[] = [];
                  try {
                    const list = fs.readdirSync(dir);
                    list.forEach(file => {
                      const fullPath = path.join(dir, file);
                      if (fs.statSync(fullPath).isDirectory()) {
                        if (file === '.next') {
                          results.push(fullPath);
                        } else {
                          results = results.concat(findDirs(fullPath, depth + 1));
                        }
                      }
                    });
                  } catch (e) {}
                  return results;
                };
                
                const nextDirsFound = findDirs(latestBuildPath);
                fs.writeFileSync(path.join(publicHtmlDir, 'copied-frontend-next-dirs-found.txt'), nextDirsFound.join('\n'));
              }
            }
          }
        } catch (err) {
          // ignore
        }
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
      
      // One-time Database Seeding
      const publicHtmlDir = path.join(__dirname, '../../../../public_html');
      const seededFlagPath = path.join(publicHtmlDir, 'seeded.txt');
      if (!fs.existsSync(seededFlagPath)) {
        try {
          console.log('[Prisma Bootstrap] Seeding database...');
          const seedJsPath = path.join(__dirname, '../../../packages/db/dist/prisma/seed.js');
          if (fs.existsSync(seedJsPath)) {
            execSync(`"${process.execPath}" "${seedJsPath}"`, { stdio: 'inherit' });
            fs.writeFileSync(seededFlagPath, 'Seeded successfully on ' + new Date().toISOString());
            console.log('[Prisma Bootstrap] Database seeded successfully.');
          } else {
            console.warn('[Prisma Bootstrap] Seed script not found at:', seedJsPath);
          }
        } catch (seedErr) {
          console.error('[Prisma Bootstrap] Seeding failed:', seedErr);
        }
      }
      
      copyLogs(); // Copy logs after successful migration and seed
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
  setTimeout(() => {
    copyLogs(); // Copy logs asynchronously in the background after app starts
  }, 5000);
}
bootstrap();

