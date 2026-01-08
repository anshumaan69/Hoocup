// Helper to normalize the API URL for both local and deployment environments
const getApiUrl = () => {
  // 1. Get the URL from env or default to localhost
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  
  // 2. Remove trailing slash if present
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  // 3. SPECIAL HANDLING: If the user provided a URL ending in '/auth', strip it.
  // This allows the user to paste their Render URL ".../api/auth" directly
  // while still enabling us to reach ".../api/admin" siblings.
  if (url.endsWith('/auth')) {
    url = url.slice(0, -5); // Remove '/auth'
  }

  // 4. Ensure it ends with '/api' (unless it already does)
  // This handles cases where user might have just given the domain root.
  if (!url.endsWith('/api')) {
    url += '/api';
  }

  return url;
};

const nextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async rewrites() {
    const destinationUrl = getApiUrl();

    return [
      {
        source: '/api/:path*',
        destination: `${destinationUrl}/:path*`, // Proxy to Backend Root
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
