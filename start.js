const { spawn, execSync } = require('child_process');
const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
 
const appType = process.env.APP_TYPE || 'web';
const port = process.env.PORT || '3000';
 
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
  const child = spawn(process.execPath, ['dist/main.js'], { stdio: 'inherit' });
  child.on('close', (code) => process.exit(code));
} else {
  console.log('[Startup Router] Starting Next.js programmatically...');
  const nextPath = path.join(__dirname, 'apps/web/node_modules/next');
  const next = require(nextPath);
  const dev = false;
  const hostname = 'localhost';
  const parsedPort = parseInt(port, 10);

  const app = next({ dev, hostname, port: parsedPort, dir: path.join(__dirname, 'apps/web') });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('[Next] Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }).listen(parsedPort, () => {
      console.log(`[Startup Router] Next.js is ready on port ${parsedPort}`);
    });
  }).catch(err => {
    console.error('[Startup Router] Next.js prepare failed:', err);
    process.exit(1);
  });
}
