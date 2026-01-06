import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
  },
  webpack: (config, { isServer }) => {
    // Ignore React Native modules that MetaMask SDK tries to import
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'react-native': false,
      };
      
      // Ignore these modules completely
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
