import { z } from "zod";

/** A method vocabulary entry as returned to the client. */
export const MethodSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Method = z.infer<typeof MethodSchema>;

/** Which method vocabulary (used by the §14 CLO form) a method belongs to. Also the POST route segment. */
export type MethodKind = "teaching" | "assessment";

/** Body for adding a method: trimmed, non-empty. */
export const CreateMethodInput = z.object({
  name: z.string().trim().min(1, "Method name is required"),
});
export type CreateMethodInput = z.infer<typeof CreateMethodInput>;

/** GET /api/methods response — both vocabularies in one payload. */
export const MethodsResponse = z.object({
  teaching: z.array(MethodSchema),
  assessment: z.array(MethodSchema),
});
export type MethodsResponse = z.infer<typeof MethodsResponse>;
