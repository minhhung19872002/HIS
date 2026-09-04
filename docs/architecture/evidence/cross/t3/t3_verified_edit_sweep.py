"""T3 (#218) — DÒ cửa SỬA NỘI DUNG không tra tới cổng xác nhận (đã duyệt / đã ký / đã khoá).

Sau `t3_status_vocabulary_sweep.py` (dò việc mượn ô trạng thái), đây là bộ dò thứ hai — cho hình
dạng lặp lại **nhiều nhất** của cả đợt: *một luật thi hành ở một cửa, bỏ trống ở cửa bên cạnh*.

Cụ thể ở đây là dạng nguy hiểm nhất của nó: hệ thống **có** lớp xác nhận (bác sĩ duyệt, ký số, khoá
hồ sơ), lớp ấy **được canh rất kỹ ở đường của chính nó** — nhưng một cửa **sửa nội dung** ở chỗ khác
lại không tra tới nó. Kết quả: chữ ký / chữ duyệt vẫn nguyên, còn nội dung nó bảo chứng thì đã khác.

Gặp mười lần trước khi bộ dò này ra đời, trong đó ba lần nặng:

* §5  — sửa `Findings`/`Impression` của phiếu CĐHA đã ký số;
* §33 — sửa chẩn đoán giải phẫu bệnh đã duyệt: **ác tính → lành tính**, chữ ký duyệt giữ nguyên;
* §34 — **ba cửa nữa** cùng ghi vào đúng ba trường mà §5 đã gác, một cửa nằm cách hàm đã vá 120 dòng.

**Cách dò.** Hai bước:

1. Quét `HIS.Core/Entities` tìm thực thể có "cổng xác nhận" — trường `DateTime?` tên `VerifiedAt`,
   `ApprovedAt`, `SignedAt`, `FinalizedAt`, `LockedAt`, `EmrFinalizedAt`, `ConfirmedAt`.
2. Quét `HIS.Infrastructure/Services` tìm hàm nạp một thực thể như vậy rồi **gán vào trường nội
   dung** của nó (bỏ qua chính cổng, các trường ghi vết, `Status`, và cờ `Is*`), mà trong thân hàm
   **không hề nhắc tới cổng** ấy cũng không gọi `EmrLockGuard`.

Bỏ qua các hàm mang tên `Approve/Verify/Sign/Finalize/Lock/Confirm/Reject/Cancel/Reopen/Unlock` —
đó là những hàm có nhiệm vụ ĐẶT cổng, không phải cửa sửa nội dung.

**Bộ dò chỉ THU HẸP, không kết luận.** Lượt chạy 2026-09-04 ra **37 chỗ**, và **đã đọc tay hết cả
37** (xem §34-§36 của báo cáo T3). Kết quả:

* **6 lỗi thật, đã vá** — ba cửa CĐHA (`UpdateRadiologyResultAsync`, `CopyReportResultAsync`,
  `MergeCoReaderOpinionsAsync`), `CompleteConsultationAsync` (hội chẩn thuốc dấu *), và hai cửa ghi
  chẩn đoán vào hồ sơ đã khoá TT46 (`SaveInpatientDiagnosisAsync`, `UpdateAdmissionAsync`);
* **3 báo dư** — có gác đàng hoàng nhưng gác bằng `Status` chứ không bằng trường cổng, nên bộ dò
  không thấy: `UpdateStockReceiptAsync`, `PharmacyApprovalService.UpdateAsync`,
  `EnterRadiologyResultAsync`;
* **4 ngoài phạm vi** — ghi logistics/hành chính chứ không phải nội dung lâm sàng (giường/phòng/khoa,
  số thẻ BHYT, đối tượng chi trả). TT46 khoá **nội dung hồ sơ**, không khoá chỗ nằm hay đối tượng
  chi trả — chặn mấy chỗ này lại là hiểu sai luật và làm khổ người dùng;
* **24 khớp nhầm** — hàm `Get*`/`Build*Dto` chỉ đọc, hai hàm seed dữ liệu dev, và gán vào biến trùng
  tên (`.Count`, `.Id`).

Đáng chú ý: một trong sáu cửa hỏng nằm **ngay dưới hàm đã được vá tay trước đó**, trong file đã đọc.
Đọc tay vẫn sót; bộ dò thì không.

**Vì sao chấp nhận báo dư.** Bộ dò chỉ soi tên trường cổng (`ApprovedAt`…) nên bỏ qua chỗ gác bằng
`Status` — tỉ lệ báo dư là có thật và đã biết. Đổi lại nó không bỏ lọt. Một bộ dò báo dư thì tốn công
đọc; một bộ dò báo thiếu thì bỏ lọt lỗi.

**Và vì sao vẫn phải đọc tay.** Bốn chỗ "ngoài phạm vi" trông y hệt lỗi nếu chỉ nhìn tên hàm. Bộ dò
không phân biệt được *nội dung lâm sàng* với *thông tin điều phối*; chỉ có người đọc mới phân biệt được.

Không cần API hay DB — chỉ đọc mã nguồn.
"""
import io, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
ENTITIES = os.path.join(ROOT, "backend", "src", "HIS.Core", "Entities")
SERVICES = os.path.join(ROOT, "backend", "src", "HIS.Infrastructure", "Services")

GATES = ("VerifiedAt", "ApprovedAt", "SignedAt", "FinalizedAt",
         "LockedAt", "EmrFinalizedAt", "ConfirmedAt")
CLASS_RE = re.compile(r'public\s+(?:sealed\s+)?class\s+(\w+)\s*:\s*BaseEntity')
GATE_RE = re.compile(r'public\s+DateTime\?\s+(%s)\s*\{' % "|".join(GATES))
SIG_RE = re.compile(r'^\s{4}(?:public|private|protected|internal)\s+.*\b(\w+)\s*\(')
DECL_RE = re.compile(r'var\s+(\w+)\s*=\s*await\s+_(?:context|db)\.(?:Set<(\w+)>\(\)|(\w+))')
ASSIGN_RE = re.compile(r'\b(\w+)\.(\w+)\s*=')
GATEKEEPER_RE = re.compile(
    r'(Approve|Verify|Sign|Finalize|Lock|Confirm|Reject|Cancel|Reopen|Unlock)', re.I)

SKIP_FIELDS = set(GATES) | {
    "VerifiedBy", "VerifiedByName", "ApprovedBy", "ApprovedById", "SignedByUserId",
    "EmrFinalizedBy", "LockedBy", "ConfirmedBy",
    "UpdatedAt", "UpdatedBy", "CreatedAt", "CreatedBy", "IsDeleted", "Status",
}


def load_gated_entities():
    gated = {}
    for dirpath, _, filenames in os.walk(ENTITIES):
        for filename in filenames:
            if not filename.endswith(".cs"):
                continue
            current = None
            for line in io.open(os.path.join(dirpath, filename),
                                encoding="utf-8-sig", errors="replace").read().split("\n"):
                found = CLASS_RE.search(line)
                if found:
                    current = found.group(1)
                gate = GATE_RE.search(line)
                if gate and current:
                    gated.setdefault(current, set()).add(gate.group(1))
    return gated


def main():
    gated = load_gated_entities()

    def class_of(dbset):
        for name in gated:
            if dbset in (name, name + "s", name + "es"):
                return name
        return None

    hits, seen = [], set()
    for dirpath, _, filenames in os.walk(SERVICES):
        for filename in sorted(filenames):
            if not filename.endswith(".cs"):
                continue
            path = os.path.join(dirpath, filename)
            lines = io.open(path, encoding="utf-8-sig", errors="replace").read().split("\n")
            i = 0
            while i < len(lines):
                signature = SIG_RE.match(lines[i])
                if not signature or "=>" in lines[i]:
                    i += 1
                    continue
                method = signature.group(1)
                j = i
                while j < len(lines) and "{" not in lines[j]:
                    j += 1
                if j >= len(lines):
                    i += 1
                    continue
                depth, k, body = 0, j, []
                while k < len(lines):
                    depth += lines[k].count("{") - lines[k].count("}")
                    body.append(lines[k])
                    k += 1
                    if depth <= 0:
                        break
                text = "\n".join(body)
                if not GATEKEEPER_RE.search(method):
                    var2cls = {d[0]: (d[1] or class_of(d[2] or "")) for d in DECL_RE.findall(text)}
                    for var, prop in ASSIGN_RE.findall(text):
                        cls = var2cls.get(var)
                        if (cls in gated and prop not in SKIP_FIELDS
                                and not prop.startswith("Is")):
                            if (not any(g in text for g in gated[cls])
                                    and "EmrLockGuard" not in text):
                                key = (os.path.relpath(path, SERVICES), method)
                                if key not in seen:
                                    seen.add(key)
                                    hits.append((key[0], i + 1, method, cls,
                                                 sorted(gated[cls])))
                            break
                i = k

    print("Thực thể có cổng xác nhận: %d" % len(gated))
    print("Cửa sửa nội dung KHÔNG tra tới cổng ấy: %d\n" % len(hits))
    for path, line_no, method, cls, gates in hits:
        print("  %-50s :%-5d %-38s %s(%s)" % (path, line_no, method, cls, ",".join(gates)))

    print("\nBộ dò chỉ THU HẸP phạm vi, KHÔNG tự kết luận. Lượt 2026-09-04 đã đọc tay HẾT 37 chỗ:")
    print("6 lỗi thật (đã vá) · 3 báo dư (có gác bằng `Status` nên bộ dò không thấy) · 4 ngoài")
    print("phạm vi (ghi logistics/hành chính, không phải nội dung lâm sàng) · 24 khớp nhầm.")
    print("Vẫn phải đọc tay: bộ dò không phân biệt được nội dung lâm sàng với thông tin điều phối.")


if __name__ == "__main__":
    main()
