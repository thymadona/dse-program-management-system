import { PrismaClient } from "@prisma/client";

/**
 * Seeds dev users (one per role) and a handful of students so the UI has data
 * on first run. Idempotent via upsert on unique fields.
 */
const prisma = new PrismaClient();

const users = [
  { email: "admin@dse.dev", name: "Admin User", role: "admin" as const },
  { email: "lecturer@dse.dev", name: "Lecturer User", role: "lecturer" as const },
  { email: "student@dse.dev", name: "Student User", role: "student" as const },
];

const students = [
  { name: "Ada Lovelace", email: "ada@dse.dev", studentId: "DSE-0001", status: "Active" as const },
  { name: "Alan Turing", email: "alan@dse.dev", studentId: "DSE-0002", status: "Active" as const },
  { name: "Grace Hopper", email: "grace@dse.dev", studentId: "DSE-0003", status: "Pending" as const },
  { name: "Katherine Johnson", email: "katherine@dse.dev", studentId: "DSE-0004", status: "Active" as const },
  { name: "Edsger Dijkstra", email: "edsger@dse.dev", studentId: "DSE-0005", status: "Inactive" as const },
];

async function main() {
  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: u, create: u });
  }
  for (const s of students) {
    await prisma.student.upsert({ where: { email: s.email }, update: s, create: s });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${users.length} users and ${students.length} students.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
