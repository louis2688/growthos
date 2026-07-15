import { describe, expect, it } from "vitest";
import { wizardStep } from "./types";

describe("wizardStep", () => {
  it("routes draft to the goal review step", () => {
    expect(wizardStep("draft")).toBe("review");
  });
  it("routes researching to channel selection", () => {
    expect(wizardStep("researching")).toBe("channels");
  });
  it("routes active and archived to the dashboard", () => {
    expect(wizardStep("active")).toBe("dashboard");
    expect(wizardStep("archived")).toBe("dashboard");
  });
});
