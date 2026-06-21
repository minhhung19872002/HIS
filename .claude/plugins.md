# Plugins — bản đồ tái dùng (USE net-new · DEFER-to-HIS · COMPLEMENT)

> 6 plugin `claude-plugins-official` bật ở `~/.claude/settings.json` (**USER-global → MỌI project**, không riêng HIS).
> File này = **routing cho việc HIS**: plugin nào DÙNG (năng-lực mới), plugin nào DEFER về skill HIS (bạn đã có config riêng),
> plugin nào BỔ TRỢ. Nguyên tắc: **việc HIS-specific → skill HIS thắng** (stack-aware); plugin generic chỉ cho
> greenfield/non-HIS hoặc khi thêm năng-lực-mới. **KHÔNG nhồi tất cả vào dùng** (chống nhập nhằng / dual-system / drift).

## Bảng routing
| Plugin | Cung cấp | Vai trò HIS | Khi nào dùng |
|---|---|---|---|
| **chrome-devtools-mcp** | MCP live DevTools + skill (a11y · LCP · memory · troubleshoot) | ✅ **USE (net-new)** | Chẩn đoán **trang ĐANG CHẠY**: console-error · network · perf/LCP/CWV · a11y · memory-leak. KHÔNG dùng để viết code (đó là `his-fe-performance` / `core-accessibility-pattern`). |
| **playwright** (MCP) | MCP lái browser (navigate/click/snapshot/**screenshot**/fill/wait) | ✅ **USE (net-new)** | Verify 1 fix FE live · tái hiện bug · **chụp evidence** (giai đoạn test-CUỐI). Viết file test bền vẫn là `his-test-e2e`. |
| **github** (MCP) | MCP GitHub API | ⚖️ **COMPLEMENT** | Mặc định dùng **`gh` CLI** (đã trong allow-list + git-ops governance). MCP chỉ khi `gh` không làm được. |
| **code-review** | command `/code-review` (generic) | ⚖️ **DEFER cho việc HIS** | Review diff HIS → agent `his-quality-reviewer` (biết DI/ValueConverter/_v2kit/EF). `/code-review` cho diff nhanh / non-HIS. |
| **frontend-design** | skill UI generic (chống AI-slop) | ❌ **DEFER cho việc HIS** | UI HIS → `core-ui-aesthetics` + `his-fe-page-v2` + `his-fe-convention` (Antd v6 / _v2kit / ab-*). frontend-design chỉ greenfield/non-HIS hoặc ý tưởng visual. |
| **claude-code-setup** (recommender) | skill gợi ý automation | ⚖️ **META — thi thoảng** | Brainstorm hook/skill/agent mới. Output PHẢI qua `REGISTRY.md` + `lint.sh` trước khi nhận (governance HIS giữ chuẩn). |

## Quy tắc DEFER (việc HIS — tránh dual-system)
- **Việc HIS-specific** (đụng stack: Antd/_v2kit/EF/DI/Clean-Arch/Issues) → **skill `his-*`/`core-*` THẮNG**; plugin generic chỉ là fallback.
- **Plugin = USER-global** → GIỮ NGUYÊN cho project khác; HIS chỉ *route*, **KHÔNG disable** (trừ khi bạn yêu cầu rõ).
- **Net-new (chrome-devtools / playwright MCP)** = năng-lực **live browser** HIS chưa có → **dùng tự do** cho debug/verify/evidence.
  Touchpoint cụ thể: `skill-routes/fe.md` (live debug FE) + `skill-routes/test.md` (evidence + giai đoạn test-cuối).
- ⚠️ **MCP browser KHÔNG phá rule test-cuối:** chụp evidence / chạy test chỉ ở **giai đoạn TEST (sau khi fix DONE)**;
  trong lúc fix chỉ dùng để **verify/debug** thay đổi đang làm.

## Liên quan
`SKILL-MAP.md` (router skill) · `REGISTRY.md` (owner) · `skill-routes/fe.md` + `skill-routes/test.md` (touchpoint). Sửa file này → chạy `bash .claude/lint.sh`.
