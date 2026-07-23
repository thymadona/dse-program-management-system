import { CloFormPage } from "../clo-form-page";

export default async function AddCloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CloFormPage courseId={id} cloCode={null} />;
}
