import { WeekFormPage } from "../../week-form-page";

export default async function EditWeekPage({
  params,
}: {
  params: Promise<{ id: string; weekId: string }>;
}) {
  const { id, weekId } = await params;
  return <WeekFormPage courseId={id} weekId={weekId} />;
}
