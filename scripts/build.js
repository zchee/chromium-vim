#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

console.log('Building cVim TypeScript project...');

// Clean dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}

// Compile TypeScript
console.log('Compiling TypeScript...');
try {
  execSync('npx tsc', { cwd: PROJECT_ROOT, stdio: 'inherit' });
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
const pagesDir = path.join(PROJECT_ROOT, 'src/pages');
const distPagesDir = path.join(DIST_DIR, 'pages');

if (fs.existsSync(pagesDir)) {
  function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDirectory(pagesDir, distPagesDir);
  console.log('Copied pages directory');
}

// Copy icons
const iconsDir = path.join(PROJECT_ROOT, 'icons');
const distIconsDir = path.join(DIST_DIR, 'icons');

if (fs.existsSync(iconsDir)) {
  function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDirectory(iconsDir, distIconsDir);
  console.log('Copied icons directory');
}

// Copy pages directory
const contentScriptsDir = path.join(PROJECT_ROOT, 'src/content_scripts');
const distContentScriptsDir = path.join(DIST_DIR, 'content_scripts');

if (fs.existsSync(contentScriptsDir)) {
  function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
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
  const srcPath = path.join(PROJECT_ROOT, file);
  const distPath = path.join(DIST_DIR, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, distPath);
    console.log(`Copied ${file}`);
  }
});

// Copy manifest.json to dist
const manifestSrc = path.join(PROJECT_ROOT, 'manifest.json');
const manifestDist = path.join(DIST_DIR, 'manifest.json');

if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDist);
  console.log('Copied manifest.json');
}

console.log('Build completed successfully!');
