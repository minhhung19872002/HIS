"""T3 (#218) — MẪU KẾT QUẢ CĐHA: cả cụm là hardcode, soạn mẫu thì mất, xoá thì không xoá.

Bảy hàm, không hàm nào chạm tới cơ sở dữ liệu:

    GetResultTemplatesAsync            ┐
    GetResultTemplatesByServiceTypeAsync│  đều `return Task.FromResult(GetDefaultTemplates())`
    GetResultTemplatesByServiceAsync    │  — cùng một danh sách dựng cứng trong mã
    GetResultTemplatesByGenderAsync     │
    GetAllResultTemplatesAsync         ┘
    SaveResultTemplateAsync             dội lại chính DTO người dùng vừa gửi lên, không ghi gì
    DeleteResultTemplateAsync           `return Task.FromResult(true)` — không xoá gì

Hậu quả với người dùng: bác sĩ soạn mẫu mô tả riêng cho khoa mình, bấm lưu, phần mềm báo xong; mở
lại thì mẫu biến mất. Bấm xoá một mẫu, phần mềm báo xong; mở lại mẫu vẫn còn.

Và hai đường đọc **"lọc theo dịch vụ"** với **"lọc theo giới tính"** thì lọc trên chính danh sách
cứng ấy, nên chúng luôn trả cùng một kết quả bất kể tham số.

Bảng `RadiologyReportTemplates` đã tồn tại (16 cột) — lại là **nhóm A**, chỉ thiếu đường ghi. Nhưng
nó thiếu đúng ba cột mà hai đường đọc kia cần (`ServiceId`, `Gender`, `IsDefault`) ⇒ migration 180.

Sáu ca. Ca 6 là **đối chứng ngược**: mẫu vừa soạn phải xuất hiện ở đường đọc chung — không có nó thì
một bản vá "không trả gì cả" cũng ăn điểm ở năm ca đầu.

Tiền tố dữ liệu T3MAU, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3MAU"
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
    print("  %-54s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def data_of(b):
    try:
        d = json.loads(b)
        return d.get("data", d)
    except Exception:
        return None


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    try:
        svc = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Services WHERE IsDeleted=0")
        svc_khac = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Services "
                       "WHERE IsDeleted=0 AND Id <> '%s'" % svc)
        MO_TA = "%s-MO-TA-RIENG-CUA-KHOA" % TAG

        print("── Soạn mẫu mới ──")
        st, b = http("POST", "/api/RISComplete/templates",
                     {"code": "%s-01" % TAG, "name": "%s Mau sieu am" % TAG, "serviceId": svc,
                      "gender": "Female", "descriptionTemplate": MO_TA,
                      "conclusionTemplate": "%s-KET-LUAN" % TAG, "sortOrder": 1,
                      "isDefault": False, "isActive": True})
        saved = data_of(b) or {}
        tid = saved.get("id") or ""
        try:
            luu = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RadiologyReportTemplates "
                          "WHERE TemplateCode = N'%s-01' AND IsDeleted=0" % TAG) or 0)
        except SystemExit:
            luu = 0
        case("mẫu ĐƯỢC lưu xuống bảng", luu == 1,
             "HTTP %s · id=%r · số dòng lưu được=%d" % (st, tid[:8], luu))

        # Mở lại danh sách: mẫu vừa soạn phải có mặt.
        st2, b2 = http("GET", "/api/RISComplete/templates")
        ds = data_of(b2) or []
        thay = any((t.get("code") or "") == "%s-01" % TAG for t in ds) if isinstance(ds, list) else False
        case("ĐỐI CHỨNG: mở lại danh sách vẫn thấy mẫu vừa soạn", thay,
             "HTTP %s · %d mẫu · thấy mẫu vừa soạn=%s" % (st2, len(ds) if isinstance(ds, list) else -1, thay))

        print("\n── Lọc theo dịch vụ và theo giới tính ──")
        st3, b3 = http("GET", "/api/RISComplete/templates/by-service/%s" % svc_khac)
        ds3 = data_of(b3) or []
        lot = any((t.get("code") or "") == "%s-01" % TAG for t in ds3) if isinstance(ds3, list) else True
        # Đòi `luu == 1`: nếu mẫu chưa từng được lưu thì "không lọt sang dịch vụ khác" là điều
        # hiển nhiên và vô nghĩa — ca đo sẽ PASS cho một bản cài đặt không ghi gì. Bài học §23.
        case("lọc theo dịch vụ KHÁC không trả mẫu của dịch vụ này", luu == 1 and not lot,
             "HTTP %s · có mẫu để lọc=%s · mẫu lọt sang dịch vụ khác=%s" % (st3, luu == 1, lot))

        st4, b4 = http("GET", "/api/RISComplete/templates/by-gender/Male")
        ds4 = data_of(b4) or []
        lot4 = any((t.get("code") or "") == "%s-01" % TAG for t in ds4) if isinstance(ds4, list) else True
        case("mẫu chỉ dùng cho NỮ không hiện ở lọc giới tính NAM", luu == 1 and not lot4,
             "HTTP %s · có mẫu để lọc=%s · mẫu nữ lọt sang nam=%s" % (st4, luu == 1, lot4))

        print("\n── Sửa và xoá ──")
        st5, b5 = http("POST", "/api/RISComplete/templates",
                       {"id": tid, "code": "%s-01" % TAG, "name": "%s Mau sieu am (sua)" % TAG,
                        "serviceId": svc, "gender": "Female",
                        "descriptionTemplate": "%s-DA-SUA" % TAG,
                        "conclusionTemplate": "%s-KET-LUAN" % TAG, "sortOrder": 1,
                        "isDefault": False, "isActive": True})
        try:
            n_sau_sua = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RadiologyReportTemplates "
                                "WHERE TemplateCode=N'%s-01' AND IsDeleted=0 "
                                " AND FindingsTemplate=N'%s-DA-SUA'" % (TAG, TAG)) or 0)
            tong = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RadiologyReportTemplates "
                           "WHERE TemplateCode=N'%s-01' AND IsDeleted=0" % TAG) or 0)
        except SystemExit:
            n_sau_sua = tong = 0
        case("sửa mẫu ghi đè bản cũ, không đẻ thêm dòng", n_sau_sua == 1 and tong == 1,
             "HTTP %s · dòng đã sửa=%d · tổng dòng cùng mã=%d" % (st5, n_sau_sua, tong))

        # Cũng vậy: phải có dòng TRƯỚC khi xoá thì "sau khi xoá còn 0 dòng" mới nói lên điều gì.
        try:
            truoc_xoa = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RadiologyReportTemplates "
                                "WHERE TemplateCode=N'%s-01' AND IsDeleted=0" % TAG) or 0)
        except SystemExit:
            truoc_xoa = 0
        st6, b6 = http("DELETE", "/api/RISComplete/templates/%s" % tid)
        try:
            con = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RadiologyReportTemplates "
                          "WHERE TemplateCode=N'%s-01' AND IsDeleted=0" % TAG) or 0)
        except SystemExit:
            con = 1
        case("xoá mẫu thì mẫu THẬT SỰ biến mất", truoc_xoa == 1 and con == 0,
             "HTTP %s · trước khi xoá có %d dòng · sau khi xoá còn %d" % (st6, truoc_xoa, con))

    finally:
        try:
            sql("IF OBJECT_ID('RadiologyReportTemplates') IS NOT NULL "
                " DELETE FROM RadiologyReportTemplates WHERE TemplateCode LIKE N'%s-%%';" % TAG)
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:90])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_radiology_templates.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_radiology_templates.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
