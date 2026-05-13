import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/contact", "/legal/", "/help"],
        disallow: [
          "/signin",
          "/dashboard",
          "/jobs",
          "/customers",
          "/invoices",
          "/calendar",
          "/requests",
          "/settings",
          "/feature-board",
          "/team",
          "/time",
          "/onboarding",
          "/admin",
          "/api/",
        ],
      },
    ],
    sitemap: "https://verityflow.io/sitemap.xml",
  };
}
