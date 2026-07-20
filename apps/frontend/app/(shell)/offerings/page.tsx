import { Topbar } from "../topbar";
import { OfferingsClient } from "./offerings-client";

export default function OfferingsPage() {
  return (
    <>
      <Topbar
        title="Course Offerings"
        subtitle="Links Students, Courses and Lecturers for a given term"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <OfferingsClient />
      </main>
    </>
  );
}
