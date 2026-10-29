/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: [
        'photohub.bitsathy.ac.in',
        '*.bitsathy.ac.in',
        'localhost:3000',
        'localhost:8000',
        'localhost',
        '127.0.0.1:3000',
        '127.0.0.1',
      ],
    },
    proxyClientMaxBodySize: '50mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
    ],
  },
  async rewrites() {
    const internalSupabaseUrl = process.env.SUPABASE_INTERNAL_URL || 'http://kong:8000';
    return [
      {
        source: '/auth/v1/:path*',
        destination: `${internalSupabaseUrl}/auth/v1/:path*`,
      },
      {
        source: '/rest/v1/:path*',
        destination: `${internalSupabaseUrl}/rest/v1/:path*`,
      },
      {
        source: '/storage/v1/:path*',
        destination: `${internalSupabaseUrl}/storage/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
