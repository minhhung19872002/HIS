# REQUIREMENT COVERAGE PROTOCOL — Giao thức phủ yêu cầu (chống sót khi rà soát tài liệu)

> **Vì sao có file này:** AI nhiều lần claim "đã rà đủ" nhưng thực tế **sót nguồn / đọc lướt / tin bản trích
> rỗng**. File này là **ràng buộc CỨNG** cho mọi task dạng *rà soát · đối chiếu tài liệu · gap analysis ·
> "đã đủ chưa" · backlog từ requirements*. Áp BẮT BUỘC ở chặng [1]Router + [4]Reviewer của
> [`workflow.md`](workflow.md).

## 0. Khi nào áp
Bất kỳ task: "rà soát/đối chiếu/so với tài liệu", "còn thiếu tính năng gì", "đã đủ chưa", "đối chiếu
[spec/đối thủ/gói thầu]", lập backlog từ `docs/requirements/**`. → PHẢI theo 5 luật dưới + cổng completeness.

---

## 1. LUẬT 1 — LẬP SOURCE MANIFEST TRƯỚC (mức FILE, không phải mức thư mục)
TRƯỚC khi đọc bất cứ gì: **liệt kê TỪNG FILE** (không chỉ thư mục) — `find docs/requirements -name "*.md"`
(+ `.pdf` không có `.md` kèm) + `docs/workspace-docs/luong_nghiep_vu.md` + tài liệu user trỏ tới. Lập bảng
trạng thái **theo FILE**, **không kết luận khi còn file `⬜ chưa đọc`**.
> ⚠️ **Bài học 2026-06-13:** đã claim "5/5 NGUỒN đủ" ở mức *thư mục* nhưng `10-tham-chieu/2-da-chat-loc-md/`
> còn **8 file chưa đọc** (44-modules, integrations, dashboard-reports, emr-forms, workflows…). Manifest
> PHẢI ở mức file. Lưu ý file **trùng nội dung** giữa thư mục (vd `10/1-goc-pdf` ≡ `90/1-goc-pdf`) → đánh
> dấu "đã phủ qua nguồn khác", không cần đọc lại — nhưng PHẢI liệt kê để biết đã đối chiếu.

| Nguồn | Vai trò | Trạng thái |
|---|---|---|
| `requirements/00-san-pham-cua-ta` | spec đích của ta | ✅ / ⚠️ / ⬜ |
| `requirements/10-tham-chieu-mqsoft` | sản phẩm vendor tham chiếu | … |
| `requirements/20-yeu-cau-nang-cap` | 24 gói NangCap | … |
| `requirements/30-bieu-mau-nghiep-vu` | biểu mẫu bệnh án chuyên khoa | … |
| `requirements/90-phan-tich-doi-thu` | HDSD đối thủ (theo actor) | … |
| `workspace-docs/luong_nghiep_vu.md` | 25 nhóm nghiệp vụ | … |

Trạng thái: **✅ đọc đủ** · **⚠️ trích lỗi/đọc một phần** · **⬜ chưa đọc**. Báo manifest cho user; chỉ kết
luận "đủ" khi **100% = ✅**.

## 2. LUẬT 2 — KHÔNG TIN BẢN TRÍCH, ĐỌC NGUỒN GỐC KHI NGHI
Bản `.md` sinh từ PDF có thể **rỗng/hụt** (PDF scan). Nếu `.md` **ngắn bất thường** (vài dòng, chỉ
`<!-- image -->`, "Khong chuyen doi duoc") → **đọc thẳng `.pdf` gốc** (Read tool đọc PDF được). Đánh dấu
nguồn đó `⚠️` cho tới khi đọc được nội dung thật. *(Đây là lỗi NangCap2/3 từng bị bỏ qua.)*

## 3. LUẬT 3 — LIỆT KÊ ĐỦ, KHÔNG TÓM TẮT "TRỌNG YẾU"
Khi rà 1 nguồn: **enumerate TỪNG mục/feature/form**, không gộp thành "các mục trọng yếu đã có". File dài →
đọc HẾT (chia batch/subagent nếu cần), không dừng giữa chừng rồi suy phần còn lại. Mỗi mục → trạng thái
DONE/PARTIAL/MISSING **có evidence grep**. *(Đây là lỗi đọc-lướt file NangCap dài.)*

## 4. LUẬT 4 — PHƯƠNG CHÂM PARITY-ĐỐI-THỦ (ưu tiên + chống over-build)
> User explicit: *"cái gì đối thủ CÓ thì của tôi CHẮC CHẮN phải có; cái gì đối thủ CHƯA CÓ thì tôi cũng có
> luôn NHƯNG phải đáp ứng nhu cầu thực tế — KHÔNG tạo tính năng thực tế không cần nếu đối thủ không có."*

| Tình huống | Hành động |
|---|---|
| **Đối thủ CÓ** + ta thiếu | **P0/P1 — BẮT BUỘC đóng gap** (parity là tối thiểu) |
| Đối thủ KHÔNG có + **nhu cầu thực tế cần** (chuẩn TT/BYT, vận hành thật) | P2 — làm, **ghi rõ lý do nhu cầu** |
| Đối thủ KHÔNG có + **không nhu cầu thực** | **KHÔNG đề xuất** (chống over-engineer / feature thừa) |

- Tài liệu thuyết minh/bán hàng của đối thủ → **chỉ tính capability THỰC verify được**, bỏ marketing fluff.
- Khác biệt **kiến trúc** (đối thủ WinForm/Oracle/desktop-local vs ta web/cloud) → **KHÔNG phải gap build**;
  ghi chú cho khâu thuyết minh thầu, không tạo task "viết lại theo kiến trúc đối thủ".

## 5. LUẬT 5 — DEDUP TRƯỚC KHI TẠO (no-duplicate)
Trước khi tạo issue mới: đối chiếu **toàn bộ issue đang mở** (`gh issue list`) + danh sách "ĐÃ DONE trong
code". Trùng tên/nghiệp vụ/mục tiêu → **KHÔNG tạo**, gộp/link thay vì nhân bản. Không tạo "task đi-làm-X"
nếu sẽ tự làm X trong cùng phiên (tránh task thừa).

---

## 6. ★ COMPLETENESS GATE — chống overconfidence (cổng trước khi nói "đủ")
KHÔNG được kết luận *"đã rà đủ / đã phủ hết / không còn thiếu"* trừ khi **TẤT CẢ** đúng:
- [ ] Source manifest (Luật 1) **100% = ✅** (không còn ⬜/⚠️)
- [ ] Mỗi nguồn đã **enumerate đủ** (Luật 3), không phần nào bị suy đoán
- [ ] Mọi nguồn nghi trích-hụt đã đọc **PDF gốc** (Luật 2)
- [ ] Đã chạy **completeness critic**: tự hỏi *"nguồn/section/actor/form nào CHƯA đụng?"* và trả lời được
- [ ] Phân tách rõ **VERIFIED** (có evidence) vs **ASSUMED** (chưa chắc → đánh CẦN XÁC MINH)

Chưa đủ 5 mục → nói **"đã rà X/Y nguồn, CÒN LẠI: …"** thay vì "đã đủ". **Thành thật > tự tin.**

---

## 7. Liên kết
- Pipeline: [`workflow.md`](workflow.md) · Checklist: [`checklist.md`](checklist.md) (mục I) · State-store: [`task.md`](task.md)
- Nguồn yêu cầu: `docs/requirements/README.md` (bản đồ vùng tài liệu)
