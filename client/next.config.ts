const nextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*', // Specific match for auth to align with NEXT_PUBLIC_API_URL containing /api/auth
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/auth'}/:path*`,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};


export default nextConfig;
