#!/usr/bin/env node

const { spawn } = require('child_process');

// Get all command line arguments after the script name
const args = process.argv.slice(2);

// Create a new process that runs 'npx tempo-cli' with all the arguments
const child = spawn('npx', ['--package=tempo-devtools-cli', 'tempo', ...args], {
  stdio: 'inherit', // Pipe stdin/stdout/stderr to the parent process
  shell: true,
});

// Handle process exit
child.on('close', (code) => {
  process.exit(code);
});

// Handle errors
child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});
