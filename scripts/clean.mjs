import { rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
rmSync('package-out', { recursive: true, force: true });
console.log('cleaned dist/ and package-out/');
