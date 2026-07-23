import { Topbar } from "../topbar";
import { RubricsClient } from "./rubrics-client";

export default function RubricsPage() {
  return (
    <>
      <Topbar
        title="Rubric Library"
        subtitle="Create, manage and reuse rubrics for course assessments."
      />
      <main className="flex-1 overflow-y-auto p-6">
        <RubricsClient />
      </main>
    </>
  );
}
