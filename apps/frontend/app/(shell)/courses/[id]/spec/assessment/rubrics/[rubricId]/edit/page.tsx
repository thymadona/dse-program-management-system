import { RubricFormPage } from "../../rubric-form-page";

export default async function EditCourseRubricPage({
  params,
}: {
  params: Promise<{ id: string; rubricId: string }>;
}) {
  const { id, rubricId } = await params;
  return <RubricFormPage courseId={id} rubricId={rubricId} />;
}
