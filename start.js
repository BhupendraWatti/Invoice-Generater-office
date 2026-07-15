const { spawn } = require('child_process');

// Read the APP_TYPE environment variable (default to 'web' for frontend)
const appType = process.env.APP_TYPE || 'web';
const port = process.env.PORT || '3000';

console.log(`[Startup Router] Starting application type: ${appType} on port: ${port}`);

let command = '';
let args = [];

if (appType === 'api') {
  // Start NestJS Backend (using the copied dist folder at the root)
  command = 'node';
  args = ['dist/main.js'];
} else {
  // Start Next.js Frontend
  command = 'npx';
  args = ['next', 'start', '-p', port];
}

const child = spawn(command, args, { stdio: 'inherit', shell: true });

child.on('close', (code) => {
  console.log(`[Startup Router] Process exited with code ${code}`);
  process.exit(code);
});
