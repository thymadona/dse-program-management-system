import { expect, test } from "bun:test";
import { CloMappingItem, WeeklyPlanSection, SPEC_SECTION_SCHEMAS, weekSlt, weeklyPlanTotals } from "./course-spec.ts";
import { CreateMethodInput } from "./methods.ts";

test("CloMappingItem defaults method id arrays to []", () => {
  const parsed = CloMappingItem.parse({ cloCode: "CLO1" });
  expect(parsed.teachingMethodIds).toEqual([]);
  expect(parsed.assessmentMethodIds).toEqual([]);
});

test("CloMappingItem preserves provided method ids", () => {
  const parsed = CloMappingItem.parse({
    cloCode: "CLO1",
    teachingMethodIds: ["a", "b"],
    assessmentMethodIds: ["c"],
  });
  expect(parsed.teachingMethodIds).toEqual(["a", "b"]);
  expect(parsed.assessmentMethodIds).toEqual(["c"]);
});

test("CreateMethodInput trims name and rejects blank", () => {
  expect(CreateMethodInput.parse({ name: "  Lecture  " }).name).toBe("Lecture");
  expect(CreateMethodInput.safeParse({ name: "   " }).success).toBe(false);
});

test("WeeklyPlanSection defaults weeks to []", () => {
  const parsed = WeeklyPlanSection.parse({});
  expect(parsed.weeks).toEqual([]);
});

test("WeeklyPlanSection coerces string hours and defaults array/optional fields", () => {
  const parsed = WeeklyPlanSection.parse({
    weeks: [{ id: "w1", week: "1", topic: "Intro", contactHours: "2", selfStudyHours: "3" }],
  });
  const w = parsed.weeks[0]!;
  expect(w.week).toBe(1);
  expect(w.contactHours).toBe(2);
  expect(w.selfStudyHours).toBe(3);
  expect(w.cloCodes).toEqual([]);
  expect(w.activities).toEqual([]);
  expect(w.assessment).toBe("");
});

test("WeeklyPlanRow keeps linked CLOs and activities, hours default to null", () => {
  const parsed = WeeklyPlanSection.parse({
    weeks: [{ id: "w1", week: 2, topic: "EDA", cloCodes: ["CLO1"], activities: ["Lecture", "Lab Exercise"] }],
  });
  const w = parsed.weeks[0]!;
  expect(w.cloCodes).toEqual(["CLO1"]);
  expect(w.activities).toEqual(["Lecture", "Lab Exercise"]);
  expect(w.contactHours).toBeNull();
  expect(w.selfStudyHours).toBeNull();
});

test("WeeklyPlanSection rejects hours out of range and non-positive weeks", () => {
  expect(WeeklyPlanSection.safeParse({ weeks: [{ id: "w1", week: 1, contactHours: 201 }] }).success).toBe(false);
  expect(WeeklyPlanSection.safeParse({ weeks: [{ id: "w1", week: 0 }] }).success).toBe(false);
});

test("weekSlt sums contact + self-study, treating nulls as 0", () => {
  expect(weekSlt({ contactHours: 2, selfStudyHours: 3 })).toBe(5);
  expect(weekSlt({ contactHours: 2, selfStudyHours: null })).toBe(2);
  expect(weekSlt({})).toBe(0);
});

test("weeklyPlanTotals sums contact, self-study, and derived SLT over all weeks", () => {
  const section = WeeklyPlanSection.parse({
    weeks: [
      { id: "1", week: 1, contactHours: 2, selfStudyHours: 3 },
      { id: "2", week: 2, contactHours: 2, selfStudyHours: 6 },
    ],
  });
  expect(weeklyPlanTotals(section)).toEqual({ contactHours: 4, selfStudyHours: 9, slt: 13 });
});

test("slt is registered in SPEC_SECTION_SCHEMAS as the weekly plan", () => {
  expect(SPEC_SECTION_SCHEMAS.slt).toBe(WeeklyPlanSection);
});
