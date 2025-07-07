import { resolve } from 'path';
import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';

const isProduction = process.env.NODE_ENV === 'production';

const sharedPlugins = [
  nodeResolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    sourceMap: !isProduction,
    inlineSources: !isProduction,
    declaration: false,
    declarationMap: false
  })
];

// Individual content script files to match manifest structure
const contentScriptFiles = [
  'session',
  'utils', 
  'dom',
  'hints',
  'bookmarks',
  'command',
  'keys',
  'clipboard',
  'complete',
  'mappings',
  'find',
  'cursor',
  'status',
  'hud',
  'visual',
  'scroll',
  'search',
  'frames',
  'messenger'
];

export default [
  // Service Worker (Background Script)
  {
    input: 'src/background_scripts/service-worker.ts',
    output: {
      file: 'dist/background_scripts/service-worker.js',
      format: 'esm',
      sourcemap: !isProduction
    },
    plugins: [
      del({ targets: 'dist/*' }),
      ...sharedPlugins
    ]
  },

  // Individual Content Scripts (not bundled)
  ...contentScriptFiles.map(name => ({
    input: `src/content_scripts/${name}.ts`,
    output: {
      file: `dist/content_scripts/${name}.js`,
      format: 'iife',
      sourcemap: !isProduction,
      name: `CVim_${name}`
    },
    plugins: [
      ...sharedPlugins
    ]
  })),

  // Options Page
  {
    input: 'src/pages/options.ts',
    output: {
      file: 'dist/pages/options.js',
      format: 'iife',
      sourcemap: !isProduction
    },
    plugins: [
      ...sharedPlugins
    ]
  },

  // Popup Page
  {
    input: 'src/pages/popup.ts',
    output: {
      file: 'dist/pages/popup.js',
      format: 'iife',
      sourcemap: !isProduction
    },
    plugins: [
      ...sharedPlugins,
      
      // Copy static assets
      copy({
        targets: [
          // Copy HTML files
          { src: 'src/pages/*.html', dest: 'dist/pages' },
          
          // Copy CSS files
          { src: 'src/pages/*.css', dest: 'dist/pages' },
          { src: 'src/content_scripts/*.css', dest: 'dist/content_scripts' },
          { src: 'src/background_scripts/*.css', dest: 'dist/background_scripts' },
          
          // Copy codemirror assets
          { src: 'src/pages/codemirror', dest: 'dist/pages' },
          
          // Copy icons
          { src: 'icons', dest: 'dist' },
          
          // Copy other assets
          { src: 'cmdline_frame.html', dest: 'dist' },
          { src: 'cmdline_frame.js', dest: 'dist' },
          
          // Copy parser output (JavaScript file, not TypeScript)
          { src: 'src/content_scripts/cvimrc_parser.js', dest: 'dist/content_scripts' }
        ]
      })
    ]
  }
];