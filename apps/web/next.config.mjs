/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Proxy API requests through Next.js to avoid browser-side blocking/CORS issues
    // when running the dashboard on subdomains like bank1.localhost:3001.
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
