/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/admin/message-center",
        destination: "/admin/dashboard/message-center",
        permanent: true,
      },
    ];
  },
  serverExternalPackages: ['pdfkit'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.vimeocdn.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '**.youtube.com',
      },
    ],
  },
};

module.exports = nextConfig;
