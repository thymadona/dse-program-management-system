"use client";

import { Pencil } from "lucide-react";
import {
  FOCUS_LEVELS,
  SPEC_SECTIONS,
  courseTypeLabel,
  semesterLabel,
  type CourseType,
  type Semester,
  type SpecSectionId,
  type SpecSectionStatus,
} from "@dse-pms/shared-types";
import { Button, CompletionRing } from "@dse-pms/ui";
import type { CourseInfoForm } from "./course-info-section";
import type { CloForm } from "./clos-section";
import type { CloMappingForm } from "./clo-mapping-section";
import type { SltForm } from "./slt-section";
import { ProgrammeSection } from "./programme-section";

const MODES = ["physical", "online", "independent"] as const;
const ACTS = ["L", "T", "P", "O"] as const;

function topicTotal(row: SltForm["content"][number]): number {
  let n = 0;
  for (const mode of MODES) for (const act of ACTS) n += Number(row.cells[mode][act] || 0);
  return n;
}

export function OverviewTab({
  courseInfo,
  clos,
  cloMapping,
  slt,
  status,
  onEditCourseInfo,
  onGoToTab,
}: {
  courseInfo: CourseInfoForm;
  clos: CloForm[];
  cloMapping: CloMappingForm[];
  slt: SltForm;
  status: Record<string, SpecSectionStatus>;
  onEditCourseInfo: () => void;
  onGoToTab: (id: SpecSectionId) => void;
}) {
  const fillable = SPEC_SECTIONS.filter((s) => s.id !== "programme");
  const completed = fillable.filter((s) => status[s.id] === "complete").length;
  const inProgress = fillable.filter((s) => status[s.id] === "draft").length;
  const missing = fillable.length - completed - inProgress;
  const percent = fillable.length ? Math.round((completed / fillable.length) * 100) : 0;

  const assessmentRows = [...slt.continuous, ...slt.final];
  const assessmentWeightTotal = assessmentRows.reduce((s, r) => s + (Number(r.weight) || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Course Information */}
        <Card>
          <CardHeader
            title="Course Information"
            action={
              <Button variant="outline" size="sm" onClick={onEditCourseInfo}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
            }
          />
          {courseInfo.courseCode || courseInfo.courseTitle ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label="Course Code" value={courseInfo.courseCode} />
              <Field label="Course Title" value={courseInfo.courseTitle} />
              <Field label="Credits" value={courseInfo.credits} />
              <Field
                label="Course Type"
                value={courseInfo.courseType ? courseTypeLabel(courseInfo.courseType as CourseType) : ""}
              />
              <Field
                label="Semester"
                value={courseInfo.semester ? semesterLabel(courseInfo.semester as Semester) : ""}
              />
              <Field
                label="Programme Year"
                value={courseInfo.programmeYear ? `Year ${courseInfo.programmeYear}` : ""}
              />
              <Field label="Pre-requisites" value={courseInfo.prerequisites} full />
              <Field label="Instructor" value={courseInfo.instructorName} />
              <Field label="Email" value={courseInfo.email} />
            </dl>
          ) : (
            <EmptyHint text="No course information yet." action="Fill it in" onClick={onEditCourseInfo} />
          )}
        </Card>

        {/* CLOs */}
        <Card>
          <CardHeader
            title="Course Learning Outcomes (CLOs)"
            action={
              <button
                type="button"
                onClick={() => onGoToTab("clos")}
                className="text-sm font-medium text-accent-foreground hover:underline"
              >
                View All
              </button>
            }
          />
          {clos.length === 0 ? (
            <EmptyHint text="No CLOs yet." action="+ Add CLO" onClick={() => onGoToTab("clos")} />
          ) : (
            <ul className="space-y-2">
              {clos.slice(0, 5).map((clo) => (
                <li key={clo.code} className="flex gap-3 text-sm">
                  <span className="mt-0.5 shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                    {clo.code}
                  </span>
                  <span className="text-foreground">{clo.description || "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Course Content & SLT */}
        <Card>
          <CardHeader
            title="Course Content & Student Learning Time"
            action={
              <button
                type="button"
                onClick={() => onGoToTab("slt")}
                className="text-sm font-medium text-accent-foreground hover:underline"
              >
                View All
              </button>
            }
          />
          {slt.content.length === 0 ? (
            <EmptyHint text="No content topics yet." action="Go to Weekly Plan" onClick={() => onGoToTab("slt")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Topic</th>
                    <th className="py-1.5 pr-2 font-medium">CLO</th>
                    <th className="py-1.5 text-right font-medium">SLT Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {slt.content.slice(0, 6).map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="py-1.5 pr-2 text-foreground">{row.title || "Untitled topic"}</td>
                      <td className="py-1.5 pr-2 text-muted-foreground">{row.cloCode || "—"}</td>
                      <td className="py-1.5 text-right text-foreground">{topicTotal(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Assessment Summary */}
        <Card>
          <CardHeader
            title="Assessment Summary"
            action={
              <button
                type="button"
                onClick={() => onGoToTab("slt")}
                className="text-sm font-medium text-accent-foreground hover:underline"
              >
                View All
              </button>
            }
          />
          {assessmentRows.length === 0 ? (
            <EmptyHint text="No assessments yet." action="Go to Weekly Plan" onClick={() => onGoToTab("slt")} />
          ) : (
            <div className="space-y-1.5 text-sm">
              {assessmentRows.slice(0, 6).map((row) => (
                <div key={row.id} className="flex items-center justify-between">
                  <span className="text-foreground">{row.title || "Untitled assessment"}</span>
                  <span className="text-muted-foreground">{row.weight || 0}%</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-1.5 text-xs font-medium text-muted-foreground">
                <span>Total</span>
                <span>{assessmentWeightTotal}%</span>
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader title="Resources" />
            <EmptyHint text="Coming in a later phase (§19)." />
          </Card>
          <Card>
            <CardHeader title="Policies" />
            <EmptyHint text="Coming in a later phase (§23)." />
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        {/* Completeness */}
        <Card>
          <CardHeader title="Course Completeness" />
          <div className="flex flex-col items-center gap-4">
            <CompletionRing value={percent} />
            <dl className="w-full space-y-1.5 text-sm">
              <LegendRow color="var(--status-live)" label="Completed" value={completed} total={fillable.length} />
              <LegendRow color="var(--status-upcoming)" label="In Progress" value={inProgress} total={fillable.length} />
              <LegendRow color="var(--muted-foreground)" label="Missing" value={missing} total={fillable.length} />
            </dl>
          </div>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader title="Quick Actions" />
          <ul className="divide-y divide-border text-sm">
            <QuickAction label="CLO → PLO Mapping" onClick={() => onGoToTab("cloMapping")} />
            <QuickAction label="Assessment" onClick={() => onGoToTab("assessmentPlan")} />
            <QuickAction label="Weekly Plan" onClick={() => onGoToTab("slt")} />
          </ul>
        </Card>

        {/* Mapping preview */}
        <Card>
          <CardHeader
            title="Mapping Preview"
            action={
              <button
                type="button"
                onClick={() => onGoToTab("cloMapping")}
                className="text-sm font-medium text-accent-foreground hover:underline"
              >
                View Full Mapping
              </button>
            }
          />
          <p className="mb-2 text-xs text-muted-foreground">CLO → PLO (Focus: F / M / P)</p>
          {clos.length === 0 ? (
            <EmptyHint text="No CLOs yet." />
          ) : (
            <ul className="space-y-1.5 text-sm">
              {clos.map((clo) => {
                const mapping = cloMapping.find((m) => m.cloCode === clo.code);
                const focus = FOCUS_LEVELS.find((f) => f.code === mapping?.focus);
                return (
                  <li key={clo.code} className="flex items-center justify-between">
                    <span className="text-foreground">
                      {clo.code} → {clo.mappedPlos.length ? clo.mappedPlos.join(", ") : "—"}
                    </span>
                    {focus ? (
                      <span className="rounded-full bg-status-live-bg px-2 py-0.5 text-xs font-medium text-status-live">
                        {focus.code}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Programme Reference (Part 1)" />
          <ProgrammeSection />
        </Card>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5">{children}</section>;
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {action}
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function EmptyHint({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
      <p>{text}</p>
      {action && onClick ? (
        <button type="button" onClick={onClick} className="mt-1 font-medium text-accent-foreground hover:underline">
          {action}
        </button>
      ) : null}
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-medium text-foreground">
        {value} / {total}
      </span>
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between py-2 text-left hover:text-accent-foreground"
      >
        <span className="text-foreground">{label}</span>
        <span className="text-accent-foreground">Open</span>
      </button>
    </li>
  );
}
