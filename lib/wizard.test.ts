import { describe, expect, it } from "vitest";
import { wizardStep } from "./types";

describe("wizardStep", () => {
  it("routes draft to the goal analysis step", () => {
    expect(wizardStep("draft")).toBe("analysis");
  });
  it("routes researching to channel selection", () => {
    expect(wizardStep("researching")).toBe("channels");
  });
  it("routes reviewing to the plan preview", () => {
    expect(wizardStep("reviewing")).toBe("review");
  });
  it("routes active and archived to the dashboard", () => {
    expect(wizardStep("active")).toBe("dashboard");
    expect(wizardStep("archived")).toBe("dashboard");
  });
});
