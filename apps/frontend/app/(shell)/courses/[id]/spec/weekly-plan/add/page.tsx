import { WeekFormPage } from "../week-form-page";

export default async function AddWeekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WeekFormPage courseId={id} weekId={null} />;
}
