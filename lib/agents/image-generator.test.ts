import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { imagePath, renderImage } from "./image-generator";

describe("imagePath", () => {
  it("is deterministic per todo, so a re-run upserts one object", () => {
    expect(imagePath("camp-1", "todo-9")).toBe("camp-1/todo-9.jpg");
    // Same inputs → same path → re-run overwrites rather than accumulating.
    expect(imagePath("camp-1", "todo-9")).toBe(imagePath("camp-1", "todo-9"));
  });
});

describe("renderImage env guard", () => {
  const saved = {
    id: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
  };
  beforeEach(() => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
  });
  afterEach(() => {
    if (saved.id) process.env.CLOUDFLARE_ACCOUNT_ID = saved.id;
    if (saved.token) process.env.CLOUDFLARE_API_TOKEN = saved.token;
  });

  it("throws an actionable message — not a raw fetch error — when creds are missing", async () => {
    // Guard runs before any network call, so this never touches Cloudflare.
    await expect(renderImage("a mug")).rejects.toThrow(/CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN/);
  });
});
