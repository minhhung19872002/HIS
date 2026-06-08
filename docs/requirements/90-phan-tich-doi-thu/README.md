# 90 — Phân tích đối thủ (THAM KHẢO)

**Có gì:** tài liệu sản phẩm của **đối thủ** (HDSD EMR · HIS-LIS · PACS-RIS) + script bóc tách PDF.

**Dùng để làm gì:** **tham khảo cạnh tranh** — học điểm mạnh/yếu của đối thủ để nâng giá trị sản phẩm ta.
Đây *không phải đích build* (khác `00`) và *không phải vendor tham chiếu chính* (khác `10`) → để riêng vùng `90`.

## Cấu trúc
| Thư mục | Có gì |
|---|---|
| [`1-goc-pdf/`](1-goc-pdf/) | PDF tài liệu đối thủ (HDSD_EMR · HDSD_HIS_LIS · HDSD_PACS_RIS) |
| [`_scripts/`](_scripts/) | `extract_pdfs.py`, `smoke_test_phase.ps1` — công cụ bóc tách/đối chiếu |

## Lưu ý
- Chỉ dùng để **phân tích**; không sao chép trực tiếp. Phát hiện gap đối thủ → đưa vào `00-san-pham-cua-ta/` nếu quyết làm.
