/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    // allow your Squarespace site to embed app.de-classifai.com in an <iframe>
    value:
      "frame-ancestors 'self' https://de-classifai.com https://www.de-classifai.com https://*.squarespace.com;",
  },
  // IMPORTANT: do NOT set X-Frame-Options anywhere; CSP above replaces it
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;