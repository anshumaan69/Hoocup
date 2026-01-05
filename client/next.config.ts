import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

};
module.exports={
  async rewrites(){
    return[{
      source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*', // Proxy to your Node Backend
    }]
  }
}

export default nextConfig;
