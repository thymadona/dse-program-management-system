import { expect, test } from "bun:test";
import { CreateAccountInput } from "./auth.ts";

test("CreateAccountInput defaults role to lecturer", () => {
  const parsed = CreateAccountInput.parse({ name: "Ada", email: "ada@dse.dev" });
  expect(parsed.role).toBe("lecturer");
});

test("CreateAccountInput rejects a bad email", () => {
  const result = CreateAccountInput.safeParse({ name: "Ada", email: "nope" });
  expect(result.success).toBe(false);
});

test("CreateAccountInput rejects an empty name", () => {
  const result = CreateAccountInput.safeParse({ name: "", email: "ada@dse.dev" });
  expect(result.success).toBe(false);
});

test("CreateAccountInput rejects an unknown role", () => {
  const result = CreateAccountInput.safeParse({
    name: "Ada",
    email: "ada@dse.dev",
    role: "admin",
  });
  expect(result.success).toBe(false);
});
