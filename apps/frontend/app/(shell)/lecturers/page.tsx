import { Topbar } from "../topbar";
import { LecturersClient } from "./lecturers-client";

export default function LecturersPage() {
  return (
    <>
      <Topbar title="Lecturers" subtitle="Users with the lecturer role (read-only)" />
      <main className="flex-1 overflow-y-auto p-6">
        <LecturersClient />
      </main>
    </>
  );
}
