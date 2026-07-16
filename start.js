const { spawn, execSync } = require('child_process');
const path = require('path');
 
const appType = process.env.APP_TYPE || 'web';
const port = process.env.PORT || '3000';
 
let command = process.execPath;
let args = [];
 
if (appType === 'api') {
  console.log('[Startup Router] Generating Prisma Client for API...');
  try {
    const schemaPath = path.join(__dirname, 'packages/db/prisma/schema.prisma');
    execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
    console.log('[Startup Router] Prisma Client generated successfully!');
    
    console.log('[Startup Router] Applying database migrations...');
    execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, { stdio: 'inherit' });
    console.log('[Startup Router] Database migrations applied successfully!');
  } catch (error) {
    console.error('[Startup Router] Prisma Client generation or migration failed:', error);
    process.exit(1);
  }
  args = ['dist/main.js'];
} else {
  // Correct path: Next.js is installed inside the apps/web directory
  args = ['apps/web/node_modules/next/dist/bin/next', 'start', '-p', String(port)];
}
 
const child = spawn(command, args, { stdio: 'inherit' });
 
child.on('close', (code) => process.exit(code));
