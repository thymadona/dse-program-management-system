import { CloFormPage } from "../../clo-form-page";

export default async function EditCloPage({
  params,
}: {
  params: Promise<{ id: string; cloCode: string }>;
}) {
  const { id, cloCode } = await params;
  return <CloFormPage courseId={id} cloCode={cloCode} />;
}
