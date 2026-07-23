import { RubricLibraryPage } from "./rubric-library-page";

export default async function CourseRubricLibraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RubricLibraryPage courseId={id} />;
}
