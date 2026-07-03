# REQUIREMENT COVERAGE PROTOCOL — covering requirements (anti-omission when reviewing docs)

> **Why this file exists:** AI has repeatedly claimed "fully reviewed" but actually **missed sources / skimmed / trusted an
> empty extract**. This file is a **HARD constraint** for every task of the form *review · compare docs · gap analysis ·
> "is it complete" · backlog from requirements*. MANDATORY at stage [1]Router + [4]Reviewer of
> [`workflow.md`](workflow.md).

## 0. When to apply
Any task: "review/compare/against the docs", "what features are still missing", "is it complete", "compare against [spec/competitor/tender]", build a backlog from `docs/requirements/**`. → MUST follow the 5 rules below + the completeness gate.

---

## 1. RULE 1 — BUILD A SOURCE MANIFEST FIRST (FILE level, not folder level)
BEFORE reading anything: **list EVERY FILE** (not just folders) — `find docs/requirements -name "*.md"`
(+ `.pdf` without a companion `.md`) + `docs/workspace-docs/luong_nghiep_vu.md` + the docs the user points to. Build a status
table **by FILE**, and **do not conclude while any file is `⬜ unread`**.
> ⚠️ **Lesson 2026-06-13:** claimed "5/5 SOURCES complete" at the *folder* level, but `10-tham-chieu/2-da-chat-loc-md/`
> still had **8 unread files** (44-modules, integrations, dashboard-reports, emr-forms, workflows…). The manifest
> MUST be at file level. Note that files with **duplicate content** across folders (e.g. `10/1-goc-pdf` ≡ `90/1-goc-pdf`) → mark
> "covered via another source", no need to re-read — but you MUST list them to show you cross-checked.

| Source | Role | Status |
|---|---|---|
| `requirements/00-san-pham-cua-ta` | our target spec | ✅ / ⚠️ / ⬜ |
| `requirements/10-tham-chieu-mqsoft` | reference vendor product | … |
| `requirements/20-yeu-cau-nang-cap` | 24 NangCap packages | … |
| `requirements/30-bieu-mau-nghiep-vu` | specialty medical-record forms | … |
| `requirements/90-phan-tich-doi-thu` | competitor user guides (by actor) | … |
| `workspace-docs/luong_nghiep_vu.md` | 25 business groups | … |

Status: **✅ fully read** · **⚠️ broken/partial extract** · **⬜ unread**. Report the manifest to the user; only conclude
"complete" when **100% = ✅**.

> ⚠️ **The table above is ILLUSTRATIVE at the folder level only — do NOT use it as the real manifest.** The REAL manifest is generated **at runtime, file level**:
> `find docs/requirements -type f \( -name "*.md" -o -name "*.pdf" \)` → list EVERY file (including README/log/json, marked skip if not a spec). Marking a folder ✅ before reviewing its child files = exactly the 2026-06-13 bug (folder-level manifest).

## 2. RULE 2 — DON'T TRUST THE EXTRACT, READ THE ORIGINAL WHEN IN DOUBT
A `.md` generated from a PDF may be **empty/incomplete** (scanned PDF). If the `.md` is **unusually short** (a few lines, only
`<!-- image -->`, "Khong chuyen doi duoc") → **read the original `.pdf` directly** (the Read tool can read PDFs). Mark
that source `⚠️` until you read the real content. *(This is the NangCap2/3 bug that was once skipped.)*

## 3. RULE 3 — ENUMERATE FULLY, DON'T SUMMARIZE "KEY ITEMS"
When reviewing a source: **enumerate EVERY item/feature/form**, don't lump it into "the key items are present". Long file → read it ALL (split into batches/subagents if needed), don't stop midway and infer the rest. Each item → status DONE/PARTIAL/MISSING **with grep evidence**. *(This is the skim-a-long-NangCap-file bug.)*

## 4. RULE 4 — COMPETITOR-PARITY PRINCIPLE (priority + anti over-build)
> User explicit: *"whatever the competitor HAS, mine MUST definitely have; whatever the competitor DOESN'T HAVE I also
> have it BUT it must meet a real need — do NOT create a feature with no real need if the competitor doesn't have it."*

| Situation | Action |
|---|---|
| **Competitor HAS** + we lack it | **P0/P1 — MUST close the gap** (parity is the minimum) |
| Competitor DOESN'T have it + **a real need exists** (TT/BYT standard, real operation) | P2 — do it, **state the need clearly** |
| Competitor DOESN'T have it + **no real need** | **DO NOT propose** (anti over-engineer / surplus feature) |

- A competitor's marketing/sales doc → **count only REAL verifiable capability**, drop marketing fluff.
- An **architecture** difference (competitor WinForm/Oracle/desktop-local vs ours web/cloud) → **NOT a build gap**; note it for the tender presentation, do not create a "rewrite to the competitor's architecture" task.

## 5. RULE 5 — DEDUP BEFORE CREATING (no-duplicate)
Before creating a new issue: compare against **all open issues** (`gh issue list`) + the "ALREADY DONE in code" list. Same name/business/goal → **do NOT create**, merge/link instead of duplicating. If the action will be done directly in the current session, do not create a separate task for it.

---

## 6. ★ COMPLETENESS GATE — anti-overconfidence (the gate before saying "complete")
Do NOT conclude *"fully reviewed / fully covered / nothing missing"* unless **ALL** are true:
- [ ] Source manifest (Rule 1) is **100% = ✅** (no ⬜/⚠️ left)
- [ ] Each source has been **fully enumerated** (Rule 3), no part inferred
- [ ] Every source suspected of a broken extract has been read from the **original PDF** (Rule 2)
- [ ] Ran the **completeness critic**: asked *"which source/section/actor/form is NOT yet touched?"* and can answer
- [ ] Clearly separated **VERIFIED** (with evidence) vs **ASSUMED** (uncertain → marked NEEDS VERIFICATION)

Not all 5 → say **"reviewed X/Y sources, REMAINING: …"** instead of "complete". **Honesty > confidence.**

---

## 7. Links
- Pipeline: [`workflow.md`](workflow.md) · Checklist: [`checklist.md`](checklist.md) (section I) · State-store: [`task.md`](task.md)
- Requirement sources: `docs/requirements/README.md` (the document-area map)
