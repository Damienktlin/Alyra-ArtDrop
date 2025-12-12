import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Externaliser les packages problématiques
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // Ignorer les fichiers de test
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /node_modules\/thread-stream\/(test|bench)/,
      use: 'null-loader',
    });
    
    return config;
  },
  serverExternalPackages: ['pino', 'pino-pretty'],
};

export default nextConfig;
