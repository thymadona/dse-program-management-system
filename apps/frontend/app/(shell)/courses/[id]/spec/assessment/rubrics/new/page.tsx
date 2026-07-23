import { RubricFormPage } from "../rubric-form-page";

export default async function NewCourseRubricPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RubricFormPage courseId={id} rubricId={null} />;
}
