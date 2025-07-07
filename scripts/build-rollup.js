#!/usr/bin/env node

import { existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = '.';
const DIST_DIR = join(PROJECT_ROOT, 'dist');

console.log('Building cVim with Rollup...');

// Build parser first
console.log('Building cvimrc parser...');
try {
  execSync('cd cvimrc_parser && make', { cwd: PROJECT_ROOT, stdio: 'inherit' });
} catch (error) {
  console.error('Parser build failed');
  process.exit(1);
}

// Copy parser to source directory for bundling
const parserSrc = join(PROJECT_ROOT, 'cvimrc_parser/parser.js');
const parserDest = join(PROJECT_ROOT, 'src/content_scripts/cvimrc_parser.js');

if (existsSync(parserSrc)) {
  copyFileSync(parserSrc, parserDest);
  console.log('Copied parser to content scripts');
}

// Generate pages
console.log('Generating pages...');
try {
  execSync('node scripts/create_pages.js', { cwd: PROJECT_ROOT, stdio: 'inherit' });
} catch (error) {
  console.error('Page generation failed');
  process.exit(1);
}

// Run Rollup build
console.log('Running Rollup build...');
try {
  const rollupCmd = process.env.NODE_ENV === 'production' 
    ? 'pnpm exec rollup -c --environment NODE_ENV:production'
    : 'pnpm exec rollup -c';
    
  execSync(rollupCmd, { cwd: PROJECT_ROOT, stdio: 'inherit' });
} catch (error) {
  console.error('Rollup build failed');
  process.exit(1);
}

// Copy manifest
const manifestSrc = join(PROJECT_ROOT, 'manifest-rollup.json');
const manifestDest = join(DIST_DIR, 'manifest.json');

if (existsSync(manifestSrc)) {
  copyFileSync(manifestSrc, manifestDest);
  console.log('Copied manifest.json to dist');
}

console.log('Rollup build completed successfully!');