"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  SPEC_SECTIONS,
  type Method,
  type MethodKind,
  type SpecSectionId,
  type SpecSectionStatus,
} from "@dse-pms/shared-types";
import { Button } from "@dse-pms/ui";
import { ApiError } from "@/lib/api";
import { courseSpecApi } from "@/lib/course-spec";
import { methodsApi } from "@/lib/methods";
import {
  CourseInfoSection,
  EMPTY_COURSE_INFO,
  toCourseInfoForm,
  toCourseInfoPayload,
  type CourseInfoForm,
} from "./course-info-section";
import {
  ClosSection,
  EMPTY_CLOS,
  toClosForm,
  toClosPayload,
  type CloForm,
} from "./clos-section";
import {
  CloMappingSection,
  reconcileMapping,
  toCloMappingForm,
  toCloMappingPayload,
  type CloMappingForm,
} from "./clo-mapping-section";
import { ProgrammeSection } from "./programme-section";

export function SpecClient({ courseId }: { courseId: string }) {
  const [activeId, setActiveId] = useState<SpecSectionId>("courseInfo");
  const [status, setStatus] = useState<Record<string, SpecSectionStatus>>({});
  const [courseInfo, setCourseInfo] = useState<CourseInfoForm>(EMPTY_COURSE_INFO);
  const [clos, setClos] = useState<CloForm[]>(EMPTY_CLOS);
  const [cloMapping, setCloMapping] = useState<CloMappingForm[]>([]);
  const [teachingMethods, setTeachingMethods] = useState<Method[]>([]);
  const [assessmentMethods, setAssessmentMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [spec, methods] = await Promise.all([
        courseSpecApi.get(courseId),
        methodsApi.list(),
      ]);
      setCourseInfo(toCourseInfoForm(spec.data.courseInfo as Record<string, unknown> | undefined));
      setClos(toClosForm(spec.data.clos));
      setCloMapping(toCloMappingForm(spec.data.cloMapping));
      setStatus(spec.status ?? {});
      setTeachingMethods(methods.teaching);
      setAssessmentMethods(methods.assessment);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load the course specification");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const sortByName = (list: Method[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  const handleAddMethod = useCallback(async (kind: MethodKind, name: string): Promise<Method> => {
    const method = await methodsApi.add(kind, name);
    const setter = kind === "teaching" ? setTeachingMethods : setAssessmentMethods;
    setter((list) => (list.some((m) => m.id === method.id) ? list : sortByName([...list, method])));
    return method;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeIndex = useMemo(
    () => SPEC_SECTIONS.findIndex((s) => s.id === activeId),
    [activeId],
  );
  const activeMeta = SPEC_SECTIONS[activeIndex];
  const prev = SPEC_SECTIONS[activeIndex - 1];
  const next = SPEC_SECTIONS[activeIndex + 1];
  const canSave = activeMeta?.state === "ready" && activeId !== "programme";

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (activeId === "courseInfo") {
        await courseSpecApi.saveSection(courseId, "courseInfo", toCourseInfoPayload(courseInfo));
      } else if (activeId === "clos") {
        await courseSpecApi.saveSection(courseId, "clos", toClosPayload(clos));
      } else if (activeId === "cloMapping") {
        const reconciled = reconcileMapping(clos, cloMapping);
        setCloMapping(reconciled);
        await courseSpecApi.saveSection(courseId, "cloMapping", toCloMappingPayload(reconciled));
      }
      setStatus((s) => ({ ...s, [activeId]: "complete" }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save this section");
    } finally {
      setSaving(false);
    }
  };

  const title = courseInfo.courseCode
    ? `${courseInfo.courseCode} — Course Specification`
    : "Course Specification";

  return (
    <div className="mx-auto flex max-w-6xl gap-6">
      {/* Stepper */}
      <nav className="hidden w-64 shrink-0 lg:block">
        <Link href="/courses" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Courses
        </Link>
        <ol className="mt-4 space-y-1">
          {SPEC_SECTIONS.map((s, i) => {
            const isActive = s.id === activeId;
            const done = status[s.id] === "complete";
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-accent/15 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                      done
                        ? "bg-emerald-500 text-white"
                        : isActive
                          ? "bg-accent text-white"
                          : "border border-border text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : i}
                  </span>
                  <span className="flex flex-col">
                    <span>{s.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.ref}
                      {s.state === "soon" ? " · soon" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Main panel */}
      <div className="min-w-0 flex-1">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {activeMeta?.title} <span className="text-muted-foreground">· {activeMeta?.ref}</span>
          </p>
        </header>

        {error ? (
          <div className="mb-4 rounded-lg border border-status-live/40 bg-status-live/10 px-3 py-2 text-sm text-status-live">
            {error}
          </div>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : activeId === "programme" ? (
            <ProgrammeSection />
          ) : activeId === "courseInfo" ? (
            <CourseInfoSection
              value={courseInfo}
              onChange={(patch) => setCourseInfo((v) => ({ ...v, ...patch }))}
            />
          ) : activeId === "clos" ? (
            <ClosSection value={clos} onChange={setClos} />
          ) : activeId === "cloMapping" ? (
            <CloMappingSection
              clos={clos}
              value={cloMapping}
              onChange={setCloMapping}
              teachingMethods={teachingMethods}
              assessmentMethods={assessmentMethods}
              onAddMethod={handleAddMethod}
            />
          ) : (
            <ComingSoon title={activeMeta?.title ?? ""} refLabel={activeMeta?.ref ?? ""} />
          )}
        </section>

        {/* Footer nav */}
        <footer className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={!prev}
            onClick={() => prev && setActiveId(prev.id)}
          >
            ← Back
          </Button>
          <div className="flex items-center gap-3">
            {savedFlash ? <span className="text-sm text-emerald-600">Saved ✓</span> : null}
            {canSave ? (
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            ) : null}
            <Button disabled={!next} onClick={() => next && setActiveId(next.id)}>
              Next →
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ComingSoon({ title, refLabel }: { title: string; refLabel: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        {title} <span className="text-muted-foreground">({refLabel})</span>
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        This section is coming in a later phase. The full syllabus structure is shown here so you can
        see the whole document — for now, fill in <strong>Course Information</strong>.
      </p>
    </div>
  );
}
