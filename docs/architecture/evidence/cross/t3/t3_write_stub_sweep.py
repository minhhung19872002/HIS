r"""T3 (#218) — DÒ hàm RỖNG: tên hứa hẹn ghi dữ liệu, trả về DTO trông như thật, nhưng không ghi gì.

Bộ dò thứ ba, cho hình dạng lặp lại thứ ba của đợt:

* §13 — **tám** hàm ca mổ là vỏ rỗng; kết thúc ca mổ chưa bắt đầu làm mất cả tường trình;
* §25 — `CreateBorrowAsync` sinh mã phiếu bằng `Random()`, trả HTTP 200, DB `0 → 0`;
* §31 — ký số tự dựng một phiếu đọc `Findings = "Ky so tu dong"` rồi ký luôn.

Đặc điểm khiến loại này **khó thấy hơn hẳn lỗi thiếu gác**: API trả **200 kèm dữ liệu hợp lệ**, có
Id, có mã phiếu đúng định dạng. Không có lỗi nào để ai nhìn thấy. Chỉ khi mở bảng ra đếm mới biết.

**Cách dò.** Tìm `public async Task<...Dto/...Result>` có tên bắt đầu bằng một động từ hứa hẹn ghi
(`Create`, `Save`, `Update`, `Approve`, `Submit`, `Complete`, `Record`, `Issue`, `Import`…), thân hàm
có `new ...` (tức dựng DTO trả về) nhưng **không hề** gọi `SaveChanges` / `ExecuteSql` / `.Add` /
`.Update` / `.Remove` / `Database.`.

**Hai lớp báo nhầm đã tìm ra khi hiệu chỉnh và đã loại:**

1. **Ủy thác** — thân hàm chỉ `return await MotHamKhacAsync(...)`, và hàm kia mới là chỗ ghi.
   Ví dụ `CreateEmergencyDepositAsync` gọi `CreateDepositAsync`. Loại bằng cách bỏ qua thân hàm
   khớp `return await \w+Async(`.
2. **Gateway gọi dịch vụ ngoài** — lớp `*Gateway` / `*Provider` / `*Client`, hoặc thân hàm có
   `HttpClient`/`PostAsync`. Với chúng, **không ghi DB là ĐÚNG thiết kế**: việc của chúng là gọi API
   nhà cung cấp. Ví dụ `VnptEInvoiceProvider.IssueAsync` — validate, dựng payload, gọi API VNPT, có
   retry và idempotency key. Nếu không loại nhóm này thì bộ dò vu oan cho code làm đúng.

Sau khi loại hai nhóm trên: **25 chỗ** (lượt chạy 2026-09-04).

**Bộ dò KHÔNG kết luận.** Đã đọc tay 4 chỗ để hiệu chỉnh:

* `CreateSickLeaveAsync` — **rỗng thật**, trả `SickLeaveDto` với `Id = Guid.NewGuid()`, không ghi;
* `ApproveProcurementRequestAsync` — **rỗng thật**, trả DTO với `Status = 1 // Đã duyệt` bịa ra;
* `SaveLabTestAsync` — **rỗng thật**, `return new LabTestCatalogDto { Code = dto.Code, ... }`, tức
  vọng lại đúng cái vừa nhận vào;
* `CompleteStockTakeAsync` — rỗng **nhưng ĐÃ KHAI BÁO**: có chú thích `// Stock take is handled
  in-memory (no StockTake table yet)`. Đây là **khoảng trống có chủ ý**, khác hẳn hàm rỗng không nói gì.

Phân biệt *khai báo* với *giấu* là việc bộ dò không làm được, mà lại là việc quan trọng nhất: một
khoảng trống đã ghi ra là món nợ có sổ; một hàm rỗng im lặng là cái bẫy.

**21/25 chỗ chưa đọc tay.** Đừng coi là đã kết luận.

Không cần API hay DB — chỉ đọc mã nguồn.
"""
import io, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
SERVICES = os.path.join(ROOT, "backend", "src", "HIS.Infrastructure", "Services")

SIG_RE = re.compile(r'^\s{4}public\s+async\s+Task<([^>]+)>\s+(\w+)\s*\(')
DELEGATE_RE = re.compile(r'return\s+await\s+\w+Async\s*\(')
WRITE_RE = re.compile(r'SaveChanges|ExecuteSql|\.Add\(|\.AddAsync\(|\.Update\(|\.Remove\(|Database\.')
PROMISE_RE = re.compile(
    r'^(Create|Save|Update|Add|Register|Submit|Approve|Complete|Cancel|Delete|Assign'
    r'|Issue|Confirm|Start|Finish|Record|Post|Import|Export)')
EXTERNAL_RE = re.compile(r'(Gateway|Provider|Client|Connector|Adapter)\.cs$'
                         r'|[\/]External[\/]|[\/]HL7[\/]')
HTTP_RE = re.compile(r'HttpClient|PostAsync|GetAsync\(|SendAsync|_http')
DECLARED_RE = re.compile(
    r'(no\s+\w+\s+table|chưa có bảng|in-memory|not implemented|chưa triển khai|TODO|stub|mock)',
    re.I)


def main():
    if not os.path.isdir(SERVICES):
        raise SystemExit("khong thay thu muc Services: %s" % SERVICES)

    declared, hidden = [], []
    for dirpath, _, filenames in os.walk(SERVICES):
        for filename in sorted(filenames):
            if not filename.endswith(".cs"):
                continue
            path = os.path.join(dirpath, filename)
            rel = os.path.relpath(path, SERVICES)
            lines = io.open(path, encoding="utf-8-sig", errors="replace").read().split("\n")
            i = 0
            while i < len(lines):
                signature = SIG_RE.match(lines[i])
                if not signature or "=>" in lines[i]:
                    i += 1
                    continue
                returns, method = signature.group(1), signature.group(2)
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
                looks_like_stub = (
                    PROMISE_RE.match(method)
                    and ("Dto" in returns or "Result" in returns)
                    and not WRITE_RE.search(text)
                    and not DELEGATE_RE.search(text)
                    and "new " in text
                    and not EXTERNAL_RE.search(rel)
                    and not HTTP_RE.search(text))
                if looks_like_stub:
                    (declared if DECLARED_RE.search(text) else hidden).append((rel, i + 1, method))
                i = k

    print("A. ĐÃ KHAI BÁO là chưa làm (chú thích 'no table yet' / TODO / mock): %d" % len(declared))
    for rel, line_no, method in declared:
        print("   %-46s :%-5d %s" % (rel, line_no, method))
    print("\nB. KHÔNG chú thích gì — nhìn vào tưởng đã làm xong: %d" % len(hidden))
    for rel, line_no, method in hidden:
        print("   %-46s :%-5d %s" % (rel, line_no, method))

    print("\nĐã loại sẵn hai lớp báo nhầm: hàm ỦY THÁC cho hàm khác ghi, và lớp GATEWAY gọi dịch vụ")
    print("ngoài (không ghi DB là đúng thiết kế). Bộ dò KHÔNG kết luận — phải mở từng chỗ ra đọc.")
    print("Việc quan trọng nhất mà bộ dò KHÔNG làm được: phân biệt khoảng trống ĐÃ KHAI BÁO (món nợ")
    print("có sổ) với hàm rỗng IM LẶNG (cái bẫy). Nhóm B ở trên mới chỉ là 'chưa thấy chú thích'.")


if __name__ == "__main__":
    main()
