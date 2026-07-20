import { Topbar } from "../topbar";
import { CoursesClient } from "./courses-client";

export default function CoursesPage() {
  return (
    <>
      <Topbar title="Courses" subtitle="Courses — CRUD, list, assign lecturer" />
      <main className="flex-1 overflow-y-auto p-6">
        <CoursesClient />
      </main>
    </>
  );
}
