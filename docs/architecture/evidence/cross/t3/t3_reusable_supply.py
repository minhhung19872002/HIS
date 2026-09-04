"""T3 (#218) — VẬT TƯ TÁI SỬ DỤNG: cả sổ theo dõi tiệt khuẩn được BỊA RA TỪ HASH CỦA Id.

Đây là ca trơ trẽn nhất trong đợt. Đường đọc `GetReusableSuppliesAsync` không đọc bản ghi nào — nó
lấy 30 dòng danh mục `MedicalSupplies` rồi **sinh số từ hash**:

    int current  = (s.Id.GetHashCode() & 0x7fffffff) % max;                 // số lần đã tái sử dụng
    int stat     = idx % 10 switch { ... };                                 // trạng thái theo VỊ TRÍ trong danh sách
    var lastSter = today.AddDays(-((s.Id.GetHashCode() & 0xff) % 25 + 1));   // ngày tiệt khuẩn gần nhất

kèm chú thích thành thật:

    // Demo: synthesize a deterministic reusable-supply list from existing
    // MedicalSupplies catalog since there is no dedicated tracking table.

Màn hình này nói cho nhân viên kiểm soát nhiễm khuẩn biết **dụng cụ nào đã tiệt khuẩn, tiệt khuẩn
lúc nào, và đã tái sử dụng bao nhiêu lần**. Giới hạn số lần tái sử dụng tồn tại vì dụng cụ xuống cấp.
Mọi con số trên màn hình ấy đang là một phép băm trên Id của dòng danh mục.

Hai cửa ghi cũng chỉ dội lại DTO:

    UpdateReusableSupplyStatusAsync   `await Task.CompletedTask` rồi trả DTO — và KHÔNG CÓ ROUTE
    RecordSterilizationAsync          trả `CurrentReuseCount = 0` cứng, bất kể dụng cụ đã dùng mấy lần

Cái `CurrentReuseCount = 0` ấy đáng nói riêng: nếu có ai nối nó vào dữ liệu thật, mỗi lần tiệt khuẩn
sẽ **xoá sạch lịch sử tái sử dụng** của dụng cụ — đúng con số dùng để quyết định khi nào loại bỏ.

Bảy ca. Ca 7 là **đối chứng ngược**: dụng cụ còn hạn dùng lại thì tiệt khuẩn phải vẫn chạy được.

Bài đo cố ý chạy được ở CẢ HAI trạng thái mã: nó gieo một dòng `MedicalSupplies` có mã sắp xếp lên
đầu, nên bản cũ (bịa từ danh mục) cũng trả về dòng ấy — chỉ khác là mọi con số đều sai.

Tiền tố dữ liệu T3VT, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3VT"
CODE = "AAA-%s-01" % TAG          # sắp lên đầu để lọt vào 30 dòng bản cũ lấy ra
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
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:150], text[:250]))
    return text


def case(name, ok, detail):
    CASES.append({"case": name, "pass": bool(ok), "detail": detail})
    print("  %-56s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def rows_of(b):
    try:
        d = json.loads(b)
        d = d.get("data", d)
        return d if isinstance(d, list) else []
    except Exception:
        return []


def find(rows, code):
    return next((r for r in rows if (r.get("itemCode") or "") == code), None)


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    supply_id = str(uuid.uuid4())
    inst_id = str(uuid.uuid4())
    inst2_id = str(uuid.uuid4())
    het_id = str(uuid.uuid4())
    co_bang = False
    try:
        sql("INSERT INTO MedicalSupplies (Id, SupplyCode, SupplyName, Unit, UnitPrice, "
            " InsurancePrice, IsActive, IsMedical, SupplyType, IsInsuranceCovered, "
            " InsurancePaymentRate, IsReusable, CreatedAt, IsDeleted) VALUES "
            "('%s', N'%s', N'%s Kim ke tai su dung', N'Cai', 0, 0, 1, 1, 1, 0, 0, 1, "
            " GETUTCDATE(), 0);" % (supply_id, CODE, TAG))

        # Ba hiện vật: một để đo bình thường, một để kiểm "đổi A không đụng B", một đã hết số lần dùng.
        try:
            sql("INSERT INTO ReusableSupplyInstances (Id, InstanceCode, SupplyId, Status, "
                " MaxReuseCount, CurrentReuseCount, CreatedAt, IsDeleted) VALUES "
                "('%s', N'%s', '%s', 1, 10, 4, GETUTCDATE(), 0), "
                "('%s', N'%s-B', '%s', 1, 10, 4, GETUTCDATE(), 0), "
                "('%s', N'%s-HET', '%s', 1, 10, 10, GETUTCDATE(), 0);"
                % (inst_id, CODE, supply_id, inst2_id, CODE, supply_id, het_id, CODE, supply_id))
            co_bang = True
        except SystemExit:
            co_bang = False  # chưa có bảng = đúng điều đang đo

        st, b = http("GET", "/api/warehouse/reusable-supplies")
        rows = rows_of(st and b)
        row = find(rows, CODE)
        rid = (row or {}).get("id") or inst_id

        print("── Ghi nhận tiệt khuẩn ──")
        truoc = (row or {}).get("currentReuseCount")
        ngay = (datetime.now() - timedelta(days=3)).replace(microsecond=0)
        st2, b2 = http("POST", "/api/warehouse/reusable-supplies/%s/sterilize" % rid,
                       ngay.strftime("%Y-%m-%dT%H:%M:%S"))
        rows2 = rows_of(http("GET", "/api/warehouse/reusable-supplies")[1])
        row2 = find(rows2, CODE) or {}
        ngay_doc = (row2.get("lastSterilizationDate") or "")[:10]
        case("ngày tiệt khuẩn đọc lại ĐÚNG ngày vừa ghi",
             ngay_doc == ngay.strftime("%Y-%m-%d"),
             "HTTP %s · ghi %s · đọc lại %r" % (st2, ngay.strftime("%Y-%m-%d"), ngay_doc))

        sau = row2.get("currentReuseCount")
        case("tiệt khuẩn làm số lần tái sử dụng TĂNG, không nhảy về 0",
             truoc is not None and sau == truoc + 1,
             "trước=%r · sau=%r (mong %s)" % (truoc, sau, (truoc + 1) if truoc is not None else "?"))

        try:
            n_log = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM SterilizationLogs "
                            "WHERE InstanceId='%s'" % rid) or 0)
        except SystemExit:
            n_log = 0
        case("mỗi lần tiệt khuẩn để lại một dòng nhật ký truy vết", n_log == 1,
             "số dòng nhật ký=%d" % n_log)

        print("\n── Đổi trạng thái ──")
        st3, b3 = http("PUT", "/api/warehouse/reusable-supplies/%s/status" % rid, 3)
        rows3 = rows_of(http("GET", "/api/warehouse/reusable-supplies")[1])
        row3 = find(rows3, CODE) or {}
        doi_duoc = row3.get("status") == 3
        case("đổi trạng thái ĐƯỢC lưu (đọc lại thấy trạng thái mới)", doi_duoc,
             "HTTP %s · trạng thái đọc lại=%r (mong 3)" % (st3, row3.get("status")))

        # Đòi ca trên đã đạt: nếu không đổi được gì thì "B không bị ảnh hưởng" là hiển nhiên và
        # vô nghĩa — bài học PASS rỗng ở §23/§44.
        # Tìm theo MÃ HIỆN VẬT, không phải mã danh mục: ba hiện vật này cùng một dòng danh mục nên
        # `itemCode` của chúng giống hệt nhau. Chính chỗ này làm lộ ra DTO chưa có ô `instanceCode`,
        # tức màn hình không phân biệt được hai cái kìm cùng loại — đã bổ sung.
        rowB = next((r for r in rows3 if (r.get("instanceCode") or "") == CODE + "-B"), None)
        case("đổi trạng thái vật tư A KHÔNG đụng vật tư B",
             doi_duoc and rowB is not None and rowB.get("status") == 1,
             "có đổi được A=%s · trạng thái B=%r (mong 1)" % (doi_duoc, (rowB or {}).get("status")))

        print("\n── Vật tư đã hết số lần dùng ──")
        rowH = next((r for r in rows3 if (r.get("itemCode") or "") == CODE + "-HET"), None)
        st4, b4 = http("PUT", "/api/warehouse/reusable-supplies/%s/status"
                       % ((rowH or {}).get("id") or het_id), 1)
        case("vật tư ĐÃ HẾT số lần dùng không đặt lại 'sẵn sàng' được",
             co_bang and st4 >= 400, "HTTP %s · %s" % (st4, b4[:70]))

        # ĐỐI CHỨNG NGƯỢC — không có ca này thì bản vá "chặn sạch" cũng ăn điểm.
        print("\n── Đối chứng ──")
        st5, b5 = http("POST", "/api/warehouse/reusable-supplies/%s/sterilize" % rid,
                       datetime.now().replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%S"))
        rows5 = rows_of(http("GET", "/api/warehouse/reusable-supplies")[1])
        row5 = find(rows5, CODE) or {}
        case("ĐỐI CHỨNG: vật tư còn hạn dùng lại vẫn tiệt khuẩn được, về 'sẵn sàng'",
             st5 == 200 and row5.get("status") == 1,
             "HTTP %s · trạng thái sau tiệt khuẩn=%r" % (st5, row5.get("status")))

    finally:
        try:
            sql("IF OBJECT_ID('SterilizationLogs') IS NOT NULL "
                " DELETE FROM SterilizationLogs WHERE InstanceId IN "
                "  (SELECT Id FROM ReusableSupplyInstances WHERE SupplyId='%s'); "
                "IF OBJECT_ID('ReusableSupplyInstances') IS NOT NULL "
                " DELETE FROM ReusableSupplyInstances WHERE SupplyId='%s'; "
                "DELETE FROM MedicalSupplies WHERE Id='%s';"
                % (supply_id, supply_id, supply_id))
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:90])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_reusable_supply.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_reusable_supply.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
