import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      // Vanity URLs for ad / podcast attribution — UTM params are passed
      // server-side; the browser address bar shows the clean vanity URL.
      {
        source: "/podcast",
        destination: "/?utm_source=podcast&utm_medium=audio",
      },
      {
        source: "/plumbers",
        destination:
          "/?utm_source=direct&utm_medium=trade&utm_content=plumbers",
      },
      {
        source: "/hvac",
        destination: "/?utm_source=direct&utm_medium=trade&utm_content=hvac",
      },
      {
        source: "/electricians",
        destination:
          "/?utm_source=direct&utm_medium=trade&utm_content=electricians",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
