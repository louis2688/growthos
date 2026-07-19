import type { MetadataRoute } from "next";

// Crawlers were getting 307 -> /login for robots.txt (Dave's SEO audit, verified live).
// This metadata route plus the proxy allow-list gives them a real file.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authed app surfaces: crawling them just wastes budget on login redirects.
      disallow: ["/campaigns/", "/new", "/toolbox", "/activity", "/settings", "/auth/", "/login"],
    },
    sitemap: "https://www.launchlift.app/sitemap.xml",
  };
}
