---
name: field-usemodalform-rollout-gotchas
description: Non-obvious gotchas when converting a modal's hand-rolled required-field validation to the shared Field + useModalForm primitives
metadata:
  type: feedback
---

When sweeping modals across modules (reception/opd done 2026-08-17; likely repeated in billing/hr/inpatient/administration by other parallel agents/sessions) to adopt `components/form/Field` + `hooks/useModalForm`, these patterns recur:

**Naming collision**: many modal components already have local state/props named `form` (holding field VALUES, e.g. `ConsultForm`, `FlagFormState`). `useModalForm()`'s return value must be aliased (`vf`, `tplForm`, `barcodeForm`, ...) — never destructure it as `form` when that name is taken. Grep the component's own scope for `form`/`setForm` before naming the hook result.

**TS narrowing breaks after guard replacement**: replacing `if (!x) { toast; return; }` with `if (!form.validate({ x })) return;` loses TS's control-flow narrowing on `x` (still typed `T | null | undefined` afterward), because `useModalForm`'s `validate()` is opaque to the type system. Fix with a local cast at first use, e.g. `(dob as dayjs.Dayjs).format(...)`, `(preview as string).split(...)`, `newRoomId as string` — don't add a second redundant `if (!x) return`.

**Local duplicate `Field` shims already exist in several files** (found in `VisitActionsModals.tsx`, `ReceptionPrintModals.tsx` — both had their own `const Field: React.FC<{label,children}> = ...` with a `FIELD_LABEL`/`FIELD_WRAP` style const). These are exactly the pre-shared-component duplicates the canonical `Field` is meant to replace — swap the import, delete the local shim, and check whether `FIELD_LABEL`/`FIELD_WRAP` become unused (delete them too, or `tsc -b` fails on unused locals if `noUnusedLocals` is set).

**Not everything needs converting** — things that are already compliant or genuinely out of scope, don't touch:
- Modals already using native Antd `Form` + `Form.Item rules={[{required:true}]}` (e.g. `BiometricEnrollment.tsx`, `EMR.tsx`'s `ClinicalTemplateManager`, `VisitDrawerBody.tsx`'s `EditAdmissionModal`) — Antd Form already renders the red asterisk + defers errors to submit. `useModalForm`'s own docstring says it's "for modals that don't use Antd Form".
- `CrudModal` from `_v2kit` — canonical shared component, already handles this.
- List-level validation ("pick at least one row/service") has no single field to attach an error to — leave as toast (e.g. `ServiceOrderModal` in `VisitActionsModals.tsx`, `handleSaveTemplate`'s `items.length===0` check in `PrescriptionEditor.tsx`).
- Live search-as-you-type modals with no Save/Create gate (`PatientLookupModal.tsx`, `BookingPickerModal.tsx`, the inline `PatientSearchModal` in `PrescriptionEditor.tsx`) — toast-on-empty-query is normal search UX, not the "required field before save" antipattern being targeted.
- `DrawerShell` is NOT in scope when the instruction says "MỌI modal (`ModalShell`, Antd `Modal`)" — literal scope is modal-only, even if a drawer has the same premature-red-border issue (seen in `PrescriptionEditor.tsx`'s interactions drawer `overrideReason` textarea). Flag it, don't fix it, unless explicitly asked.
- A multi-step wizard with its own bespoke required-field component that ALREADY satisfies the same UX contract (red asterisk via an existing CSS var, validates only on Next/Submit, per-field errors) — e.g. `NewVisitModal.tsx`'s local `Lbl` component. Migrating to a single `useModalForm()` call would break per-step validation gating (the hook validates ALL configured rules at once, not just the current step's fields) unless split into one hook instance per step — high risk for a patient-registration flow. Defer, don't blind-refactor.

See also [[reception-module-split]] for the surrounding module structure.
