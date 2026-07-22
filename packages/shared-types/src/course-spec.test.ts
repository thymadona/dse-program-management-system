import { expect, test } from "bun:test";
import { CloMappingItem, SltSection, SPEC_SECTION_SCHEMAS, rowTotal, perCloSlt, sltSectionTotals } from "./course-spec.ts";
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

const emptyCells = {
  physical: {}, online: {}, independent: {},
};

test("SltSection defaults each row group to []", () => {
  const parsed = SltSection.parse({});
  expect(parsed.content).toEqual([]);
  expect(parsed.continuous).toEqual([]);
  expect(parsed.final).toEqual([]);
});

test("SltSection coerces string hour cells to ints and fills missing cells", () => {
  const parsed = SltSection.parse({
    content: [{ id: "t1", title: "Topic 1", cloCode: "CLO1", cells: { physical: { L: "2" }, online: {}, independent: { P: "2" } } }],
  });
  expect(parsed.content[0]!.cells.physical.L).toBe(2);
  expect(parsed.content[0]!.cells.independent.P).toBe(2);
  expect(parsed.content[0]!.cloCode).toBe("CLO1");
});

test("SltSection rejects hour cells out of range", () => {
  const bad = { content: [{ id: "t1", title: "x", cloCode: null, cells: { ...emptyCells, physical: { L: 1001 } } }] };
  expect(SltSection.safeParse(bad).success).toBe(false);
});

test("SltAssessmentRow weight is optional and bounded 0-100", () => {
  const ok = SltSection.parse({ final: [{ id: "a1", title: "Report", weight: 40, cells: emptyCells }] });
  expect(ok.final[0]!.weight).toBe(40);
  const bad = { final: [{ id: "a1", title: "Report", weight: 101, cells: emptyCells }] };
  expect(SltSection.safeParse(bad).success).toBe(false);
});

test("slt is registered in SPEC_SECTION_SCHEMAS", () => {
  expect(SPEC_SECTION_SCHEMAS.slt).toBe(SltSection);
});

const cells = (o: Record<string, Record<string, number>>) =>
  SltSection.parse({ content: [{ id: "x", title: "x", cloCode: null, cells: o }] }).content[0]!.cells;

test("rowTotal sums every cell across modes and activities", () => {
  expect(rowTotal(cells({ physical: { L: 2, P: 2 }, online: { L: 1 }, independent: { O: 3 } }))).toBe(8);
});

test("perCloSlt groups content hours by cloCode and ignores rows without a CLO", () => {
  const section = SltSection.parse({
    content: [
      { id: "1", title: "A", cloCode: "CLO1", cells: { physical: { L: 4 } } },
      { id: "2", title: "B", cloCode: "CLO1", cells: { physical: { L: 2 } } },
      { id: "3", title: "C", cloCode: "CLO2", cells: { physical: { L: 6 } } },
      { id: "4", title: "D", cloCode: null, cells: { physical: { L: 9 } } },
    ],
  });
  expect(perCloSlt(section.content)).toEqual({ CLO1: 6, CLO2: 6 });
});

test("sltSectionTotals cascades content, continuous, final into grand total", () => {
  const section = SltSection.parse({
    content: [{ id: "1", title: "A", cloCode: "CLO1", cells: { physical: { L: 10 } } }],
    continuous: [{ id: "c1", title: "Quiz", weight: 20, cells: { independent: { O: 4 } } }],
    final: [{ id: "f1", title: "Report", weight: 40, cells: { independent: { O: 6 } } }],
  });
  expect(sltSectionTotals(section)).toEqual({
    contentTotal: 10, continuousTotal: 4, finalTotal: 6, assessmentTotal: 10, grandTotal: 20,
  });
});
