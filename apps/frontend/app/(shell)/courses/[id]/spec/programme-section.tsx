"use client";

import {
  AFFECTIVE_LEVELS,
  COGNITIVE_LEVELS,
  FOCUS_LEVELS,
  PROGRAMME_TITLE,
  PSYCHOMOTOR_LEVELS,
} from "@dse-pms/shared-types";
import { ReferenceGuide } from "./reference-guide";

/**
 * Part 1 is programme-level and identical for every course, so it is shown here as
 * read-only reference rather than something the lecturer fills. This step also hosts
 * the Bloom-style level guides the lecturer will reference when writing CLOs (§14).
 */
export function ProgrammeSection() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Programme
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{PROGRAMME_TITLE}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Part 1 (Vision, Mission, Goals, Educational Philosophy, PEOs, and the ten PLOs) is set at
          the programme level and applies to every course — you don&apos;t fill it per course.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Reference guides</p>
        <p className="mb-3 text-xs text-muted-foreground">
          You&apos;ll use these when writing Course Learning Outcomes and their PLO mapping (§14).
          Open each to see what the level codes mean.
        </p>
        <div className="grid gap-3">
          <ReferenceGuide title="Cognitive levels (C1–C6)" rows={[...COGNITIVE_LEVELS]} defaultOpen />
          <ReferenceGuide title="Affective levels (A1–A5)" rows={[...AFFECTIVE_LEVELS]} />
          <ReferenceGuide title="Psychomotor levels (P1–P7)" rows={[...PSYCHOMOTOR_LEVELS]} />
          <ReferenceGuide title="Focus on PLO (F / M / P)" rows={[...FOCUS_LEVELS]} />
        </div>
      </div>
    </div>
  );
}
