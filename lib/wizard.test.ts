import { describe, expect, it } from "vitest";
import { wizardStep } from "./types";
import { goalSeed } from "./wizard";

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

describe("goalSeed", () => {
  // The exact composition the campaign list and dashboard render — the duplicate flow
  // seeds the intake with it, so the user must recognise it from their own dashboard.
  it("composes objective, target and timeframe into one goal line", () => {
    expect(
      goalSeed({
        objective: "Acquire users",
        target_value: "100",
        target_metric: "signups",
        timeframe: "30 days",
      }),
    ).toBe("Acquire users — 100 signups — in 30 days");
  });

  it("drops the target when either half is missing — never renders a dangling number", () => {
    expect(
      goalSeed({ objective: "Acquire users", target_value: "100", target_metric: "", timeframe: "" }),
    ).toBe("Acquire users");
  });

  it("falls back to the objective alone", () => {
    expect(
      goalSeed({ objective: "Grow the newsletter", target_value: "", target_metric: "", timeframe: "" }),
    ).toBe("Grow the newsletter");
  });
});
