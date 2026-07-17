---
name: satisfactionsurvey-template-api-gap
description: SatisfactionSurvey v1→v2 port (issue #409 batch-2) blocked — FE api client lacks template/config wrappers that the backend controller already exposes
metadata:
  type: project
---

`frontend/src/modules/survey/api/satisfactionSurvey.ts` only exports: `getSurveyResults`, `getSurveyStats`,
`getSurveyAnalysis`, `getCampaigns`, `createCampaign`, `getCallbacks`, `contactCallback`, `acknowledgeFeedback`,
`exportSurveys`. It has **no** wrappers for the survey-template CRUD or config endpoints.

`backend/src/HIS.API/Controllers/SatisfactionSurveyController.cs` DOES implement them:
- `GET /satisfaction-survey/templates` → `GetTemplates`
- `POST /satisfaction-survey/templates` → `CreateTemplate([FromBody] SurveyTemplateDto)`
- `PUT /satisfaction-survey/templates/{id}` → `UpdateTemplate`
- `DELETE /satisfaction-survey/templates/{id}` → `DeleteTemplate`
- `GET /satisfaction-survey/config` / `PUT /satisfaction-survey/config` → survey auto-send config

v1 (`frontend/src/pages/SatisfactionSurvey.tsx`) calls these directly via raw `client.get/post/put/delete` (not
through the module api layer) for its "Mẫu khảo sát" (template CRUD + question builder: rating/yesno/text/
multiple_choice) and "Cấu hình" (config) tabs.

**Why:** the SatisfactionSurvey v2 port (2026-07-12, issue #409 batch-2 "P3 partial" list, inventory §2b) was
scoped to exactly these two gaps (template CRUD+question-builder, config tab), but per the layer-separation rule
(component must call `api/*.ts`, not raw `apiClient`) and the "only use functions that already exist, SKIP + list
if missing" rule, both were SKIPPED rather than faked with a non-persisting local-only UI.

**How to apply:** before picking up the SatisfactionSurvey template-CRUD or config-tab gap again, first add
`getTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `getConfig`, `updateConfig` (+
`SurveyTemplate`/`SurveyQuestion`/`SurveyConfig` types) to `frontend/src/modules/survey/api/satisfactionSurvey.ts`
as its own small task, THEN port the v2 UI (question-builder pattern: reuse the inline-editable-rows approach from
`AntibiogramModal` in `frontend/src/pages-v2/Microbiology.tsx`, per `his-fe-page-v2`/`ModalShell`). Related pattern:
[[b16-inpatient-lab-backend-gap]] (same class of issue — FE api client missing wrapper for an endpoint the backend
already has).
