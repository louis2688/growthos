import { describe, expect, it } from "vitest";
import { humanizeAuthError } from "./auth-errors";

describe("humanizeAuthError", () => {
  it("rewrites captcha failures into something actionable", () => {
    expect(humanizeAuthError("captcha protection: request disallowed (invalid-input-response)"))
      .toBe("That verification didn't go through — please try again.");
  });

  it("passes real auth errors through untouched", () => {
    expect(humanizeAuthError("Invalid login credentials")).toBe("Invalid login credentials");
    expect(humanizeAuthError("User already registered")).toBe("User already registered");
  });
});
