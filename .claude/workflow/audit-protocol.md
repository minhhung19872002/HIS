# AUDIT PROTOCOL — chống agent/AI "nói quá" khi review/audit

> **ROOT-CAUSE "nói quá"** (đã tái hiện 2 lần ngay trong phiên 2026-06-13 — kể cả ở `.claude/lint.sh` của
> chính tôi): khi audit, harness **thưởng SỐ LƯỢNG + CHẮC CHẮN, không thưởng ĐÚNG-được-kiểm-chứng**. Cụ thể:
> quota "tối thiểu N findings" + framing "GIẢ ĐỊNH có lỗi" + schema ép `findings[]` không-rỗng + **thiếu ô
> confidence/evidence** + **không phạt false-positive** → agent bịa/thổi phồng để đủ quota, phát biểu
> inference/assumption như fact. Áp BẮT BUỘC cho mọi task audit/review/red-team.

## 6 luật chống-nói-quá (BẮT BUỘC)

1. **KHÔNG quota số findings.** Cấm "tối thiểu N findings". Tuyên bố rõ: **"0 finding là kết quả HỢP LỆ nếu sạch; chất lượng > số lượng; false-positive bị trừ điểm."**
2. **Mỗi finding PHẢI kèm BẰNG CHỨNG VERIFY thật** — trích **output lệnh đã chạy** (grep/ls/cat) chứng minh, KHÔNG chỉ khẳng định. Chưa chạy lệnh → KHÔNG được nói "grep = 0" / "file không tồn tại".
3. **Phân loại bắt buộc: Fact / Inference / Assumption / Speculation.** Chỉ `Fact` (có evidence command) mới gọi là FINDING; còn lại gắn nhãn **HYPOTHESIS (cần xác minh)** — KHÔNG trộn vào findings.
4. **Schema audit PHẢI có 2 field:** `evidence_command` (lệnh + output đã chạy) + `confidence` (high/med/low). Thiếu evidence → confidence ≤ low → đẩy sang mục "cần xác minh", không phải finding.
5. **Adversarial CÂN BẰNG verify:** "giả định có lỗi" đi kèm "nhưng MỌI claim phải grep-verify + trích output; không verify được → là giả thuyết, KHÔNG phải lỗi".
6. **Verification pass (tự phản biện):** trước khi nộp, rà lại từng finding: *"tôi đã CHẠY lệnh chứng minh chưa? path/giả-định của lệnh có đúng không?"* (lint từng false-positive vì sai path memory / tự-quét chính nó — luôn kiểm giả định của công cụ).

## Khi chạy Workflow audit (mẫu prompt + schema đúng)
```
MANDATE: Tìm vấn đề CÓ BẰNG CHỨNG. 0 finding = OK nếu sạch. KHÔNG quota. False-positive bị trừ.
Mỗi finding: chạy lệnh verify (grep/ls), TRÍCH output vào evidence_command. Chưa verify -> HYPOTHESIS.
SCHEMA findings[]: {severity, location, issue, evidence_command (lenh+output that), confidence(high|med|low), impact, fix}
+ hypotheses[] (chua verify, can kiem) RIENG findings[].
```

## Cross-ref
- Phủ yêu cầu (manifest mức file): [`requirement-coverage.md`](requirement-coverage.md) — cùng triết lý "verify, đừng tin".
- Verify trước khi khẳng định: skill `core-verify-before-assert`. Registry: [`../REGISTRY.md`](../REGISTRY.md).
