import { expect, test } from "bun:test";
import { CloMappingItem } from "./course-spec.ts";
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
