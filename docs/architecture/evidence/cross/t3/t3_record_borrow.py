"""T3 (#218) — MƯỢN HỒ SƠ BỆNH ÁN: cửa TẠO phiếu mượn là hàm rỗng, ba cửa còn lại đều thật.

Module lưu trữ / mượn hồ sơ bệnh án (`api/medical-record-planning/borrowing/*`) có bốn thao tác, và
ba trong bốn đều làm việc thật trên bảng `MedicalRecordBorrowRequests`:

* `GetBorrowingAsync` — truy vấn thật, có `Include` bệnh nhân + hồ sơ lưu trữ;
* `ExtendBorrowAsync` — đọc bản ghi thật, gia hạn `ExpectedReturnDate`, `SaveChanges`;
* `ReturnRecordAsync` — đọc bản ghi thật, đặt ngày trả, `SaveChanges`.

Còn `CreateBorrowAsync` — cửa **tạo** phiếu mượn — thì:

    var code = $"PM-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";
    await Task.CompletedTask;
    return new RecordBorrowDto { Id = Guid.NewGuid(), BorrowCode = code, ... };

Không chạm vào `_context` một lần nào. Người dùng bấm "Mượn hồ sơ", nhận về một mã phiếu trông rất
thật (`PM-20260904-4821`) và một Id, giao diện báo thành công — rồi **không có gì được ghi xuống**.
Danh sách phiếu mượn ngay bên cạnh, vốn đọc bảng thật, sẽ không bao giờ thấy phiếu đó.

Cùng hình dạng với tám hàm rỗng bên ca mổ ở đợt trước: một chuỗi nghiệp vụ mà mọi mắt xích đều thật
trừ mắt xích đầu tiên. Điểm khác khiến nó khó phát hiện hơn: API trả **200 kèm dữ liệu hợp lệ**, nên
không có lỗi nào để ai đó nhìn thấy.

Cách đo: đếm số dòng trong bảng trước và sau khi gọi, và tra đúng mã phiếu mà API vừa trả về. Không
đo bằng mã HTTP — hàm rỗng vẫn trả 200.

Tiền tố dữ liệu T3BRW, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3BRW"
CASES = []
TOKEN = None


def http(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer %s" % TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def sql(q):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q",
           "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    text = (out.stdout or "").strip()
    if text.startswith("Msg ") or "Invalid column name" in text or "Invalid object name" in text:
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:120], text[:200]))
    return text


def case(name, ok, detail):
    CASES.append({"case": name, "pass": bool(ok), "detail": detail})
    print("  %-56s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    try:
        rec_id = sql("SELECT TOP 1 CAST(MedicalRecordId AS varchar(50)) FROM MedicalRecordArchives "
                     "WHERE IsDeleted=0 AND MedicalRecordId IS NOT NULL")
        if len(rec_id) != 36:
            raise SystemExit("không tìm được hồ sơ đã lưu trữ để mượn: %r" % rec_id)

        def borrow_count():
            return sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM MedicalRecordBorrowRequests WHERE IsDeleted=0")

        print("── Tạo phiếu mượn hồ sơ ──")
        before = int(borrow_count())
        st, b = http("POST", "/api/medical-record-planning/borrowing/borrow",
                     {"MedicalRecordId": rec_id, "Purpose": TAG + " muon ho so", "BorrowDays": 7})
        after = int(borrow_count())

        # API trả 200 kèm mã phiếu kể cả khi không ghi gì — nên KHÔNG đo bằng mã HTTP.
        try:
            payload = json.loads(b).get("data") or {}
        except Exception:
            payload = {}
        code = payload.get("borrowCode") or ""
        new_id = payload.get("id") or ""

        case("phiếu mượn ĐƯỢC ghi xuống cơ sở dữ liệu", after == before + 1,
             "HTTP %s · số phiếu %d → %d · mã API trả về=%r" % (st, before, after, code))

        # Chặt hơn nữa: đúng CÁI phiếu API vừa nói đã tạo phải tra ra được bằng Id nó trả về.
        found = "0"
        if len(new_id) == 36:
            found = sql("SELECT CAST(COUNT(*) AS varchar(5)) FROM MedicalRecordBorrowRequests "
                        "WHERE Id='%s'" % new_id)
        case("tra được đúng phiếu theo Id mà API trả về", found != "0",
             "Id=%r · số dòng khớp=%s" % (new_id, found))

        # Và phiếu đó phải hiện ra ở danh sách ngay bên cạnh — cửa đọc vốn dùng bảng thật.
        #
        # Lượt đầu tìm theo `TAG` (nằm trong `Purpose`) và báo FAIL — nhưng đó là bài đo sai, không
        # phải sản phẩm sai: bộ lọc từ khoá của `GetBorrowingAsync` chỉ soi `RequestCode`, tên bệnh
        # nhân và `ArchiveCode`, không soi `Purpose`. Tìm theo đúng mã phiếu mà API vừa trả về vừa
        # đúng bộ lọc, vừa là khẳng định MẠNH HƠN: chính cái phiếu API nói đã tạo phải hiện ra.
        st2, b2 = http("GET", "/api/medical-record-planning/borrowing?keyword=" + code)
        case("phiếu vừa tạo hiện ra ở danh sách phiếu mượn", bool(code) and (code in b2),
             "HTTP %s · tìm mã %r trong danh sách=%s" % (st2, code, code in b2))

    finally:
        try:
            sql("DELETE FROM MedicalRecordBorrowRequests WHERE Purpose LIKE N'%%%s%%';" % TAG)
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_record_borrow.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_record_borrow.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
