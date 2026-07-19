import type { MetadataRoute } from "next";

// Every public page, nothing else — authed routes just redirect crawlers to /login.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.launchlift.app";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/subreddit-finder`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
