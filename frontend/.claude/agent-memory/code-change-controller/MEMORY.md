# Code-Change-Controller Memory Index (frontend-scoped)

- [Field/useModalForm rollout gotchas](feedback_field-usemodalform-rollout-gotchas.md) — naming collision when local state is already `form`; TS narrowing breaks after replacing guard-return with `form.validate()` (needs `as Type` cast); local duplicate Field shims found in VisitActionsModals.tsx/ReceptionPrintModals.tsx; what NOT to convert (native Antd Form, CrudModal, list-level validation, search-as-you-type modals, DrawerShell, multi-step wizards with equivalent bespoke validation)
