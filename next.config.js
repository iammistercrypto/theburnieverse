// next.config.js
/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  // Use an absolute path so Vercel doesn't warn
  outputFileTracingRoot: process.cwd(),

  // Keep your local dev origins (only used by your code/headers)
  allowedDevOrigins: ['http://localhost:3000', 'http://192.168.1.14:3000'],

  // Skip ESLint during production builds (we can re-enable later)
  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,HEAD,PUT,PATCH,POST,DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },

  webpack: (config, { dev }) => {
    // Force Lit into production mode in non-dev builds
    if (!dev && isProd) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'globalThis.litDevMode': JSON.stringify(false),
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
