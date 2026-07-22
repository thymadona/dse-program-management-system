---
name: issue-workflow
description: Runs this repo's issue -> branch -> PR -> close loop for real work (features, bugs, chores, docs) — open a GitHub issue before starting, work on a conventionally-named branch, and open a PR whose body closes the issue on merge. Use this whenever the user asks to build, fix, add, or change something in dse-pms, says things like "let's work on X", "start on Y", "open an issue for Z", or references an existing issue number to pick up. Also use it when wrapping up work to open the PR and confirm the issue will close. Do not use it for pure exploration, throwaway scratch scripts, or one-line edits made inline at the user's explicit direction without any request to track them.
---

# Issue workflow

This repo already tracks real work through GitHub issues — every merged feature/fix/doc
PR here closes one (`Closes #N` in the PR body), and branches follow a `<type>/<slug>`
convention (`feat/supabase-auth`, `docs/claude-md`, `fix/...`). This skill just makes
that loop explicit and repeatable instead of ad hoc.

The loop has four stages. Don't skip stages, but use judgment on *scope* — a two-line
typo fix the user dictated directly doesn't need this ceremony; a feature, bug, or
anything the user describes as a task to pick up does.

## 1. Find or open the issue

Before creating anything, check whether an issue for this work already exists:

```bash
gh issue list --state open --search "<keywords>"
```

- If the user names an issue number ("pick up #9", "let's do the Revise UI issue"),
  use it directly — `gh issue view <N>` to confirm title/body match what's being asked.
- If nothing matches, open one:

```bash
gh issue create --title "<concise title>" --body "<what/why, 2-5 lines>" \
  --label "<bug|enhancement|documentation, if it clearly fits>"
```

Match the title style already in use (`docs: README is missing a Testing section`,
`Add Total SLT when create a new course`) — imperative or `type:` prefix, not a
restatement of the user's chat message.

## 2. Branch

Name it `<type>/<slug>`, matching existing branches — `feat/`, `fix/`, `docs/`,
`chore/`, `refactor/`. Include the issue number in the slug only if it adds
traceability value (`example/readme-testing-section-7`); it's not required.

```bash
git checkout -b <type>/<slug>
```

For work substantial enough to warrant an upfront design pass, note the plan in the
issue itself (a comment or an edit to the issue body) before writing code — this repo
doesn't use a separate spec/plan doc workflow. Small fixes skip straight to committing.

## 3. Work and commit

Normal commit hygiene applies — see the top-level git safety rules already governing
this session (no `--no-verify`, confirm before force-pushing, etc.). Commits don't need
to mention the issue individually; the PR body is what closes it.

## 4. Open the PR — confirm first

Opening a PR is a visible, shared-state action. Before running `gh pr create`, tell the
user what you're about to push and to which branch, and confirm — the same bar as any
other push in this session, not a special rule for this skill.

```bash
gh pr create --title "<type>(<scope>): <summary>" --body "$(cat <<'EOF'
## Summary
- ...

Closes #<N>

## Test plan
- [ ] ...
EOF
)"
```

`Closes #<N>` must be in the PR body (or title) exactly like PRs #3, #8, and #11 in
this repo's history — that's what makes the issue close automatically on merge, so
nothing manual is needed afterward. If the PR doesn't fully resolve the issue (partial
work, follow-up needed), say so instead of using a closing keyword, and leave the issue
open with a comment (`gh issue comment <N> --body "..."`) explaining what's left.

If the user asks to close an issue without a PR (abandoned work, duplicate, decided
against it), close it explicitly and say why:

```bash
gh issue close <N> --comment "<reason>"
```
