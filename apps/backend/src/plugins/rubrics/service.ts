import type {
  CreateRubricInput,
  ListRubricsQuery,
  Rubric,
  RubricCriterion,
  RubricLevel,
  UpdateRubricInput,
} from "@dse-pms/shared-types";
import { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma.ts";

/** Include the owner's id+name so responses can show "Created By" without a join. */
const withOwner = { owner: { select: { id: true, name: true } } } as const;
type RubricRow = Prisma.RubricGetPayload<{ include: typeof withOwner }>;

/** Shape a Prisma row into the API `Rubric` (dates → ISO, JSON columns typed). */
function toRubric(row: RubricRow): Rubric {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Rubric["type"],
    description: row.description,
    levels: (row.levels as RubricLevel[] | null) ?? [],
    criteria: (row.criteria as RubricCriterion[] | null) ?? [],
    status: row.status,
    owner: row.owner ? { id: row.owner.id, name: row.owner.name } : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Rubric Library business logic over Prisma. This object is the plugin's public
 * service surface, reachable cross-plugin via `registry.get("rubrics").service`.
 * Rubrics are global (shared across all courses); `ownerId` records who created
 * one and is stamped from the authenticated caller, never from the request body.
 */
export const rubricService = {
  async list(query: ListRubricsQuery): Promise<Rubric[]> {
    const { search, status } = query;
    const rows = await prisma.rubric.findMany({
      where: {
        // Default library view hides archived rubrics unless asked for explicitly.
        ...(status ? { status } : { status: { not: "Archived" } }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { type: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: withOwner,
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toRubric);
  },

  async getById(id: string): Promise<Rubric | null> {
    const row = await prisma.rubric.findUnique({ where: { id }, include: withOwner });
    return row ? toRubric(row) : null;
  },

  async create(input: CreateRubricInput, ownerId: string): Promise<Rubric> {
    const row = await prisma.rubric.create({
      data: {
        name: input.name,
        type: input.type,
        description: input.description,
        levels: input.levels,
        criteria: input.criteria,
        status: input.status,
        ownerId,
      },
      include: withOwner,
    });
    return toRubric(row);
  },

  async update(id: string, input: UpdateRubricInput): Promise<Rubric> {
    const row = await prisma.rubric.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.levels !== undefined ? { levels: input.levels } : {}),
        ...(input.criteria !== undefined ? { criteria: input.criteria } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: withOwner,
    });
    return toRubric(row);
  },

  async remove(id: string): Promise<void> {
    await prisma.rubric.delete({ where: { id } });
  },
};

export type RubricService = typeof rubricService;
