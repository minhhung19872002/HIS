# Technique catalog — định nghĩa ngắn + skill-home

Các "kỹ thuật" trong Dispatch của `core-meta-reasoning-orchestrator` **KHÔNG phải skill riêng** (tránh skill-rác).
Mỗi cái: 1 định nghĩa ngắn + nơi nó "sống" (skill-home đã có, nếu có). Áp inline khi orchestrator dispatch tới.

## Design / Open family
- **Alternative Designs** — sinh ≥3 thiết kế khác bản chất qua nhiều lăng kính. Home: `core-open-thinking`.
- **Counterargument** — chủ động dựng lập luận PHẢN BÁC kết luận của chính mình. Home: `core-critic` (artifact) / `core-sparring-partner` (ý-của-USER).

## Decision family
- **Tradeoff Analysis** — bảng tiêu-chí × phương-án, nêu cái được/mất mỗi lựa chọn, không có "free lunch". Home: `core-synthesis-decision`.
- **Base-Rate Thinking** — neo vào tỷ lệ nền/thống kê điển hình ("cách X thường thắng bao nhiêu %?") trước khi tin câu chuyện cá biệt; chống base-rate-neglect. Home: `core-synthesis-decision`.

## Architecture / Risk family
- **Failure-Mode Analysis** — liệt kê cạn các kiểu hỏng + nguyên nhân + tác động + cách chặn (FMEA nhẹ). Home: `core-inversion-thinking`.
- **Second-order Effects** — "rồi sao nữa?" qua 2-3 bậc: hệ quả của hệ quả (vd cache → stale → quyết-định-lâm-sàng-sai). Home: `core-critic` (trục 7) / `core-inversion-thinking`.
- **Risk Analysis** — rủi ro × (khả-năng, tác-động) → xếp hạng → mitigation/owner/trigger. Home: `core-inversion-thinking` + `core-critic`.
- **Scalability Review** — hành vi khi tải/dữ-liệu tăng 10×–100×: hot-path, N+1, connection pool, index, concurrency. Home: `his-be-scalability` (BE) · `his-fe-performance` (FE render/bundle).

## Planning family
- **Dependency Analysis** — dựng đồ thị phụ thuộc, tìm thứ-tự khả thi + critical path + vòng lặp. Home: `core-impact-analysis`.
- **Bottleneck Detection** — tìm điểm nghẽn THỰC (đo trước, không đoán): khâu chậm nhất giới hạn throughput. Home: `his-be-scalability` / `his-fe-performance`.

## Security family (chưa có skill-home riêng → inline; cân nhắc tạo skill nếu lặp nhiều)
- **Red-Team Thinking** — nghĩ như kẻ tấn công: "tôi sẽ phá cái này bằng cách nào?" (đảo mục tiêu phòng-thủ). Gần `core-inversion-thinking`.
- **Attack-Surface Analysis** — liệt kê mọi điểm vào (input/endpoint/upload/auth/dependency/secret) — nơi tin-cậy gặp không-tin-cậy.
- **Threat-Modeling** — STRIDE-nhẹ (Spoofing/Tampering/Repudiation/Info-disclosure/DoS/Elevation) trên từng luồng dữ liệu; HIS bám `his-qa-anti-pattern` (audit/patient-safety/secret) + built-in `security-review`.

## Troubleshooting / Research
- **Hypothesis-Elimination** — đảo từ triệu chứng về tập nguyên-nhân-khả-dĩ, loại dần bằng bằng chứng rẻ-nhất-trước. Home: `core-inversion-thinking` + `core-verify-before-assert`.
- **Source-Triangulation** — ≥2-3 nguồn độc lập xác nhận 1 claim trước khi tin; chống single-source. Home: `core-critic`; sâu → built-in `deep-research`.

> Quy tắc: kỹ thuật ở đây **không** được backtick-ref như skill `core-*`/`his-*` (lint sẽ báo drift). Nếu một
> kỹ thuật bắt đầu lặp lại nhiều task + đáng đóng gói → mới đề xuất tạo skill (qua `core-skill-authoring`, hỏi user duyệt).
