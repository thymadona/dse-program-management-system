import { Topbar } from "../../../topbar";
import { SpecClient } from "./spec-client";

export default function CourseSpecPage({ params }: { params: { id: string } }) {
  return (
    <>
      <Topbar title="Course Specification" subtitle="Fill the full syllabus — save each section, continue later" />
      <main className="flex-1 overflow-y-auto p-6">
        <SpecClient courseId={params.id} />
      </main>
    </>
  );
}
