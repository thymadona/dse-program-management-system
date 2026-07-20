import { Topbar } from "../topbar";
import { StudentsClient } from "./students-client";

export default function StudentsPage() {
  return (
    <>
      <Topbar title="Students" subtitle="Student records — CRUD, list, profile" />
      <main className="flex-1 overflow-y-auto p-6">
        <StudentsClient />
      </main>
    </>
  );
}
