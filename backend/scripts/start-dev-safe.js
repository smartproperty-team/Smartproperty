const { spawn } = require('child_process');
const env = { ...process.env };
delete env.NODE_OPTIONS;
delete env.VSCODE_INSPECTOR_OPTIONS;
delete env.npm_config_node_options;
delete env.NPM_CONFIG_NODE_OPTIONS;

env.FORCE_COLOR = env.FORCE_COLOR || '1';

const isWindows = process.platform === 'win32';
const command = isWindows ? 'npx.cmd' : 'npx';
const args = ['nest', 'start', '--watch'];

const child = spawn(command, args, {
  stdio: 'inherit',
  env,
  shell: isWindows,
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to start backend in watch mode:', error);
  process.exit(1);
});
