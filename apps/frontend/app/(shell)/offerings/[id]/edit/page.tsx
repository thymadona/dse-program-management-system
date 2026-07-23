import { OfferingFormPage } from "../../offering-form-page";

export default async function EditOfferingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OfferingFormPage offeringId={id} />;
}
