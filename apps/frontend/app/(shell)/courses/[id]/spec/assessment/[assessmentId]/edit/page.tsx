import { AssessmentFormPage } from "../../assessment-form-page";

export default async function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
}) {
  const { id, assessmentId } = await params;
  return <AssessmentFormPage courseId={id} assessmentId={assessmentId} />;
}
