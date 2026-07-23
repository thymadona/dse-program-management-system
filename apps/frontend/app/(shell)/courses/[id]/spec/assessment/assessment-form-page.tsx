"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
} from "@dse-pms/ui";
import type { Rubric } from "@dse-pms/shared-types";
import { Topbar } from "../../../../topbar";
import { ApiError } from "@/lib/api";
import { coursesApi, type CourseView } from "@/lib/courses";
import { courseSpecApi } from "@/lib/course-spec";
import { rubricsApi } from "@/lib/rubrics";
import { toClosForm, type CloForm } from "../clo-model";
import {
  emptyAssessment,
  toAssessmentForm,
  toAssessmentPayload,
  type AssessmentForm,
} from "../assessment-model";
import { AssessmentFormFields, assessmentFormErrors } from "./assessment-form-fields";

export function AssessmentFormPage({
  courseId,
  assessmentId,
}: {
  courseId: string;
  assessmentId: string | null;
}) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseView | null>(null);
  const [items, setItems] = useState<AssessmentForm[]>([]);
  const [clos, setClos] = useState<CloForm[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [draft, setDraft] = useState<AssessmentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [spec, courseView, rubricList] = await Promise.all([
          courseSpecApi.get(courseId),
          coursesApi.get(courseId),
          rubricsApi.list().catch(() => [] as Rubric[]),
        ]);
        if (cancelled) return;
        const list = toAssessmentForm(spec.data.assessmentPlan);
        setItems(list);
        setClos(toClosForm(spec.data.clos));
        setCourse(courseView);
        setRubrics(rubricList);
        if (assessmentId) {
          const existing = list.find((a) => a.id === assessmentId) ?? null;
          setDraft(existing);
          setNotFound(!existing);
        } else {
          setDraft(emptyAssessment());
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load the course specification");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, assessmentId]);

  const set = (patch: Partial<AssessmentForm>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const toggle = (key: "cloCodes" | "mappedPlos", id: string) =>
    setDraft((d) => {
      if (!d) return d;
      const has = d[key].includes(id);
      return { ...d, [key]: has ? d[key].filter((x) => x !== id) : [...d[key], id] };
    });

  const backHref = `/courses/${courseId}/spec?tab=assessmentPlan`;

  const submit = async () => {
    if (!draft) return;
    setTouched(true);
    if (assessmentFormErrors(draft).name) return;

    setSaving(true);
    setError(null);
    try {
      const next = assessmentId
        ? items.map((a) => (a.id === assessmentId ? draft : a))
        : [...items, draft];
      await courseSpecApi.saveSection(courseId, "assessmentPlan", toAssessmentPayload(next));
      router.push(backHref);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save this assessment");
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbLabel = course ? `${course.code} – ${course.title}` : "Course Specification";
  const pageTitle = assessmentId ? "Edit Assessment" : "Add Assessment";

  return (
    <>
      <Topbar
        title={pageTitle}
        subtitle="Define the assessment, link it to CLOs, set its weighting and plan its schedule."
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/courses">Course Management</Link>} />
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{breadcrumbLabel}</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={backHref}>Course Specification</Link>} />
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={backHref}>Assessment</Link>} />
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {error ? (
            <div className="rounded-lg border border-status-live/40 bg-status-live/10 px-3 py-2 text-sm text-status-live">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : notFound ? (
            <p className="text-sm text-muted-foreground">
              That assessment could not be found.{" "}
              <Link href={backHref} className="underline">
                Back to Assessment
              </Link>
            </p>
          ) : draft ? (
            <div className="space-y-6 rounded-xl border border-border bg-card p-6">
              <AssessmentFormFields
                draft={draft}
                set={set}
                toggle={toggle}
                clos={clos}
                rubrics={rubrics}
                courseId={courseId}
                touched={touched}
              />

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" render={<Link href={backHref}>Cancel</Link>} />
                <Button onClick={submit} disabled={saving}>
                  {saving ? "Saving…" : "Save Assessment"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
