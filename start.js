const { spawn } = require('child_process');
 
const appType = process.env.APP_TYPE || 'web';
const port = process.env.PORT || '3000';
 
let command = process.execPath;
let args = [];
 
if (appType === 'api') {
  args = ['dist/main.js'];
} else {
  // Correct path: Next.js is installed inside the apps/web directory
  args = ['apps/web/node_modules/next/dist/bin/next', 'start', '-p', String(port)];
}
 
const child = spawn(command, args, { stdio: 'inherit' });
 
child.on('close', (code) => process.exit(code));
