"use client";

import {
  SLT_ACTIVITIES,
  sltSectionTotals,
  type SltSection as SltSectionData,
} from "@dse-pms/shared-types";
import type { CloForm } from "./clos-section";

const MODES = [
  { key: "physical", label: "Physical" },
  { key: "online", label: "Online" },
  { key: "independent", label: "Independent" },
] as const;
type ModeKey = (typeof MODES)[number]["key"];
type ActCode = "L" | "T" | "P" | "O";
const ACTS = SLT_ACTIVITIES.map((a) => a.code as ActCode);

/** Content cell grid for input binding: cells[mode][act] = "2" (L/T/P/O per mode). */
export type CellForm = Record<ModeKey, Partial<Record<ActCode, string>>>;
/** Assessment hours for input binding: one value per delivery mode, no L/T/P/O. */
export type ModeHoursForm = Partial<Record<ModeKey, string>>;
export type TopicRowForm = { id: string; title: string; cloCode: string; cells: CellForm };
export type AssessmentRowForm = { id: string; title: string; hours: ModeHoursForm };
export type SltForm = {
  content: TopicRowForm[];
  continuous: AssessmentRowForm[];
  final: AssessmentRowForm[];
};

export const EMPTY_SLT: SltForm = { content: [], continuous: [], final: [] };

const blankCells = (): CellForm => ({ physical: {}, online: {}, independent: {} });
const uuid = () => globalThis.crypto.randomUUID();
export const blankTopic = (): TopicRowForm => ({ id: uuid(), title: "", cloCode: "", cells: blankCells() });
export const blankAssessment = (): AssessmentRowForm => ({ id: uuid(), title: "", hours: {} });

const str = (v: unknown) => (v == null ? "" : String(v));

function cellsToForm(raw: unknown): CellForm {
  const d = (raw ?? {}) as Record<string, Record<string, unknown>>;
  const out = blankCells();
  for (const { key } of MODES) {
    const mode = d[key] ?? {};
    for (const act of ACTS) {
      if (mode[act] != null) out[key][act] = String(mode[act]);
    }
  }
  return out;
}

function modeHoursToForm(raw: unknown): ModeHoursForm {
  const d = (raw ?? {}) as Record<string, unknown>;
  const out: ModeHoursForm = {};
  for (const { key } of MODES) {
    if (d[key] != null) out[key] = String(d[key]);
  }
  return out;
}

export function toSltForm(data: unknown): SltForm {
  const d = (data ?? {}) as Record<string, unknown[]>;
  const topics = (d.content ?? []).map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return { id: str(r.id) || uuid(), title: str(r.title), cloCode: str(r.cloCode), cells: cellsToForm(r.cells) };
  });
  const assess = (rows: unknown[] | undefined) =>
    (rows ?? []).map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      return { id: str(r.id) || uuid(), title: str(r.title), hours: modeHoursToForm(r.hours) };
    });
  return { content: topics, continuous: assess(d.continuous), final: assess(d.final) };
}

function cellsToPayload(cells: CellForm) {
  const out: Record<string, Record<string, number>> = { physical: {}, online: {}, independent: {} };
  for (const { key } of MODES) {
    for (const act of ACTS) {
      const v = cells[key][act];
      if (v !== undefined && v !== "") out[key]![act] = Number(v);
    }
  }
  return out;
}

function modeHoursToPayload(hours: ModeHoursForm) {
  const out: Record<string, number> = {};
  for (const { key } of MODES) {
    const v = hours[key];
    if (v !== undefined && v !== "") out[key] = Number(v);
  }
  return out;
}

export function toSltPayload(form: SltForm): SltSectionData {
  const assessmentTotal = [...form.continuous, ...form.final].reduce((s, r) => s + formModeTotal(r.hours), 0);
  const assess = (r: AssessmentRowForm) => ({
    id: r.id,
    title: r.title,
    weight: assessmentWeight(r.hours, assessmentTotal),
    hours: modeHoursToPayload(r.hours),
  });
  return {
    content: form.content.map((r) => ({ id: r.id, title: r.title, cloCode: r.cloCode || null, cells: cellsToPayload(r.cells) })),
    continuous: form.continuous.map(assess),
    final: form.final.map(assess),
  } as SltSectionData;
}

/** Numeric row total from a content row's string form (all modes × L/T/P/O). */
function formRowTotal(cells: CellForm): number {
  let n = 0;
  for (const { key } of MODES) for (const act of ACTS) n += Number(cells[key][act] || 0);
  return n;
}

/** Numeric row total from an assessment row's per-mode string form. */
function formModeTotal(hours: ModeHoursForm): number {
  return MODES.reduce((n, { key }) => n + Number(hours[key] || 0), 0);
}

/**
 * Auto assessment weight (%): this assessment's SLT hours as a share of the total
 * assessment SLT (continuous + final). `null` when there are no assessment hours yet.
 * Not user-editable — parallels §15's auto focus %.
 */
function assessmentWeight(hours: ModeHoursForm, assessmentTotal: number): number | null {
  if (!assessmentTotal) return null;
  return Math.round((formModeTotal(hours) / assessmentTotal) * 100);
}

function reorder<T>(rows: T[], from: number, to: number): T[] {
  if (to < 0 || to >= rows.length) return rows;
  const copy = [...rows];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved!);
  return copy;
}

const inputCls =
  "h-8 w-12 rounded border border-border bg-card px-1 text-center text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const titleInputCls =
  "h-8 w-56 rounded border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function CellInputs({ cells, onCell }: { cells: CellForm; onCell: (mode: ModeKey, act: ActCode, v: string) => void }) {
  return (
    <>
      {MODES.map(({ key }) =>
        ACTS.map((act) => (
          <td key={`${key}-${act}`} className="px-0.5 py-1">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={cells[key][act] ?? ""}
              onChange={(e) => onCell(key, act, e.target.value)}
            />
          </td>
        )),
      )}
    </>
  );
}

function ModeInputs({ hours, onMode }: { hours: ModeHoursForm; onMode: (mode: ModeKey, v: string) => void }) {
  return (
    <>
      {MODES.map(({ key }) => (
        <td key={key} className="px-1 py-1 text-center">
          <input
            type="number"
            min={0}
            className={inputCls}
            value={hours[key] ?? ""}
            onChange={(e) => onMode(key, e.target.value)}
          />
        </td>
      ))}
    </>
  );
}

/** Content-table header: two rows — mode groups spanning L/T/P/O. */
function ContentHead() {
  return (
    <thead>
      <tr className="text-xs text-muted-foreground">
        {["Topic", "CLO"].map((c) => (
          <th key={c} rowSpan={2} className="px-2 py-1 text-left align-bottom">{c}</th>
        ))}
        {MODES.map((m) => (
          <th key={m.key} colSpan={4} className="border-b border-border px-1 py-1 text-center">{m.label}</th>
        ))}
        <th rowSpan={2} className="px-2 py-1 text-center align-bottom">Total</th>
        <th rowSpan={2} className="px-2 py-1 align-bottom" />
      </tr>
      <tr className="text-[11px] text-muted-foreground">
        {MODES.map((m) => ACTS.map((a) => <th key={`${m.key}-${a}`} className="px-0.5 py-0.5 text-center">{a}</th>))}
      </tr>
    </thead>
  );
}

/** Assessment-table header: one hours column per delivery mode (no L/T/P/O). */
function AssessmentHead() {
  return (
    <thead>
      <tr className="text-xs text-muted-foreground">
        <th className="px-2 py-1 text-left">Assessment</th>
        <th className="px-2 py-1 text-center">Weight %</th>
        {MODES.map((m) => (
          <th key={m.key} className="px-2 py-1 text-center">{m.label}</th>
        ))}
        <th className="px-2 py-1 text-center">Total</th>
        <th className="px-2 py-1" />
      </tr>
    </thead>
  );
}

export function SltSectionForm({
  value,
  onChange,
  clos,
}: {
  value: SltForm;
  onChange: (v: SltForm) => void;
  clos: CloForm[];
}) {
  const totals = sltSectionTotals(toSltPayload(value));
  const missingClo = value.content.some((r) => !r.cloCode);

  const setContent = (rows: TopicRowForm[]) => onChange({ ...value, content: rows });
  const setGroup = (g: "continuous" | "final", rows: AssessmentRowForm[]) => onChange({ ...value, [g]: rows });

  const cellSetter =
    (i: number) =>
    (mode: ModeKey, act: ActCode, v: string) =>
      setContent(
        value.content.map((r, idx) =>
          idx === i ? { ...r, cells: { ...r.cells, [mode]: { ...r.cells[mode], [act]: v } } } : r,
        ),
      );

  const modeSetter =
    (g: "continuous" | "final", rows: AssessmentRowForm[], i: number) =>
    (mode: ModeKey, v: string) =>
      setGroup(g, rows.map((r, idx) => (idx === i ? { ...r, hours: { ...r.hours, [mode]: v } } : r)));

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Distribute each topic&apos;s Student Learning Time across delivery modes (Physical, Online,
        Independent) and activities — Lecture (L), Tutoring (T), Practice (P), Other (O). Assessment
        rows record hours per delivery mode only. Totals and the Grand Total SLT are calculated
        automatically. Each assessment&apos;s weight is derived from its share of the total assessment
        SLT, and content-topic hours drive each CLO&apos;s SLT in §15.
      </p>

      {/* -------- Course Content -------- */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Course Content</h3>
        {clos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-3 text-center text-xs text-muted-foreground">
            Add CLOs in §14 to tag topics with a CLO.
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-max border-collapse text-sm">
            <ContentHead />
            <tbody>
              {value.content.map((row, i) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-1">
                    <input
                      className={titleInputCls}
                      placeholder="Topic title"
                      value={row.title}
                      onChange={(e) => setContent(value.content.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)))}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      className="h-8 w-24 rounded border border-border bg-card px-1 text-sm text-foreground"
                      value={row.cloCode}
                      onChange={(e) => setContent(value.content.map((r, idx) => (idx === i ? { ...r, cloCode: e.target.value } : r)))}
                    >
                      <option value="">—</option>
                      {clos.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </td>
                  <CellInputs cells={row.cells} onCell={cellSetter(i)} />
                  <td className="px-2 py-1 text-center font-medium text-foreground">{formRowTotal(row.cells)}</td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs">
                    <RowControls
                      onUp={() => setContent(reorder(value.content, i, i - 1))}
                      onDown={() => setContent(reorder(value.content, i, i + 1))}
                      onRemove={() => setContent(value.content.filter((_, idx) => idx !== i))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <ContentFoot rows={value.content} label="Total SLT for Course Content" total={totals.contentTotal} />
          </table>
        </div>
        <AddRowButton label="Add topic" onClick={() => setContent([...value.content, blankTopic()])} />
      </section>

      {/* -------- Continuous & Final Assessment -------- */}
      {(["continuous", "final"] as const).map((g) => {
        const rows = value[g];
        const heading = g === "continuous" ? "Continuous Assessment" : "Final Assessment";
        const total = g === "continuous" ? totals.continuousTotal : totals.finalTotal;
        return (
          <section key={g} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-max border-collapse text-sm">
                <AssessmentHead />
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-2 py-1">
                        <input
                          className={titleInputCls}
                          placeholder="Assessment title"
                          value={row.title}
                          onChange={(e) => setGroup(g, rows.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)))}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span
                          className="inline-flex h-8 min-w-[3rem] items-center justify-center rounded border border-border bg-muted px-2 text-sm text-muted-foreground"
                          title="Auto: this assessment's share of total assessment SLT"
                        >
                          {assessmentWeight(row.hours, totals.assessmentTotal) == null
                            ? "—"
                            : `${assessmentWeight(row.hours, totals.assessmentTotal)}%`}
                        </span>
                      </td>
                      <ModeInputs hours={row.hours} onMode={modeSetter(g, rows, i)} />
                      <td className="px-2 py-1 text-center font-medium text-foreground">{formModeTotal(row.hours)}</td>
                      <td className="whitespace-nowrap px-2 py-1 text-xs">
                        <RowControls
                          onUp={() => setGroup(g, reorder(rows, i, i - 1))}
                          onDown={() => setGroup(g, reorder(rows, i, i + 1))}
                          onRemove={() => setGroup(g, rows.filter((_, idx) => idx !== i))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <AssessmentFoot rows={rows} label={`Total SLT for ${heading}`} total={total} />
              </table>
            </div>
            <AddRowButton label="Add assessment" onClick={() => setGroup(g, [...rows, blankAssessment()])} />
          </section>
        );
      })}

      {/* -------- Totals + warnings -------- */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
        <TotalRow label="Total SLT for Assessment" value={totals.assessmentTotal} />
        <TotalRow label="Grand Total SLT" value={totals.grandTotal} strong />
      </div>
      {missingClo ? (
        <p className="text-xs text-amber-600">⚠ Some topics have no CLO selected.</p>
      ) : null}
    </div>
  );
}

function RowControls({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return (
    <span className="inline-flex gap-1">
      <button type="button" onClick={onUp} className="rounded px-1 text-muted-foreground hover:text-foreground" aria-label="Move up">↑</button>
      <button type="button" onClick={onDown} className="rounded px-1 text-muted-foreground hover:text-foreground" aria-label="Move down">↓</button>
      <button type="button" onClick={onRemove} className="rounded px-1 text-muted-foreground hover:text-status-live" aria-label="Remove">✕</button>
    </span>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-accent hover:text-foreground">
      ＋ {label}
    </button>
  );
}

/** Content footer: per-column (mode × activity) subtotals + section total. */
function ContentFoot({ rows, label, total }: { rows: TopicRowForm[]; label: string; total: number }) {
  const colTotal = (mode: ModeKey, act: ActCode) => rows.reduce((s, r) => s + Number(r.cells[mode][act] || 0), 0);
  return (
    <tfoot>
      <tr className="border-t border-border bg-muted/40 text-xs font-medium text-foreground">
        <td colSpan={2} className="px-2 py-1">{label}</td>
        {MODES.map((m) => ACTS.map((a) => <td key={`${m.key}-${a}`} className="px-0.5 py-1 text-center">{colTotal(m.key, a) || ""}</td>))}
        <td className="px-2 py-1 text-center">{total}</td>
        <td />
      </tr>
    </tfoot>
  );
}

/** Assessment footer: per-mode subtotals + section total. */
function AssessmentFoot({ rows, label, total }: { rows: AssessmentRowForm[]; label: string; total: number }) {
  const colTotal = (mode: ModeKey) => rows.reduce((s, r) => s + Number(r.hours[mode] || 0), 0);
  return (
    <tfoot>
      <tr className="border-t border-border bg-muted/40 text-xs font-medium text-foreground">
        <td colSpan={2} className="px-2 py-1">{label}</td>
        {MODES.map((m) => <td key={m.key} className="px-2 py-1 text-center">{colTotal(m.key) || ""}</td>)}
        <td className="px-2 py-1 text-center">{total}</td>
        <td />
      </tr>
    </tfoot>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "text-base font-bold text-foreground" : "font-medium text-foreground"}>{value} h</span>
    </div>
  );
}
