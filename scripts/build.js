#!/usr/bin/env node

import { existsSync, rmSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'fs';
import path, { resolve, join } from 'path';
import { execSync } from 'child_process';

// const PROJECT_ROOT = resolve(path.dirname(), '..');
const PROJECT_ROOT = '.';
const SRC_DIR = join(PROJECT_ROOT, 'src');
const DIST_DIR = join(PROJECT_ROOT, 'dist');

console.log('Building cVim TypeScript project...');

// Clean dist directory
if (existsSync(DIST_DIR)) {
  rmSync(DIST_DIR, { recursive: true, force: true });
}

// Compile TypeScript
console.log('Compiling TypeScript...');
try {
  execSync('pnpm exec tsc', { cwd: PROJECT_ROOT, stdio: 'inherit' });
} catch (error) {
  console.error('TypeScript compilation failed');
  process.exit(1);
}

// Copy non-TypeScript files
console.log('Copying assets...');

// Copy CSS files
// const cssFiles = [
//   'content_scripts/main.css'
// ];
//
// cssFiles.forEach(file => {
//   const srcPath = path.join(PROJECT_ROOT, 'src'. file);
//   const distPath = path.join(DIST_DIR, file);
//
//   if (fs.existsSync(srcPath)) {
//     const distDir = path.dirname(distPath);
//     if (!fs.existsSync(distDir)) {
//       fs.mkdirSync(distDir, { recursive: true });
//     }
//     fs.copyFileSync(srcPath, distPath);
//     console.log(`Copied ${file}`);
//   }
// });

// Copy pages directory
const pagesDir = join(PROJECT_ROOT, 'src/pages');
const distPagesDir = join(DIST_DIR, 'pages');

if (existsSync(pagesDir)) {
  function copyDirectory(src, dest) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    
    const items = readdirSync(src);
    for (const item of items) {
      const srcPath = join(src, item);
      const destPath = join(dest, item);
      
      if (statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDirectory(pagesDir, distPagesDir);
  console.log('Copied pages directory');
}

// Copy icons
const iconsDir = join(PROJECT_ROOT, 'icons');
const distIconsDir = join(DIST_DIR, 'icons');

if (existsSync(iconsDir)) {
  function copyDirectory(src, dest) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    
    const items = readdirSync(src);
    for (const item of items) {
      const srcPath = join(src, item);
      const destPath = join(dest, item);
      
      if (statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDirectory(iconsDir, distIconsDir);
  console.log('Copied icons directory');
}

// Copy pages directory
const contentScriptsDir = join(PROJECT_ROOT, 'src/content_scripts');
const distContentScriptsDir = join(DIST_DIR, 'content_scripts');

if (existsSync(contentScriptsDir)) {
  function copyDirectory(src, dest) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    
    const items = readdirSync(src);
    for (const item of items) {
      const srcPath = join(src, item);
      const destPath = join(dest, item);
      
      if (statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDirectory(contentScriptsDir, distContentScriptsDir);
  console.log('Copied content_scripts directory');
}

// Copy other necessary files
const filesToCopy = [
  'cmdline_frame.html',
  'cmdline_frame.js'
];

filesToCopy.forEach(file => {
  const srcPath = join(PROJECT_ROOT, file);
  const distPath = join(DIST_DIR, file);
  
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, distPath);
    console.log(`Copied ${file}`);
  }
});

// Copy manifest.json to dist
const manifestSrc = join(PROJECT_ROOT, 'manifest.json');
const manifestDist = join(DIST_DIR, 'manifest.json');

if (existsSync(manifestSrc)) {
  copyFileSync(manifestSrc, manifestDist);
  console.log('Copied manifest.json');
}

console.log('Build completed successfully!');
