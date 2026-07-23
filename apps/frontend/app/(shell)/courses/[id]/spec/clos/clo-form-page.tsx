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
import type { Method } from "@dse-pms/shared-types";
import { Topbar } from "../../../../topbar";
import { ApiError } from "@/lib/api";
import { coursesApi, type CourseView } from "@/lib/courses";
import { courseSpecApi } from "@/lib/course-spec";
import { methodsApi } from "@/lib/methods";
import { emptyClo, toClosForm, toClosPayload, withCodes, type CloForm } from "../clo-model";
import { CloFormFields, cloFormErrors } from "./clo-form-fields";

export function CloFormPage({ courseId, cloCode }: { courseId: string; cloCode: string | null }) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseView | null>(null);
  const [clos, setClos] = useState<CloForm[]>([]);
  const [teachingMethods, setTeachingMethods] = useState<Method[]>([]);
  const [assessmentMethods, setAssessmentMethods] = useState<Method[]>([]);
  const [draft, setDraft] = useState<CloForm | null>(null);
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
        const [spec, methods, courseView] = await Promise.all([
          courseSpecApi.get(courseId),
          methodsApi.list(),
          coursesApi.get(courseId),
        ]);
        if (cancelled) return;
        const closForm = toClosForm(spec.data.clos, spec.data.cloMapping);
        setClos(closForm);
        setTeachingMethods(methods.teaching);
        setAssessmentMethods(methods.assessment);
        setCourse(courseView);
        if (cloCode) {
          const existing = closForm.find((c) => c.code === cloCode) ?? null;
          setDraft(existing);
          setNotFound(!existing);
        } else {
          setDraft(emptyClo());
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
  }, [courseId, cloCode]);

  const set = (patch: Partial<CloForm>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const toggle = (key: "mappedPlos" | "assessmentMethodIds", id: string) =>
    setDraft((d) => {
      if (!d) return d;
      const has = d[key].includes(id);
      return { ...d, [key]: has ? d[key].filter((x) => x !== id) : [...d[key], id] };
    });

  const backHref = `/courses/${courseId}/spec?tab=clos`;

  const submit = async () => {
    if (!draft) return;
    setTouched(true);
    if (cloFormErrors(draft).statement) return;

    setSaving(true);
    setError(null);
    try {
      const next = cloCode
        ? clos.map((c) => (c.code === cloCode ? draft : c))
        : [...clos, draft];
      await courseSpecApi.saveSection(courseId, "clos", toClosPayload(withCodes(next)));
      router.push(backHref);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save this CLO");
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbLabel = course ? `${course.code} – ${course.title}` : "Course Specification";
  const pageTitle = cloCode ? `Edit ${cloCode}` : "Add CLO";

  return (
    <>
      <Topbar
        title={pageTitle}
        subtitle="Define the outcome statement, mapped PLOs, assessment methods and Bloom's level for this CLO."
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
                <BreadcrumbLink render={<Link href={backHref}>CLOs</Link>} />
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
              That CLO could not be found. <Link href={backHref} className="underline">Back to CLOs</Link>
            </p>
          ) : draft ? (
            <div className="space-y-6 rounded-xl border border-border bg-card p-6">
              <CloFormFields
                draft={draft}
                code={cloCode}
                set={set}
                toggle={toggle}
                teachingMethods={teachingMethods}
                assessmentMethods={assessmentMethods}
                courseTotalSlt={course?.totalSltHours ?? null}
                touched={touched}
              />

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" render={<Link href={backHref}>Cancel</Link>} />
                <Button onClick={submit} disabled={saving}>
                  {saving ? "Saving…" : "Save CLO"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
