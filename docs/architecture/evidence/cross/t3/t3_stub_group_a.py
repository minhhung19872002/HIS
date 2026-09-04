"""T3 (#218) — NHÓM A: sáu cửa GHI là vỏ rỗng, trong khi bảng dữ liệu đã có sẵn.

Bộ dò `t3_write_stub_sweep.py` tìm ra 25 hàm rỗng. Đọc hết rồi tách theo một tiêu chí quyết định:
**bảng dữ liệu đã tồn tại hay chưa.**

* **chưa có bảng** → tính năng còn thiếu, phải có migration + nghiệp vụ = việc của backlog sản phẩm;
* **đã có bảng** → **lỗi**: bảng thật, đủ cột, EF đã map, đường ĐỌC đã dùng bảng đó rồi, chỉ mỗi
  đường GHI là vỏ rỗng. Đúng khuôn `CreateBorrowAsync` mà §25 đã vá.

Bài đo này lo nhóm thứ hai — bảy hàm, sáu trong số đó có route API sống:

| Hàm | Bảng | Route |
|---|---|---|
| `SaveLabTestGroupAsync` | `LabTestGroups` | `POST /api/LISComplete/catalog/groups` |
| `SaveConclusionTemplateAsync` | `LabConclusionTemplates` | `POST /api/LISComplete/catalog/conclusion-templates` |
| `CreateWorklistAsync` | `LabWorklists` | `POST /api/LISComplete/worklist/create` |
| `ApproveProcurementRequestAsync` | `ProcurementRequests` | `POST /api/warehouse/procurement-requests/{id}/approve` |
| `UpdateStockTakeResultsAsync` | `StockTakes` | `PUT /api/warehouse/stock-takes/{id}/results` |
| `CompleteStockTakeAsync` | `StockTakes` | `POST /api/warehouse/stock-takes/{id}/complete` |

(`RecordConsignmentUsageAsync` → `ConsignmentStocks` cũng thuộc nhóm này nhưng **chưa có route API**,
nên vá cho nhất quán mà không đo qua HTTP được.)

Như mọi lần trong đợt, bài đo **không chấm theo mã HTTP** — hàm rỗng vẫn trả 200 kèm DTO hợp lệ.
Nó đếm số dòng trong bảng trước và sau khi gọi.

Riêng `CompleteStockTakeAsync` còn một chi tiết đáng ghi: chú thích trong code viết
`// Stock take is handled in-memory (no StockTake table yet)` — nhưng bảng `StockTakes` **tồn tại,
14 cột**. Chú thích đúng lúc viết, nay đã lỗi thời. Không phải "nợ có sổ" mà là **nợ đã trả mà code
không biết**.

Tiền tố dữ liệu T3STA, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3STA"
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
    print("  %-54s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def count(table, where="1=1"):
    return int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM %s WHERE %s" % (table, where)) or 0)


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    st_id = pr_id = None
    try:
        # ── 1. Nhóm xét nghiệm ──────────────────────────────────────────────
        before = count("LabTestGroups", "Code LIKE N'%s%%'" % TAG)
        st, b = http("POST", "/api/LISComplete/catalog/groups",
                     {"Code": TAG + "-G1", "Name": TAG + " nhom XN", "SortOrder": 1, "IsActive": True})
        case("nhóm xét nghiệm ĐƯỢC ghi xuống LabTestGroups",
             count("LabTestGroups", "Code LIKE N'%s%%'" % TAG) == before + 1,
             "HTTP %s · số dòng %d → %d" % (st, before, count("LabTestGroups", "Code LIKE N'%s%%'" % TAG)))

        # ── 2. Mẫu kết luận ─────────────────────────────────────────────────
        before = count("LabConclusionTemplates", "TemplateCode LIKE N'%s%%'" % TAG)
        st, b = http("POST", "/api/LISComplete/catalog/conclusion-templates",
                     # `Condition` là trường BẮT BUỘC của DTO — lượt đo đầu quên nên nhận 400
                     # "The Condition field is required", request chưa tới service. Lại đúng cái bẫy
                     # "bị từ chối vì lý do KHÁC" đã gặp nhiều lần trong đợt.
                     {"TemplateCode": TAG + "-T1", "TemplateName": TAG + " mau KL",
                      "ConclusionText": "Trong gioi han binh thuong", "Condition": "{}",
                      "IsActive": True})
        case("mẫu kết luận ĐƯỢC ghi xuống LabConclusionTemplates",
             count("LabConclusionTemplates", "TemplateCode LIKE N'%s%%'" % TAG) == before + 1,
             "HTTP %s · số dòng %d → %d" % (st, before,
                                            count("LabConclusionTemplates", "TemplateCode LIKE N'%s%%'" % TAG)))

        # ── 3. Worklist gửi máy phân tích ───────────────────────────────────
        analyzer = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM LabAnalyzers WHERE IsDeleted=0")
        item = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM ServiceRequestDetails WHERE IsDeleted=0")
        if len(analyzer) == 36 and len(item) == 36:
            before = count("LabWorklists", "SampleBarcode LIKE N'%s%%'" % TAG)
            st, b = http("POST", "/api/LISComplete/worklist/create",
                         {"AnalyzerId": analyzer, "OrderIds": [item], "AutoSend": False})
            case("worklist ĐƯỢC ghi xuống LabWorklists",
                 count("LabWorklists", "SampleBarcode LIKE N'%s%%'" % TAG) > before
                 or count("LabWorklists", "LabRequestItemId='%s'" % item) > 0,
                 "HTTP %s · số dòng worklist của item này=%d"
                 % (st, count("LabWorklists", "LabRequestItemId='%s'" % item)))
        else:
            print("  (bỏ qua worklist: thiếu máy phân tích hoặc chỉ định trong DB này)")

        # ── 4. Duyệt đề nghị mua sắm ────────────────────────────────────────
        pr_id = str(uuid.uuid4())
        sql("INSERT INTO ProcurementRequests (Id, RequestCode, RequestDate, Status, TotalAmount, "
            " Notes, CreatedAt, IsDeleted) VALUES "
            "('%s', N'%s-PR', GETUTCDATE(), 1, 0, N'%s', GETUTCDATE(), 0);" % (pr_id, TAG, TAG))
        st, b = http("POST", "/api/warehouse/procurement-requests/%s/approve" % pr_id)
        after = sql("SELECT CAST(Status AS varchar(3)) + '|' + "
                    " CASE WHEN ApprovedDate IS NULL THEN 'khong' ELSE 'co' END "
                    "FROM ProcurementRequests WHERE Id='%s'" % pr_id)
        case("duyệt đề nghị mua sắm ĐƯỢC ghi xuống DB", after.startswith("2|co"),
             "HTTP %s · Status|ApprovedDate = %r (mong đợi '2|co')" % (st, after))

        # ── 5+6. Kiểm kê kho ────────────────────────────────────────────────
        wh = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Warehouses WHERE IsDeleted=0")
        st_id = str(uuid.uuid4())
        sql("INSERT INTO StockTakes (Id, StockTakeCode, StockTakeDate, WarehouseId, PeriodFrom, "
            " PeriodTo, Status, Notes, CreatedAt, IsDeleted) VALUES "
            "('%s', N'%s-KK', GETUTCDATE(), '%s', GETUTCDATE(), GETUTCDATE(), 0, N'%s', GETUTCDATE(), 0);"
            % (st_id, TAG, wh, TAG))
        st, b = http("PUT", "/api/warehouse/stock-takes/%s/results" % st_id, [])
        s_after = sql("SELECT CAST(Status AS varchar(3)) FROM StockTakes WHERE Id='%s'" % st_id)
        case("ghi kết quả kiểm kê ĐƯỢC lưu (trạng thái đổi)", s_after == "1",
             "HTTP %s · Status=%s (0=mới tạo, 1=đang kiểm)" % (st, s_after))

        st, b = http("POST", "/api/warehouse/stock-takes/%s/complete" % st_id)
        s_done = sql("SELECT CAST(Status AS varchar(3)) FROM StockTakes WHERE Id='%s'" % st_id)
        case("hoàn thành kiểm kê ĐƯỢC lưu", s_done == "2",
             "HTTP %s · Status=%s (2=hoàn thành)" % (st, s_done))

    finally:
        try:
            sql("DELETE FROM LabTestGroups WHERE Code LIKE N'%s%%'; "
                "DELETE FROM LabConclusionTemplates WHERE TemplateCode LIKE N'%s%%'; "
                "DELETE FROM LabWorklists WHERE SampleBarcode LIKE N'%s%%'; "
                "DELETE FROM ProcurementRequests WHERE Notes = N'%s'; "
                "DELETE FROM StockTakes WHERE Notes = N'%s';" % (TAG, TAG, TAG, TAG, TAG))
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_stub_group_a.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_stub_group_a.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
