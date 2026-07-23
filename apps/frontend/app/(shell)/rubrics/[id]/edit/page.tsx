import { RubricFormPage } from "../../rubric-form-page";

export default async function EditRubricPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RubricFormPage rubricId={id} />;
}
