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

const teachingMethods = [
  "Lecture", "Guided Hands-on Lab", "Demonstration", "Lab-based Learning",
  "Step-by-step Coding", "Scaffolded Exercises", "Tutoring", "Practice",
  "Case Study", "Seminar", "Team-based Learning", "Project-Based Learning",
  "Presentation", "Flipped Classroom", "Group Discussion",
];

const assessmentMethods = [
  "Assignment", "Mid-term Quiz", "Final Exam", "Quiz", "Lab Report",
  "Project", "Presentation & Defence", "Peer Review", "Reflection Journal",
];

// Standard 4-point rating scale shared by the sample rubrics.
const scale4 = [
  { label: "Excellent", points: 4 },
  { label: "Good", points: 3 },
  { label: "Fair", points: 2 },
  { label: "Poor", points: 1 },
];

/** A few sample rubrics for the Rubric Library, owned by the seed lecturer. */
const rubrics = [
  {
    name: "Assignment Rubric – Written Report",
    type: "Assignment",
    description: "Evaluates written assignments and reports based on content, analysis, organization and referencing.",
    status: "Active" as const,
    levels: scale4,
    criteria: [
      { id: "c1", name: "Content Quality", descriptors: ["Exceptional understanding and depth", "Good understanding with minor gaps", "Basic understanding with some gaps", "Limited understanding and depth"] },
      { id: "c2", name: "Analysis & Critical Thinking", descriptors: ["Insightful analysis with strong evidence", "Good analysis with some evidence", "Limited analysis with weak evidence", "Minimal analysis with little evidence"] },
      { id: "c3", name: "Organization & Structure", descriptors: ["Excellent flow and structure", "Well organized with minor issues", "Somewhat organized with issues", "Poorly organized and hard to follow"] },
      { id: "c4", name: "Referencing", descriptors: ["Flawless, consistent citations", "Mostly correct citations", "Inconsistent citations", "Missing or incorrect citations"] },
      { id: "c5", name: "Language & Clarity", descriptors: ["Clear, precise, error-free", "Clear with minor errors", "Understandable with several errors", "Unclear with frequent errors"] },
    ],
  },
  {
    name: "Presentation Rubric",
    type: "Presentation",
    description: "Evaluates student presentations on delivery, content and visual aids.",
    status: "Active" as const,
    levels: scale4,
    criteria: [
      { id: "c1", name: "Delivery & Confidence", descriptors: ["Engaging and confident throughout", "Mostly confident delivery", "Hesitant in places", "Difficult to follow"] },
      { id: "c2", name: "Content Mastery", descriptors: ["Complete command of the topic", "Good command with minor gaps", "Partial command", "Weak grasp of the topic"] },
      { id: "c3", name: "Visual Aids", descriptors: ["Clear, effective, well-designed", "Helpful and readable", "Cluttered or sparse", "Distracting or absent"] },
      { id: "c4", name: "Time Management", descriptors: ["Perfectly paced", "Slightly over/under time", "Noticeably off time", "Far outside the limit"] },
    ],
  },
  {
    name: "Lab Report Rubric",
    type: "Lab",
    description: "Evaluates laboratory reports on method, results and interpretation.",
    status: "Active" as const,
    levels: scale4,
    criteria: [
      { id: "c1", name: "Methodology", descriptors: ["Rigorous and reproducible", "Sound with minor omissions", "Incomplete method", "Flawed or missing method"] },
      { id: "c2", name: "Results & Data", descriptors: ["Accurate, well-presented data", "Mostly accurate data", "Some errors in data", "Inaccurate or missing data"] },
      { id: "c3", name: "Interpretation", descriptors: ["Insightful, well-justified", "Reasonable conclusions", "Superficial interpretation", "Incorrect or absent"] },
    ],
  },
  {
    name: "Quiz Rubric",
    type: "Quiz",
    description: "Scores short quizzes and quiz items.",
    status: "Draft" as const,
    levels: scale4,
    criteria: [
      { id: "c1", name: "Accuracy", descriptors: ["All answers correct", "Most answers correct", "About half correct", "Few answers correct"] },
      { id: "c2", name: "Reasoning Shown", descriptors: ["Clear working throughout", "Working mostly shown", "Little working shown", "No working shown"] },
    ],
  },
];

async function main() {
  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: u, create: u });
  }
  for (const s of students) {
    await prisma.student.upsert({ where: { email: s.email }, update: s, create: s });
  }

  for (const name of teachingMethods) {
    await prisma.teachingMethod.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of assessmentMethods) {
    await prisma.assessmentMethod.upsert({ where: { name }, update: {}, create: { name } });
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

  // Sample rubrics owned by the seed lecturer. Name isn't unique, so guard on
  // (name, ownerId) to keep the seed idempotent.
  const rubricOwner = await prisma.user.findUnique({ where: { email: "lecturer@dse.dev" } });
  for (const r of rubrics) {
    const existing = await prisma.rubric.findFirst({
      where: { name: r.name, ownerId: rubricOwner?.id ?? null },
    });
    if (existing) {
      await prisma.rubric.update({ where: { id: existing.id }, data: { ...r } });
    } else {
      await prisma.rubric.create({ data: { ...r, ownerId: rubricOwner?.id ?? null } });
    }
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
    `Seeded ${users.length} users, ${students.length} students, ${courses.length} courses, ` +
      `${teachingMethods.length} teaching + ${assessmentMethods.length} assessment methods, ` +
      `${rubrics.length} rubrics, 1 offering.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
