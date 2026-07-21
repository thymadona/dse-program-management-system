import { PrismaClient } from "@prisma/client";

/**
 * Seeds dev users (incl. several lecturers), students, courses, offerings and a
 * few enrollments so every plugin has data on first run. Idempotent via upsert.
 */
const prisma = new PrismaClient();

const users = [
  { email: "admin@dse.dev", name: "Admin User", role: "admin" as const },
  { email: "student@dse.dev", name: "Student User", role: "student" as const },
  {
    email: "lecturer@dse.dev",
    name: "Rao",
    role: "lecturer" as const,
    title: "Dr.",
    qualification: "PhD in Computer Science",
    phone: "096 1000 001",
  },
  {
    email: "hopper.lecturer@dse.dev",
    name: "Hopper",
    role: "lecturer" as const,
    title: "Prof.",
    qualification: "PhD in Mathematics",
    phone: "096 1000 002",
  },
  {
    email: "knuth.lecturer@dse.dev",
    name: "Knuth",
    role: "lecturer" as const,
    title: "Prof.",
    qualification: "PhD in Computer Science",
    phone: "096 1000 003",
  },
];

const students = [
  { name: "Ada Lovelace", email: "ada@dse.dev", studentId: "DSE-0001", status: "Active" as const },
  { name: "Alan Turing", email: "alan@dse.dev", studentId: "DSE-0002", status: "Active" as const },
  { name: "Grace Hopper", email: "grace@dse.dev", studentId: "DSE-0003", status: "Pending" as const },
  { name: "Katherine Johnson", email: "katherine@dse.dev", studentId: "DSE-0004", status: "Active" as const },
  { name: "Edsger Dijkstra", email: "edsger@dse.dev", studentId: "DSE-0005", status: "Inactive" as const },
];

const courses = [
  { code: "CS101", title: "Introduction to Programming", description: "Fundamentals of programming.", lecturer: "lecturer@dse.dev", credits: 3, prerequisites: null, courseType: "Basic" as const },
  { code: "CS201", title: "Data Structures & Algorithms", description: "Core data structures.", lecturer: "knuth.lecturer@dse.dev", credits: 3, prerequisites: "CS101", courseType: "Core" as const },
  { code: "CS301", title: "Databases", description: "Relational databases and SQL.", lecturer: "hopper.lecturer@dse.dev", credits: 3, prerequisites: "CS101; CS201", courseType: "Core" as const },
];

async function main() {
  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: u, create: u });
  }
  for (const s of students) {
    await prisma.student.upsert({ where: { email: s.email }, update: s, create: s });
  }

  for (const c of courses) {
    const lecturer = await prisma.user.findUnique({ where: { email: c.lecturer } });
    const courseData = {
      title: c.title,
      description: c.description,
      lecturerId: lecturer?.id ?? null,
      credits: c.credits,
      prerequisites: c.prerequisites,
      courseType: c.courseType,
    };
    await prisma.course.upsert({
      where: { code: c.code },
      update: courseData,
      create: { code: c.code, ...courseData },
    });
  }

  // One offering: CS101 in 2025-Fall, taught by its course lecturer, enrol 2 students.
  const cs101 = await prisma.course.findUnique({ where: { code: "CS101" } });
  if (cs101) {
    const offering = await prisma.offering.upsert({
      where: { courseId_term: { courseId: cs101.id, term: "2025-Fall" } },
      update: { capacity: 30, status: "Active", lecturerId: cs101.lecturerId },
      create: {
        courseId: cs101.id,
        term: "2025-Fall",
        capacity: 30,
        status: "Active",
        lecturerId: cs101.lecturerId,
      },
    });
    const enrolees = await prisma.student.findMany({
      where: { email: { in: ["ada@dse.dev", "alan@dse.dev"] } },
    });
    for (const s of enrolees) {
      await prisma.enrollment.upsert({
        where: { offeringId_studentId: { offeringId: offering.id, studentId: s.id } },
        update: {},
        create: { offeringId: offering.id, studentId: s.id },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${users.length} users, ${students.length} students, ${courses.length} courses, 1 offering with enrollments.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
