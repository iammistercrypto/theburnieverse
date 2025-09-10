// next.config.js
/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  // keep your existing settings
  outputFileTracingRoot: 'C:\\MiniApp\\TheBurnieverse',
  allowedDevOrigins: ['http://localhost:3000', 'http://192.168.1.14:3000'],

  // security / CORS headers as you had them
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

  // 🔧 turn off Lit dev mode in production builds
  webpack: (config, { dev }) => {
    if (!dev) {
      config.plugins.push(
        new webpack.DefinePlugin({
          // Lit checks this global; forcing false removes dev assertions & warning
          'globalThis.litDevMode': JSON.stringify(false),
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
