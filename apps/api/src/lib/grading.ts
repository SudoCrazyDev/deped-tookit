/**
 * Grade computation per DepEd Order No. 8, s. 2015.
 *
 * Flow per learner, per subject, per quarter:
 *   1. Sum raw scores and highest-possible scores within each component.
 *   2. Percentage Score (PS) = total raw / total highest * 100.
 *   3. Weighted Score (WS)   = PS * component weight.
 *   4. Initial Grade (IG)    = sum of the three weighted scores.
 *   5. Quarterly Grade (QG)  = transmuted IG.
 */

export type WeightProfile =
  | "g1_10_languages_ap_esp"
  | "g1_10_science_math"
  | "g1_10_mapeh_epp_tle"
  | "shs_core"
  | "shs_academic"
  | "shs_tvl_sports_arts";

export type ComponentWeights = {
  /** Written Work */
  ww: number;
  /** Performance Tasks */
  pt: number;
  /** Quarterly Assessment */
  qa: number;
};

/** Weights as fractions; each profile sums to 1. */
export const WEIGHTS: Record<WeightProfile, ComponentWeights> = {
  g1_10_languages_ap_esp: { ww: 0.3, pt: 0.5, qa: 0.2 },
  g1_10_science_math: { ww: 0.4, pt: 0.4, qa: 0.2 },
  g1_10_mapeh_epp_tle: { ww: 0.2, pt: 0.6, qa: 0.2 },
  shs_core: { ww: 0.25, pt: 0.5, qa: 0.25 },
  shs_academic: { ww: 0.25, pt: 0.45, qa: 0.3 },
  shs_tvl_sports_arts: { ww: 0.2, pt: 0.6, qa: 0.2 },
};

export type ComponentTotals = {
  raw: number;
  highestPossible: number;
};

export type QuarterlyBreakdown = {
  percentageScore: ComponentWeights;
  weightedScore: ComponentWeights;
  initialGrade: number;
  quarterlyGrade: number;
};

function percentage({ raw, highestPossible }: ComponentTotals): number {
  // A component with nothing recorded yet contributes 0 rather than NaN.
  if (highestPossible <= 0) return 0;
  return (raw / highestPossible) * 100;
}

/**
 * Transmutes an initial grade to the DepEd Order No. 8, s. 2015 table.
 *
 * The published table is two linear bands: 1.6 IG points per grade point from
 * IG 60 (grade 75) up to IG 100 (grade 100), and 4.0 IG points per grade point
 * from IG 0 (grade 60) up to IG 60. Integer arithmetic on hundredths keeps
 * boundary values like 61.60 off the wrong side of a float comparison.
 */
export function transmute(initialGrade: number): number {
  const hundredths = Math.round(initialGrade * 100);
  if (hundredths >= 10_000) return 100;
  if (hundredths <= 0) return 60;
  if (hundredths >= 6_000) return 75 + Math.floor((hundredths - 6_000) / 160);
  return 60 + Math.floor(hundredths / 400);
}

export function computeQuarterlyGrade(
  profile: WeightProfile,
  totals: { ww: ComponentTotals; pt: ComponentTotals; qa: ComponentTotals },
): QuarterlyBreakdown {
  const w = WEIGHTS[profile];

  const percentageScore = {
    ww: percentage(totals.ww),
    pt: percentage(totals.pt),
    qa: percentage(totals.qa),
  };

  const weightedScore = {
    ww: percentageScore.ww * w.ww,
    pt: percentageScore.pt * w.pt,
    qa: percentageScore.qa * w.qa,
  };

  const initialGrade = round2(weightedScore.ww + weightedScore.pt + weightedScore.qa);

  return {
    percentageScore: mapValues(percentageScore, round2),
    weightedScore: mapValues(weightedScore, round2),
    initialGrade,
    quarterlyGrade: transmute(initialGrade),
  };
}

/** Final subject grade is the average of the four quarters, rounded to a whole number. */
export function computeFinalGrade(quarterlyGrades: number[]): number | null {
  if (quarterlyGrades.length === 0) return null;
  const sum = quarterlyGrades.reduce((a, b) => a + b, 0);
  return Math.round(sum / quarterlyGrades.length);
}

export type Descriptor =
  | "Outstanding"
  | "Very Satisfactory"
  | "Satisfactory"
  | "Fairly Satisfactory"
  | "Did Not Meet Expectations";

export function descriptorFor(grade: number): Descriptor {
  if (grade >= 90) return "Outstanding";
  if (grade >= 85) return "Very Satisfactory";
  if (grade >= 80) return "Satisfactory";
  if (grade >= 75) return "Fairly Satisfactory";
  return "Did Not Meet Expectations";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mapValues(w: ComponentWeights, fn: (n: number) => number): ComponentWeights {
  return { ww: fn(w.ww), pt: fn(w.pt), qa: fn(w.qa) };
}
