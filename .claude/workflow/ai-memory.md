# AI MEMORY — Sổ quyết định kiến trúc (ADR-lite) + Index trí nhớ

> Mục đích bạn nêu: "nơi Claude ghi lại **quyết định kiến trúc**, tránh lần sau quên quyết định cũ".
> Hệ HIS đã có **2 tầng memory** đang chạy — file này **KHÔNG thay**, mà: (a) **index** 2 tầng đó để biết
> ghi gì ở đâu, (b) **lấp phần thiếu** = một **sổ ADR-lite** (Architecture Decision Record) cho quyết định
> **kiến trúc lâu dài** — thứ memory ephemeral không giữ.

---

## 1. Ghi cái gì ở đâu (3 cơ chế persistence — đừng nhầm)

| Cơ chế | Vị trí | Dùng cho | KHÔNG dùng cho |
|---|---|---|---|
| **Global memory** | `C:\Users\pc\.claude\projects\…\memory\` (+ `MEMORY.md` index) | user · feedback · project · reference **xuyên phiên** | code/architecture suy ra được từ repo |
| **Per-agent memory** | [`../agent-memory/<agent>/`](../agent-memory/) | ghi chú riêng của từng agent (vd quirks DTO Reception) | quyết định toàn-dự-án |
| **ADR-lite (file này)** | mục §3 dưới | **quyết định kiến trúc lâu dài** + lý do + hệ quả | task ephemeral · fix recipe (đã ở commit) |

Quy tắc tránh trùng (theo agent memory spec): **KHÔNG ghi vào memory** những gì repo đã ghi (cấu trúc code,
convention, git history, CLAUDE.md). Quyết định kiến trúc *vì sao chọn X thay Y* → ghi ADR ở đây.

## 2. Khi nào tạo 1 ADR
Tạo ADR khi có **quyết định kiến trúc/công nghệ có hệ quả lâu dài**, ví dụ: chọn pattern, tách/gộp module,
đổi chiến lược migration, thêm/loại 1 thư viện, ranh giới service, chiến lược tích hợp cổng ngoài. Quyết
định nhỏ/cục bộ → KHÔNG cần ADR (chỉ cần commit message rõ). Sau khi code thay đổi kiến trúc → chặng
[3]Worker-Doc (`his-docs-manager`) cập nhật ADR.

**Mẫu 1 ADR (copy khi thêm):**
```markdown
### ADR-NNN — <tiêu đề quyết định>
- Ngày: YYYY-MM-DD · Trạng thái: Proposed | Accepted | Superseded by ADR-MMM
- Bối cảnh: vì sao cần quyết định (ràng buộc, vấn đề)
- Quyết định: chọn gì
- Phương án đã cân nhắc: A / B / C — vì sao loại
- Hệ quả: lợi · hại · việc phải làm theo sau · rủi ro
- Liên kết: Issue # · commit · skill/memory liên quan
```

## 3. ADR LOG (mới nhất ở trên)

> Đây là khởi tạo. Các quyết định nền dưới đây **trích từ `CLAUDE.md` + SKILL-MAP đang chạy** (không phải
> phát minh) để sổ có điểm bắt đầu; ADR mới ghi tiếp phía trên.

### ADR-000 — Khung quyết định nền (đã hiệu lực, trích từ hệ hiện tại)
- Ngày: 2026-06-13 · Trạng thái: Accepted
- Bối cảnh: HIS là hệ Production nhiều năm; ưu tiên *không vỡ cái đang chạy > đẹp lý thuyết*.
- Quyết định nền (nguồn: `CLAUDE.md`, `SKILL-MAP.md` §5b/§5c):
  - **Giữ stack**: Controller+Service / React+Antd+`_v2kit` / context+local+refetch. **KHÔNG** CQRS, MediatR,
    Minimal-API, Next.js, Tailwind-first, Redux/normalized-store, DDD nặng.
  - **Migration**: SQL script tay idempotent (`Data/Scripts/NN_*.sql`), KHÔNG `ef migrations` auto.
  - **FE 2 lớp**: v2 (`/v2/*`, `_v2kit`, `ab-*`) là chính; v1 (Antd, MainLayout) cũ. Feature mới = v2.
  - **Task board** = GitHub Issues (từ 2026-06-13), thay backlog workspace-docs.
  - **Thứ tự ưu tiên chất lượng**: An toàn BN+Correctness+Security → Backward-compat → Readability/Maintainability
    → Scalability (khi đo được) → Performance (khi đo được) → Delivery-speed.
- Hệ quả: mọi đề xuất redesign/rewrite lệch stack → phải tạo ADR mới + user duyệt; mặc định theo codebase hiện tại.
- Liên kết: `SKILL-MAP.md` §0b/§5b/§5c · `CLAUDE.md`.

<!-- ADR mới thêm phía trên dòng này -->

---

## 4. Liên kết
- Global memory index: `…/memory/MEMORY.md` · Per-agent: [`../agent-memory/`](../agent-memory/)
- Pipeline: [`workflow.md`](workflow.md) · Convention: [`project-rules.md`](project-rules.md)
- Bộ tài liệu feature chính thức (khác ADR): `docs/features/<feature>/` qua skill `his-doc-feature`.
