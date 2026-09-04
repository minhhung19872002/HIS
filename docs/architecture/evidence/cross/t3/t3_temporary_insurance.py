"""T3 (#218) — THẺ BHYT TẠM cho trẻ dưới 6 tuổi (CV 3434/BYT-BH): cấp thẻ không lưu, tra thẻ thì bịa.

Thuộc nhóm B của khảo sát §38, nhưng khi mở ra thì **bảng đã có sẵn** (`InsuranceCards`, 18 cột) —
tức đây là nhóm A, tôi xếp nhầm. Lần thứ hai trong đợt phân loại của tôi bị chính dữ liệu lật lại
(lần trước: `CompleteStockTakeAsync` — chú thích bảo "no StockTake table yet" trong khi bảng có 14 cột).

Ba chuyện, nặng dần:

1. `CreateTemporaryInsuranceAsync` **không ghi gì**, và trả `PatientId = Guid.NewGuid()` — một mã
   bệnh nhân không thuộc về ai. Người tiếp đón cấp thẻ cho trẻ, phần mềm in ra số thẻ, **bệnh viện
   không giữ bản ghi nào**.

2. `GetTemporaryInsuranceAsync` **bịa thẻ cho bất kỳ ai**: nó không đọc thẻ đã cấp, mà sinh
   `TemporaryInsuranceNumber = $"TMP-{patientId[..8]}"` cho mọi bệnh nhân truyền vào — kể cả cụ già
   70 tuổi, kèm ngày cấp là hôm nay và ngày hết hạn. Nó không bao giờ trả "chưa có thẻ". Cùng họ với
   vụ ký số tự sinh `Findings = "Ky so tu dong"` (§31): **phần mềm tự tạo ra dữ liệu chưa ai nhập.**
   Và số thẻ hai cửa sinh ra còn **khác nhau** (`TM{timestamp}` khi cấp, `TMP-{id}` khi tra) — nên
   kể cả có lưu thì số in ra lúc cấp cũng không khớp số tra lại.

3. **Hai luật tuổi khác nhau trong cùng một file**, và luật đang dùng để CẤP thì sai:

       CheckTemporaryInsuranceEligibilityAsync   Today.Year - dob.Year <= 6     → nhận trẻ 6 tuổi
       GetTemporaryInsuranceAsync                (Now - dob).TotalDays < 365*6  → dưới 6 tuổi

   Chế độ là **trẻ em DƯỚI 6 tuổi**, thẻ có giá trị đến ngày trẻ đủ 72 tháng. Trừ năm cho nhau còn
   sai cả hai chiều: trẻ sinh 31/12 bị tính già thêm gần một tuổi. Lần thứ mười bảy của hình dạng
   "một luật, hai cửa, mỗi cửa hiểu một kiểu".

Thêm một chi tiết đáng ghi: `InsuranceCards` được `KioskService` ĐỌC để bệnh nhân tự check-in bằng
số thẻ BHYT, nhưng **không chỗ nào trong mã ghi vào bảng đó**. Nên tra cứu ấy luôn trượt.

Bảy ca. Ca 7 là **đối chứng ngược**: trẻ đủ điều kiện phải vẫn cấp được bình thường.

Tiền tố dữ liệu T3BHYT, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3BHYT"
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


def khai(ten, dob):
    return {"patientName": ten, "dateOfBirth": dob.strftime("%Y-%m-%dT00:00:00"), "gender": 1,
            "birthCertificateNumber": "%s-GKS-%s" % (TAG, dob.strftime("%y%m%d")),
            "guardian": {"fullName": "%s Nguoi giam ho" % TAG, "phoneNumber": "0900000001",
                         "relationship": "Me", "identityNumber": "079300000001"},
            "address": "%s dia chi" % TAG}


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    HOM_NAY = datetime.now()
    try:
        # ── Cấp thẻ cho trẻ ĐỦ điều kiện (1 tuổi) ───────────────────────────────────────
        print("── Trẻ 1 tuổi, đủ điều kiện ──")
        st, b = http("POST", "/api/reception/insurance/temporary",
                     khai("%s Be So Sinh" % TAG, HOM_NAY - timedelta(days=365)))
        try:
            card = json.loads(b).get("data") or json.loads(b)
        except Exception:
            card = {}
        so_the = (card or {}).get("temporaryInsuranceNumber") or ""
        pid = (card or {}).get("patientId") or ""

        luu = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM InsuranceCards "
                      "WHERE CardNumber = N'%s'" % so_the.replace("'", "''")) or 0) if so_the else 0
        case("thẻ tạm ĐƯỢC lưu xuống InsuranceCards", luu == 1,
             "HTTP %s · số thẻ=%r · số dòng lưu được=%d" % (st, so_the, luu))

        co_bn = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM Patients WHERE Id='%s'"
                        % pid) or 0) if pid and len(pid) == 36 else 0
        case("hồ sơ trẻ ĐƯỢC tạo thật (không phải Guid bịa)", co_bn == 1,
             "patientId=%r · tra trong Patients thấy %d dòng" % (pid, co_bn))

        # ĐỐI CHỨNG NGƯỢC — không có ca này thì bản vá "từ chối sạch" cũng ăn điểm tuyệt đối.
        han = (card or {}).get("expiryDate") or ""
        du_dk = (card or {}).get("isEligible")
        case("ĐỐI CHỨNG: trẻ đủ điều kiện vẫn cấp được, hạn = ngày tròn 6 tuổi",
             st == 200 and du_dk is True and han[:4] == str((HOM_NAY - timedelta(days=365)).year + 6),
             "HTTP %s · isEligible=%r · hết hạn=%r" % (st, du_dk, han[:10]))

        # ── Tra lại thẻ vừa cấp ─────────────────────────────────────────────────────────
        print("\n── Tra lại thẻ vừa cấp ──")
        st2, b2 = http("GET", "/api/reception/insurance/temporary/%s" % pid) if pid else (-1, "")
        try:
            card2 = json.loads(b2).get("data") or json.loads(b2)
        except Exception:
            card2 = {}
        so_the2 = (card2 or {}).get("temporaryInsuranceNumber") or ""
        case("số thẻ lúc cấp và lúc tra lại KHỚP nhau", bool(so_the) and so_the == so_the2,
             "HTTP %s · cấp=%r · tra lại=%r" % (st2, so_the, so_the2))

        # Người chưa hề được cấp thẻ: KHÔNG được bịa ra số thẻ.
        nguoi_lon = sql("SELECT TOP 1 CAST(p.Id AS varchar(50)) FROM Patients p "
                        "WHERE p.IsDeleted=0 AND p.DateOfBirth IS NOT NULL "
                        " AND p.DateOfBirth < DATEADD(year,-18,GETDATE()) "
                        " AND NOT EXISTS (SELECT 1 FROM InsuranceCards c WHERE c.PatientId=p.Id)")
        st3, b3 = http("GET", "/api/reception/insurance/temporary/%s" % nguoi_lon)
        bia = '"temporaryInsuranceNumber":"' in b3 and '"temporaryInsuranceNumber":""' not in b3
        case("người chưa cấp thẻ: KHÔNG bịa ra số thẻ",
             st3 == 404 and not bia and len(b3.strip()) > 0,
             "HTTP %s · %s" % (st3, (b3[:80] or "<thân rỗng>")))

        # ── Hai luật tuổi ───────────────────────────────────────────────────────────────
        print("\n── Điều kiện tuổi (chế độ: trẻ DƯỚI 6 tuổi) ──")
        st4, b4 = http("POST", "/api/reception/insurance/temporary",
                       khai("%s Tre 8 Tuoi" % TAG, HOM_NAY - timedelta(days=365 * 8)))
        case("trẻ TRÊN 6 tuổi bị TỪ CHỐI cấp", st4 >= 400, "HTTP %s · %s" % (st4, b4[:80]))

        # Vừa tròn 6 tuổi (72 tháng) thì hết chế độ. Luật trừ-năm cũ cho ra 6 <= 6 ⇒ vẫn nhận.
        st5, b5 = http("POST", "/api/reception/insurance/temporary",
                       khai("%s Tre Tron 6 Tuoi" % TAG, HOM_NAY - timedelta(days=365 * 6 + 2)))
        case("trẻ vừa tròn 6 tuổi (72 tháng) không còn đủ điều kiện", st5 >= 400,
             "HTTP %s · %s" % (st5, b5[:80]))

    finally:
        try:
            sql("DELETE FROM InsuranceCards WHERE PatientId IN "
                " (SELECT Id FROM Patients WHERE FullName LIKE N'%s%%'); "
                "DELETE FROM Patients WHERE FullName LIKE N'%s%%';" % (TAG, TAG))
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:90])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_temporary_insurance.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_temporary_insurance.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
