import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        pathname: '/coins/images/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
      {
        protocol: 'https',
        hostname: 'thecurrencyanalytics.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'media.istockphoto.com',
      },
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn1.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'media.licdn.com',
      },
      {
        protocol: 'https',
        hostname: 'miro.medium.com',
      },
      {
        protocol: 'https',
        hostname: 'www.cryptopolitan.com',
      },
      {
        protocol: 'https',
        hostname: 'public.bnbstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'snworksceo.imgix.net',
      },
      {
        protocol: 'https',
        hostname: 'itbrief.com.au',
      },
      {
        protocol: 'https',
        hostname: 'usethebitcoin.com',
      },
      {
        protocol: 'https',
        hostname: 'www.bitira.com',
      },
      {
        protocol: 'https',
        hostname: 'www.cryptocompare.com',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'nowpayments.io',
        pathname: '/images/coins/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
};

export default nextConfig;

