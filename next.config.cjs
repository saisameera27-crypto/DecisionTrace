/** @type {import('next').NextConfig} */
const nextConfig = {
  // Path aliases are configured in tsconfig.json
  // Next.js 13+ automatically reads path aliases from tsconfig.json
  
  // Disable ESLint during builds to avoid config conflicts
  // Linting is handled separately via npm run lint
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build (type checking done separately)
  typescript: {
    ignoreBuildErrors: false, // Keep type checking enabled
  },
};

module.exports = nextConfig;

