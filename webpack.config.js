const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const PATHS = {
  src: path.join(__dirname),
  dist: path.join(__dirname, '/dist')
}

module.exports = {
  mode: 'production',
  entry: {
    main: PATHS.src + '/src/cmdline_frame.js'
  },
  output: {
    path: PATHS.dist,
    filename: 'cmdline_frame.js'
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/',
          to: '.'
        },
        {
          from: 'background_scripts/',
          to: 'background_scripts/'
        },
        {
          from: 'content_scripts/',
          to: 'content_scripts/'
        },
        {
          from: 'pages/',
          to: 'pages/'
        },
        {
          from: 'node_modules/codemirror/lib/codemirror.js',
          to: 'pages/codemirror/[name].[ext]'
        },
        {
          from: 'node_modules/codemirror/lib/codemirror.css',
          to: 'pages/codemirror/[name].[ext]'
        },
        {
          from: 'node_modules/codemirror/mode/css/css.js',
          to: 'pages/codemirror/[name].[ext]'
        },
        {
          from: 'node_modules/codemirror/keymap/vim.js',
          to: 'pages/codemirror/[name].[ext]'
        },
        {
          from: 'node_modules/codemirror/LICENSE',
          to: 'pages/codemirror/[name]'
        },
      ],
    }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true,
      }),
    ],
  },
};
