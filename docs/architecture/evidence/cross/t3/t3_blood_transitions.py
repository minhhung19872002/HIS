"""T3 (#218) — NGÂN HÀNG MÁU: hạn dùng, tương thích nhóm máu, và trạng thái túi máu.

Đây là chỗ rủi ro cao nhất trong cả đợt: truyền nhầm nhóm máu gây tan máu cấp, có thể tử vong, và
không đảo ngược được.

Đọc `BloodBankCompleteService.Orders.cs` và `.IssueRequests.cs` (đều là SQL trần) thấy **không có
một phép kiểm nào** trên đường ghi:

* `AssignBloodBagToPatientAsync` — `UPDATE BloodBags SET Status='Reserved' WHERE Id=@p0`, không đọc
  `Status` cũ, không đọc `ExpiryDate`, không đối chiếu nhóm máu với bệnh nhân.
* `IssueBloodAsync` — `UPDATE BloodBags SET Status='Issued' WHERE Id=@p0`, không kiểm gì, và cũng
  không đọc `BloodIssueRequests.Status` nên phiếu đã bị từ chối vẫn xuất máu được.
* `StartTransfusionAsync` — không đọc kết quả phản ứng chéo. Tệ hơn: câu
  `UPDATE BloodBags SET Status='Transfusing'` chạy **bất kể** câu cập nhật `BloodBagAssignments` ở
  trên có khớp dòng nào không, nên "bắt đầu truyền" được cho một túi chưa hề được gán.
* `RecordCrossMatchResultAsync` — nhận thẳng chuỗi kết quả do người dùng chọn, không tính toán gì.
  Giao diện cũng chỉ là một ô chọn hai giá trị. Nghĩa là **không nơi nào trong hệ thống đối chiếu
  ABO/Rh**, cả máy chủ lẫn giao diện.

`BloodOrders` đã có sẵn `PatientBloodType` và `PatientRhFactor`, tức dữ liệu để đối chiếu vốn nằm
ngay trên phiếu chỉ định.

Bài đo dùng chế phẩm **khối hồng cầu (RBC)** cho các ca tương thích, vì luật ABO của hồng cầu là
luật chặt chẽ và không tranh cãi. Ca cuối là đối chứng ngược: nhóm máu bệnh nhân CHƯA BIẾT thì
KHÔNG được chặn — cấp cứu chảy máu ồ ạt vẫn phải truyền được.

Tiền tố dữ liệu T3MAU, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request, uuid
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3MAU"
CASES = []


def http(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    hdr = {"Content-Type": "application/json"}
    if token:
        hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def payload(body):
    try:
        d = json.loads(body)
    except Exception:
        return {}
    return d.get("data", d) if isinstance(d, dict) else d


def sql(q):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q",
           "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    return (out.stdout or "").strip()


def case(name, must_block, blocked, detail, http_code=None):
    """must_block=True: hệ thống PHẢI từ chối.

    Chặn được thôi chưa đủ: mã HTTP phải là 400 (lỗi nghiệp vụ) chứ không phải 500. Điều dưỡng đọc
    500 thành "lỗi máy chủ" rồi thử lại, thay vì hiểu "không được truyền túi này".
    """
    ok = bool(blocked) == bool(must_block)
    if ok and must_block and http_code is not None and http_code >= 500:
        ok = False
        detail += "  <- chan dung nhung tra 500, phai la 400"
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-52s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def cleanup(patient_ids):
    sql("DELETE FROM BloodBagAssignments WHERE BagCode LIKE '%s%%';" % TAG)
    sql("DELETE FROM BloodIssueItems WHERE BagCode LIKE '%s%%';" % TAG)
    sql("DELETE FROM BloodIssueReceipts WHERE Note LIKE '%s%%';" % TAG)
    sql("DELETE FROM BloodBags WHERE BagCode LIKE '%s%%';" % TAG)
    for pid in [p for p in patient_ids if p]:
        sql("DELETE oi FROM BloodOrderItems oi JOIN BloodOrders o ON o.Id = oi.OrderId WHERE o.PatientId='%s';" % pid)
        sql("DELETE FROM BloodOrders WHERE PatientId='%s';" % pid)
        sql("DELETE FROM BloodIssueRequests WHERE PatientId='%s';" % pid)
        sql("DELETE FROM Patients WHERE Id='%s';" % pid)


def main():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    tok = payload(b)["token"]

    pids = []
    try:
        rbc = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM BloodProductTypes WHERE Code='RBC'")
        if len(rbc) != 36:
            raise SystemExit("không tìm thấy chế phẩm RBC: %r" % rbc)

        def make_bag(code, blood_type, rh, days_to_expiry, status="Available"):
            bid = str(uuid.uuid4())
            sql("INSERT INTO BloodBags (Id, BagCode, BloodType, RhFactor, ProductTypeId, Volume, "
                " CollectionDate, ExpiryDate, Status, IsTestPassed, CreatedAt) VALUES "
                "('%s', N'%s-%s', N'%s', N'%s', '%s', 250, DATEADD(day,-5,GETDATE()), "
                " DATEADD(day,%d,GETDATE()), N'%s', 1, GETDATE());"
                % (bid, TAG, code, blood_type, rh, rbc, days_to_expiry, status))
            return bid

        def make_patient(name, blood_type, rh):
            suffix = str(int(time.time() * 1000))[-8:]
            st, b = http("POST", "/api/Patients", tok, {
                "fullName": "%s %s" % (TAG, name), "dateOfBirth": "1980-04-04T00:00:00",
                "gender": 1, "phoneNumber": "04%s" % suffix[:8], "address": "Số 15 phố Truyền Máu"})
            pid = payload(b).get("id")
            if not pid:
                raise SystemExit("không tạo được bệnh nhân: %s %s" % (st, b[:200]))
            sql("UPDATE Patients SET BloodType=%s, RhFactor=%s WHERE Id='%s'"
                % (("N'%s'" % blood_type) if blood_type else "NULL",
                   ("N'%s'" % rh) if rh else "NULL", pid))
            pids.append(pid)
            return pid

        def make_order(pid, blood_type, rh):
            st, b = http("POST", "/api/BloodBankComplete/orders", tok, {
                "patientId": pid, "visitId": pid, "diagnosis": TAG,
                "clinicalIndication": "Thiếu máu nặng",
                "items": [{"productTypeId": rbc, "bloodType": blood_type or "",
                           "rhFactor": rh or "", "orderedQuantity": 1, "note": TAG}]})
            oid = (payload(b) or {}).get("id")
            if not oid:
                raise SystemExit("không tạo được phiếu chỉ định máu: %s %s" % (st, b[:200]))
            # Nhóm máu bệnh nhân nằm trên phiếu chỉ định — đây là dữ liệu để đối chiếu.
            sql("UPDATE BloodOrders SET PatientBloodType=%s, PatientRhFactor=%s WHERE Id='%s'"
                % (("N'%s'" % blood_type) if blood_type else "NULL",
                   ("N'%s'" % rh) if rh else "NULL", oid))
            item = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM BloodOrderItems WHERE OrderId='%s'" % oid)
            return oid, item

        def assign(item_id, bag_id):
            return http("POST", "/api/BloodBankComplete/orders/items/%s/assign" % item_id, tok,
                        {"bloodBagId": bag_id})

        def bag_status(bag_id):
            return sql("SELECT ISNULL(Status,'?') FROM BloodBags WHERE Id='%s'" % bag_id)

        def assign_count(item_id, bag_id):
            return sql("SELECT COUNT(*) FROM BloodBagAssignments WHERE OrderItemId='%s' AND BloodBagId='%s'"
                       % (item_id, bag_id))

        # ── Đối chứng dương: đúng nhóm, còn hạn ─────────────────────────────
        print("── túi máu hợp lệ (phải CHO qua) ──")
        p_a = make_patient("Nguyen Van A", "A", "+")
        o_a, item_a = make_order(p_a, "A", "+")
        bag_ok = make_bag("OK", "O", "+", 20)
        st, b = assign(item_a, bag_ok)
        case("gán túi O+ cho bệnh nhân A+ (hợp nhóm)", False, assign_count(item_a, bag_ok) == "0",
             "HTTP %s · trạng thái túi=%s" % (st, bag_status(bag_ok)))

        # ── Nhóm máu KHÔNG tương thích ──────────────────────────────────────
        print("\n── nhóm máu không tương thích ──")
        bag_bad = make_bag("BAD", "B", "+", 20)
        st, b = assign(item_a, bag_bad)
        case("gán túi B+ cho bệnh nhân A+ (SAI NHÓM)", True, assign_count(item_a, bag_bad) == "0",
             "HTTP %s · trạng thái túi=%s · %s"
             % (st, bag_status(bag_bad), (payload(b) or {}).get("message", b[:50])), st)

        p_neg = make_patient("Tran Thi Rh Am", "O", "-")
        o_neg, item_neg = make_order(p_neg, "O", "-")
        bag_pos = make_bag("RHPOS", "O", "+", 20)
        st, b = assign(item_neg, bag_pos)
        case("gán túi Rh+ cho bệnh nhân Rh- (SAI Rh)", True, assign_count(item_neg, bag_pos) == "0",
             "HTTP %s · trạng thái túi=%s" % (st, bag_status(bag_pos)), st)

        # ── Túi máu HẾT HẠN ─────────────────────────────────────────────────
        print("\n── túi máu hết hạn ──")
        bag_exp = make_bag("HETHAN", "O", "+", -3)
        st, b = assign(item_a, bag_exp)
        case("gán túi máu ĐÃ HẾT HẠN", True, assign_count(item_a, bag_exp) == "0",
             "HTTP %s · trạng thái túi=%s · %s"
             % (st, bag_status(bag_exp), (payload(b) or {}).get("message", b[:50])), st)

        # ── Túi máu ĐÃ TRUYỀN cho người khác ────────────────────────────────
        print("\n── túi máu đã dùng rồi ──")
        bag_used = make_bag("DADUNG", "O", "+", 20, status="Transfused")
        st, b = assign(item_a, bag_used)
        case("gán lại túi máu ĐÃ TRUYỀN", True, assign_count(item_a, bag_used) == "0",
             "HTTP %s · trạng thái túi=%s" % (st, bag_status(bag_used)), st)

        # ── Bắt đầu truyền một túi CHƯA GÁN ─────────────────────────────────
        print("\n── bắt đầu truyền túi chưa gán ──")
        bag_free = make_bag("CHUAGAN", "O", "+", 20)
        before = bag_status(bag_free)
        st, b = http("POST", "/api/BloodBankComplete/orders/items/%s/start-transfusion" % item_a, tok,
                     {"bloodBagId": bag_free})
        after = bag_status(bag_free)
        case("bắt đầu truyền túi chưa hề được gán", True, after == before,
             "HTTP %s · trạng thái túi trước=%s sau=%s" % (st, before, after), st)

        # ── Phản ứng chéo KHÔNG PHÙ HỢP mà vẫn truyền ───────────────────────
        print("\n── phản ứng chéo không phù hợp ──")
        bag_xm = make_bag("CHEO", "O", "+", 20)
        assign(item_a, bag_xm)
        http("POST", "/api/BloodBankComplete/orders/items/%s/cross-match" % item_a, tok,
             {"bloodBagId": bag_xm, "result": "Không phù hợp", "note": TAG})
        before = bag_status(bag_xm)
        st, b = http("POST", "/api/BloodBankComplete/orders/items/%s/start-transfusion" % item_a, tok,
                     {"bloodBagId": bag_xm})
        after = bag_status(bag_xm)
        case("truyền túi có phản ứng chéo KHÔNG PHÙ HỢP", True, after == before,
             "HTTP %s · trạng thái túi trước=%s sau=%s · %s"
             % (st, before, after, (payload(b) or {}).get("message", b[:45])), st)

        # ── Đường XUẤT MÁU theo phiếu lĩnh ──────────────────────────────────
        print("\n── xuất máu theo phiếu lĩnh ──")
        dept = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Departments WHERE IsDeleted=0 ORDER BY DepartmentCode")

        def make_issue_request(patient_id):
            st, b = http("POST", "/api/BloodBankComplete/issue-requests", tok, {
                "departmentId": dept, "patientId": patient_id, "bloodType": "O", "rhFactor": "+",
                "productTypeId": rbc, "requestedQuantity": 1, "urgency": "Thường",
                "clinicalIndication": TAG, "note": TAG})
            rid = (payload(b) or {}).get("id")
            if not rid:
                raise SystemExit("không tạo được phiếu lĩnh máu: %s %s" % (st, b[:200]))
            return rid

        def issue(request_id, bag_id):
            return http("POST", "/api/BloodBankComplete/issue", tok,
                        {"requestId": request_id, "bloodBagIds": [bag_id], "note": TAG})

        # Phiếu lĩnh CHƯA DUYỆT (vừa tạo, đang 'Pending')
        req_pending = make_issue_request(p_a)
        bag_p = make_bag("PHIEUCHO", "O", "+", 20)
        st, b = issue(req_pending, bag_p)
        case("xuất máu theo phiếu lĩnh CHƯA DUYỆT", True, bag_status(bag_p) == "Available",
             "HTTP %s · trạng thái túi=%s · %s"
             % (st, bag_status(bag_p), (payload(b) or {}).get("message", b[:50])), st)

        # Phiếu lĩnh ĐÃ TỪ CHỐI
        req_rej = make_issue_request(p_a)
        http("POST", "/api/BloodBankComplete/issue-requests/%s/reject" % req_rej, tok, {"reason": TAG})
        bag_r = make_bag("PHIEUHUY", "O", "+", 20)
        st, b = issue(req_rej, bag_r)
        case("xuất máu theo phiếu lĩnh ĐÃ TỪ CHỐI", True, bag_status(bag_r) == "Available",
             "HTTP %s · trạng thái túi=%s" % (st, bag_status(bag_r)), st)

        # Phiếu ĐÃ DUYỆT + túi hợp lệ → phải CHO qua (đối chứng dương)
        req_ok = make_issue_request(p_a)
        http("POST", "/api/BloodBankComplete/issue-requests/%s/approve" % req_ok, tok, {})
        bag_i = make_bag("PHIEUOK", "O", "+", 20)
        st, b = issue(req_ok, bag_i)
        case("xuất máu theo phiếu đã duyệt", False, bag_status(bag_i) != "Issued",
             "HTTP %s · trạng thái túi=%s" % (st, bag_status(bag_i)))

        # Xuất LẠI chính túi vừa xuất
        st, b = issue(req_ok, bag_i)
        n_items = sql("SELECT COUNT(*) FROM BloodIssueItems WHERE BloodBagId='%s'" % bag_i)
        case("xuất lại chính túi máu vừa xuất", True, n_items == "1",
             "HTTP %s · số dòng xuất của túi này=%s" % (st, n_items), st)

        # ── Đối chứng NGƯỢC: chưa biết nhóm máu thì KHÔNG được chặn ─────────
        # Cấp cứu chảy máu ồ ạt: nhóm máu bệnh nhân chưa có kết quả, vẫn phải truyền được máu O.
        print("\n── đối chứng ngược: chưa biết nhóm máu bệnh nhân ──")
        p_unk = make_patient("Le Van Chua Ro", None, None)
        o_unk, item_unk = make_order(p_unk, None, None)
        bag_o = make_bag("CAPCUU", "O", "-", 20)
        st, b = assign(item_unk, bag_o)
        case("chưa biết nhóm máu vẫn truyền được máu O-", False, assign_count(item_unk, bag_o) == "0",
             "HTTP %s · trạng thái túi=%s" % (st, bag_status(bag_o)))

    finally:
        cleanup(pids)
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"] else "hệ thống chặn nhưng phải cho qua"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_blood_transitions.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_blood_transitions.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
