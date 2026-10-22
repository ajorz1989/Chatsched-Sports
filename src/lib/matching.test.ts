import { describe, expect, it } from "vitest";
import { scoreOpportunityMatch } from "./matching";
import type { AthleteMatchProfile, Opportunity } from "./types";

const opportunity: Opportunity = {
  id: "fixture-trial",
  title: "Senior Football Trial",
  type: "trial",
  sport: "Football",
  positions: ["Striker", "Winger"],
  organisation: "Example Club",
  location: "Cape Town",
  country: "South Africa",
  level: "Senior",
  summary: "Illustrative sample only.",
  verificationStatus: "pending",
  demo: true,
};

describe("scoreOpportunityMatch", () => {
  it("awards the highest match score when every declared criterion aligns", () => {
    const athlete: AthleteMatchProfile = {
      sport: "football",
      position: "striker",
      location: "Cape Town",
      level: "Senior",
      goals: ["trial"],
    };
    const result = scoreOpportunityMatch(athlete, opportunity);
    expect(result.score).toBe(100);
    expect(result.reasons).toHaveLength(5);
  });

  it("uses transparent partial scores when only sport matches", () => {
    const result = scoreOpportunityMatch({ sport: "Football", position: "Keeper" }, opportunity);
    expect(result.score).toBe(40);
    expect(result.reasons).toEqual(["Sport matches your profile"]);
  });

  it("returns no match points for a different sport and reports no fabricated reasons", () => {
    const result = scoreOpportunityMatch({ sport: "Swimming", position: "Freestyle" }, opportunity);
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("caps the score at 100 and uses case-insensitive sport and position comparison", () => {
    const result = scoreOpportunityMatch({
      sport: "FOOTBALL",
      position: "STRIKER",
      location: "Cape Town",
      level: "Senior",
      goals: ["trial", "trial"],
    }, opportunity);
    expect(result.score).toBe(100);
  });

  it("does not penalise missing optional criteria beyond their unearned points", () => {
    const result = scoreOpportunityMatch({ sport: "Football" }, opportunity);
    expect(result.score).toBe(40);
    expect(result.reasons).toEqual(["Sport matches your profile"]);
  });
});
