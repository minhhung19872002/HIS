import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// Máy chủ giả cho bộ chụp màn hình bằng chứng nghiệm thu.
///
/// Vì sao giả **ở tầng HTTP** chứ không giả từng kho dữ liệu: máy chạy bộ chụp (CI, hay máy ảo
/// Android 7.1 trên máy dev) không có BFF, không có PostgreSQL, không có HIS. Nhưng nếu giả ở tầng
/// kho thì ảnh chụp ra chỉ chứng minh được widget vẽ đúng — phần đọc JSON, tức là chỗ hay lệch nhất
/// giữa máy chủ và app, không được chạy qua chút nào.
///
/// Giả ở tầng HTTP thì mọi kho, mọi `fromJson`, mọi provider đều chạy **bằng chính mã thật**;
/// chỉ có nguồn byte là được thay. Ảnh chụp vì thế là bằng chứng cho cả đường ống, không riêng lớp
/// vẽ. Dữ liệu dưới đây khớp đúng hình dạng mà BFF thật trả về — bộ smoke
/// `scripts/smoke-patient-app-*.py` là thứ canh cho hình dạng đó không lệch.
/// Kiểu phản hồi mà máy chủ giả dựng lên, để chụp được cả những trạng thái KHÔNG phải đường vui.
///
/// Quy ước evidence (`docs/architecture/evidence/README.md` §3) đòi ảnh cho *mọi* trạng thái giao
/// diện liên quan, không riêng đường thành công — và với app y tế thì màn lỗi mới là màn đáng soi
/// nhất: nó phải nói được người bệnh nên làm gì tiếp, chứ không phải in ra một mã lỗi.
enum DemoMode {
  /// Dữ liệu đầy đủ, máy chủ trả 200.
  full,

  /// Máy chủ sống nhưng người bệnh chưa có dữ liệu nào — màn phải nói rõ chứ không để trắng.
  empty,

  /// Máy chủ hỏng (500). Màn phải hiện lời giải thích đọc được kèm nút thử lại.
  serverError,

  /// Máy chủ trả lời rất chậm — để bắt được khung hình `loading`.
  ///
  /// Không có chế độ này thì không chụp nổi trạng thái chờ: máy chủ giả trả về tức thì nên màn
  /// hình nhảy thẳng từ trống sang có dữ liệu, không có khung nào ở giữa. Mà với người bệnh ở
  /// vùng sóng yếu thì đây lại là khung hình họ nhìn lâu nhất.
  slow,
}

class DemoBackendAdapter implements HttpClientAdapter {
  DemoBackendAdapter({this.mode = DemoMode.full});

  final DemoMode mode;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? _, Future<void>? __) async {
    final path = options.path;

    if (mode == DemoMode.slow) {
      // Đủ lâu để chụp xong khung hình chờ, đủ ngắn để bộ chụp không hết giờ.
      await Future<void>.delayed(const Duration(seconds: 30));
    }

    if (mode == DemoMode.serverError) {
      return ResponseBody.fromString(
        '{"success":false,"data":null,"message":"Hệ thống bệnh viện đang bận. Vui lòng thử lại sau ít phút.",'
        '"errors":null,"meta":null}',
        500,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
      );
    }

    if (mode == DemoMode.empty) {
      // Danh sách rỗng cho mọi tuyến; các màn hình dạng bảng phải rơi vào nhánh "chưa có gì".
      return ResponseBody.fromString(
        _envelope(_empty),
        200,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
      );
    }

    // Hai tuyến KHÔNG trả JSON bọc trong vỏ `{success,data}` — phải chặn trước khi vào bảng tuyến,
    // nếu không app nhận vỏ JSON ở chỗ nó đang đợi byte ảnh / HTML và hỏng theo kiểu khó lần.
    //
    // Ảnh PACS: trả một PNG THẬT chứ không phải byte rác. `Image.memory` gặp byte không giải mã
    // được sẽ ném lỗi qua `FlutterError.onError` và làm hỏng cả bài kiểm — mà lỗi đó lại chẳng liên
    // quan gì tới thứ đang kiểm. Ảnh thật cũng chứng minh được cả đường ống ảnh chạy tới nơi.
    if (path.contains('/images/')) {
      return ResponseBody.fromBytes(
        _pngPixels,
        200,
        headers: {Headers.contentTypeHeader: ['image/png']},
      );
    }

    // Bản in phiếu xét nghiệm là HTML thô (app nạp thẳng vào khung xem web).
    if (path.endsWith('/report')) {
      return ResponseBody.fromString(
        '<html><body><h1>PHIẾU KẾT QUẢ XÉT NGHIỆM</h1>'
        '<p>Mã phiếu: XN-2026-0001</p></body></html>',
        200,
        headers: {Headers.contentTypeHeader: ['text/html; charset=utf-8']},
      );
    }

    // Khớp theo khoá DÀI NHẤT, không theo thứ tự khai báo: `/results/admissions/x/service-orders`
    // chứa cả `/results/admissions` lẫn `/service-orders`, và chỉ khoá dài mới là câu trả lời đúng.
    // Dựa vào thứ tự khai báo thì thêm một tuyến mới là âm thầm cướp tuyến cũ.
    final matches = _routes.keys.where(path.contains).toList()
      ..sort((a, b) => b.length.compareTo(a.length));

    final body = matches.isEmpty ? _empty : _routes[matches.first]!;

    return ResponseBody.fromString(
      _envelope(body),
      200,
      headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
    );
  }

  @override
  void close({bool force = false}) {}

  static const _empty = '[]';

  /// PNG 8×8 hợp lệ, đứng thay cho ảnh dựng từ PACS.
  static final Uint8List _pngPixels = base64Decode(
      'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGPQiJqGFTEMLQkAPt1GAZiARKAAAAAASUVORK5CYII=');

  /// BFF gói mọi phản hồi trong `{success, data, message}` — giữ nguyên để kho dữ liệu bóc đúng như
  /// khi chạy thật.
  static String _envelope(String data) =>
      '{"success":true,"data":$data,"message":null,"errors":null,"meta":null}';

  /// Tuyến → dữ liệu mẫu. Thứ tự khai báo không quan trọng: khớp theo khoá dài nhất.
  static final Map<String, String> _routes = {
    // ------------------------------------------------------------- lấy số thứ tự
    '/queue/departments': '''
      [{"id":"d1","name":"Khoa Khám bệnh","code":"KKB","availableDoctors":4},
       {"id":"d2","name":"Khoa Nội tổng hợp","code":"NOI","availableDoctors":2},
       {"id":"d3","name":"Khoa Nhi","code":"NHI","availableDoctors":3}]''',
    '/queue/rooms': '''
      [{"roomId":"r1","roomName":"Phòng khám 1","departmentName":"Khoa Khám bệnh",
        "doctorName":"BS.CKI Nguyễn Văn A","waitingCount":8},
       {"roomId":"r2","roomName":"Phòng khám 2","departmentName":"Khoa Khám bệnh",
        "doctorName":"BS. Trần Thị B","waitingCount":3}]''',
    // Cấp số: trả về MỘT vé, kèm `message` — app hiện nguyên văn lời nhắc mang giấy tờ.
    '/queue/take-number': '''
      {"id":"t1","ticketCode":"A-042","queueNumber":42,"roomId":"r1",
       "roomName":"Phòng khám 1","priority":1,"priorityReasonName":"Người cao tuổi",
       "priorityVerified":false,"status":0,"statusName":"Đang chờ","estimatedWaitMinutes":25}''',
    '/queue/tickets': '''
      [{"id":"t1","ticketCode":"A-042","queueNumber":42,"roomId":"r1",
        "roomName":"Phòng khám 1","priority":1,"priorityVerified":false}]''',
    // Màn theo dõi số hỏi lại tuyến này mỗi 20 giây. Phải khai riêng vì nó trả một ĐỐI TƯỢNG,
    // trong khi `/queue/tickets` trả một danh sách — khớp nhầm là màn hình vỡ khi đọc JSON.
    '/queue/tickets/t1/status': '''
      {"ticketId":"t1","ticketCode":"A-042","roomName":"Phòng khám 1","status":0,
       "statusName":"Đang chờ","currentServingTicket":"A-037","peopleAhead":5,
       "estimatedWaitMinutes":25,"priority":1,"priorityVerified":false}''',

    // ------------------------------------------------------------------ đặt khám
    '/appointments/departments': '''
      [{"id":"d1","name":"Khoa Khám bệnh","code":"KKB","availableDoctors":4}]''',
    // Phai khai rieng: `/appointments/doctors` chi chua `/appointments`, nen thieu dong nay thi no
    // roi vao tuyen danh sach lich hen va `Doctor.fromJson` doc phai JSON cua lich hen — o chon
    // bac si hien ra vai dong trong.
    '/appointments/doctors': '''
      [{"id":"bs1","fullName":"Nguyễn Văn A","title":"BS.CKI","specialty":"Nội tổng quát"},
       {"id":"bs2","fullName":"Trần Thị B","title":"BS.","specialty":"Tim mạch"}]''',
    // Tuyen nay tra mot DOI TUONG chia buoi sang/chieu, khong phai mot danh sach phang —
    // khop `HisSlotResult` trong `Connector/HisQueueModels.cs`. Ban cu o day dung `start`/`end`/
    // `remaining`, doc len duoc mot luoi khung gio TRONG, va man dat kham thanh ra khong bam
    // duoc gio nao trong khi may chu van bao 200.
    '/appointments/slots': '''
      {"date":"2026-09-12T00:00:00","departmentName":"Khoa Khám bệnh","doctorName":null,
       "morningSlots":[
         {"startTime":"08:00:00","endTime":"08:30:00","displayTime":"08:00",
          "isAvailable":true,"currentBookings":2,"maxBookings":5},
         {"startTime":"09:00:00","endTime":"09:30:00","displayTime":"09:00",
          "isAvailable":true,"currentBookings":4,"maxBookings":5},
         {"startTime":"10:00:00","endTime":"10:30:00","displayTime":"10:00",
          "isAvailable":false,"currentBookings":5,"maxBookings":5}],
       "afternoonSlots":[
         {"startTime":"14:00:00","endTime":"14:30:00","displayTime":"14:00",
          "isAvailable":true,"currentBookings":1,"maxBookings":5}],
       "totalAvailable":3}''',
    // Hinh dang PHAI khop BFF that (xem `scripts/smoke-patient-app-uat.py` muc "DAT KHAM"):
    // `appointmentDate` + `appointmentTime` roi nhau, `status` la SO. Ban cu o day ghi
    // `scheduledAt` va `status:"Confirmed"` — doc len la nem loi ep kieu, man lich hen roi vao
    // nhanh loi, va anh chup bang chung van bi dan nhan "list" nhu the moi thu binh thuong.
    '/appointments': '''
      [{"id":"a1","appointmentCode":"LH-2026-0007","appointmentDate":"2026-09-12T00:00:00",
        "appointmentTime":"08:00:00","departmentName":"Khoa Khám bệnh",
        "doctorName":"BS.CKI Nguyễn Văn A","roomName":"Phòng khám 1",
        "status":1,"statusName":"Đã xác nhận","reason":"Tái khám tăng huyết áp"}]''',

    // ------------------------------------------------------------ kết quả ngoại trú
    // Ten truong khop `HisVisitSummary` (Connector/HisResultModels.cs): `visitId` + `department`.
    // Ban cu ghi `id`/`visitCode`/`departmentName` — doc len thi ma lan kham rong va the khong hien
    // duoc ten khoa, nhung man khong bao loi gi nen anh chup bang chung trong nhu binh thuong.
    '/results/visits': '''
      [{"visitId":"11111111-1111-1111-1111-111111111111","visitDate":"2026-09-09T07:45:00",
        "visitType":"Ngoại trú","department":"Khoa Khám bệnh","doctorName":"BS.CKI Nguyễn Văn A",
        "diagnosis":"Tăng huyết áp nguyên phát (I10)",
        "summary":"Huyết áp 150/95, kê đơn điều chỉnh liều."}]''',
    '/results/lab/lab-1': _labDetail,
    '/results/lab': '''
      [{"id":"lab-1","orderCode":"XN-2026-0001","serviceName":"Sinh hoá máu","testCategory":"Sinh hoá",
        "orderDate":"2026-09-09T08:00:00","resultDate":"2026-09-09T10:30:00",
        "orderingDoctor":"BS. Trần Thị B","department":"Khoa Khám bệnh",
        "status":"Completed","hasAbnormal":true,"testItems":[]},
       {"id":"lab-2","orderCode":"XN-2026-0002","serviceName":"Huyết học","testCategory":"Huyết học",
        "orderDate":"2026-09-09T08:05:00","status":"Pending","hasAbnormal":false,"testItems":[]}]''',
    // Ten truong khop `HisImagingResult` (Connector/HisResultModels.cs): mo ta la `findings`, ket
    // luan la `impression`. Ban cu goi ca hai la `conclusion` — khong ten nao duoc doc, nen man chi
    // tiet hien "Ket luan" TRONG trong khi may chu van tra 200 va anh chup van trong binh thuong.
    '/results/imaging/img-1/images': '''
      [{"instanceId":"inst-1","seriesNumber":1,"instanceNumber":1,
        "seriesDescription":"Chest CT axial"},
       {"instanceId":"inst-2","seriesNumber":1,"instanceNumber":2,
        "seriesDescription":"Chest CT axial"}]''',
    '/results/imaging/img-1': _imagingDetail,
    '/results/imaging': '[$_imagingDetail]',
    // Khop `HisFunctionalResult`: `testCode` + `testTypeName` + `performingDoctorName` +
    // `statusName`. Ban cu dung `orderCode`/`serviceName`/`performedBy`/`status` — the phieu hien
    // ten dich vu TRONG, va khong bai kiem nao cham vao tab nay nen loi nam im.
    '/results/functional/tdcn-1': _functionalDetail,
    '/results/functional': '[$_functionalDetail]',
    '/results/prescriptions': '''
      [{"id":"rx-1","prescriptionCode":"DT-2026-0031","prescriptionDate":"2026-09-09T11:00:00",
        "status":"Dispensed","isDispensed":true,
        "doctorName":"BS.CKI Nguyễn Văn A","departmentName":"Khoa Khám bệnh",
        "diagnosis":"Tăng huyết áp nguyên phát (I10)","note":"Uống sau ăn, tái khám sau 4 tuần.",
        "items":[
          {"drugName":"Amlodipin 5mg","strength":"5mg","quantity":28,"unit":"viên",
           "dosage":"1 viên","frequency":"1 lần/ngày","durationDays":28,
           "instructions":"Uống buổi sáng sau ăn"},
          {"drugName":"Atorvastatin 20mg","strength":"20mg","quantity":28,"unit":"viên",
           "dosage":"1 viên","frequency":"1 lần/ngày","durationDays":28,
           "instructions":"Uống buổi tối"}]}]''',
    // Khop `HisHealthCheckup`: `recordCode` + `campaignName` + `companyName` +
    // `healthClassification`. Ban cu dung `checkupCode`/`contractName`/`classification`.
    '/results/health-checkups': '''
      [{"id":"ksk-1","recordCode":"KSK-2026-0005","campaignName":"Khám sức khoẻ định kỳ 2026",
        "companyName":"Công ty CP Bluestar","checkupDate":"2026-08-20T08:00:00",
        "healthClassification":"Loại II","conclusion":"Sức khoẻ loại II, đủ điều kiện làm việc.",
        "recommendation":"Khám lại sau 12 tháng.",
        "certificateIssued":true,"certificateNumber":"GCN-2026-0091"}]''',

    // ------------------------------------------------------------ kết quả nội trú
    // Khop `HisAdmission` (Connector/HisResultModels.cs). Ban cu dung `admissionCode`/`admittedAt`/
    // `diagnosis`/`attendingDoctor` va `status` bang chu — khong ten nao trong so do duoc doc,
    // nen the dot dieu tri hien tro tieu de "Dot dieu tri" trong khong va ngay thang bo trong.
    '/results/admissions': '''
      [{"id":"adm-1","medicalRecordCode":"NT-2026-0012","admissionDate":"2026-09-02T14:20:00",
        "dischargeDate":null,"daysOfStay":7,"departmentName":"Khoa Nội tổng hợp",
        "roomName":"Phòng 305","bedName":"Giường 3","admittingDoctorName":"BS.CKII Phạm Văn D",
        "reasonForAdmission":"Sốt cao, ho, khó thở 3 ngày",
        "diagnosisOnAdmission":"Viêm phổi cộng đồng (J18)","dischargeDiagnosis":null,
        "status":1,"statusName":"Đang điều trị","isInProgress":true}]''',
    // Khop `HisMedicineDisclosure`: mot DANH SACH PHANG cac dong thuoc (`items`), moi dong co
    // `medicineName` + `paymentSourceName`, kem ba con so tong o cap ngoai. Ban cu gom theo
    // `days` va goi ten thuoc la `drugName` — khong dong nao doc duoc, tab cong khai thuoc hien
    // "chua co thuoc nao duoc cap phat" trong khi may chu tra du du lieu.
    '/medicine-disclosure': '''
      {"admissionId":"adm-1","fromDate":"2026-09-02T00:00:00","toDate":"2026-09-09T00:00:00",
       "totalAmount":186000,"insuranceAmount":149000,"patientAmount":37000,
       "items":[{"prescriptionDate":"2026-09-08T00:00:00","medicineName":"Ceftriaxon 1g",
                 "activeIngredient":"Ceftriaxon","unit":"lọ","quantity":2,"unitPrice":68000,
                 "amount":136000,"paymentSourceName":"BHYT chi trả 80%",
                 "dosage":"1 lọ","frequency":"2 lần/ngày",
                 "usageInstructions":"Tiêm tĩnh mạch chậm"},
                {"prescriptionDate":"2026-09-08T00:00:00",
                 "medicineName":"Natri clorid 0,9% 500ml","activeIngredient":"Natri clorid",
                 "unit":"chai","quantity":2,"unitPrice":25000,"amount":50000,
                 "paymentSourceName":"BHYT chi trả 80%","dosage":"1 chai",
                 "frequency":"2 lần/ngày","usageInstructions":"Truyền tĩnh mạch"}]}''',
    // Khop `HisServiceOrder`: `requestTypeName` · `executeRoomName` · `orderingDoctor` ·
    // `statusName` · `queueNumber` (CHUOI) · `peopleAhead`. Ban cu dung `departmentName`/
    // `roomName`/`orderedAt`/`status`/`doctorName` va `queueNumber` la SO — the chi dinh mat sach
    // phong thuc hien, trang thai va SO THU TU, dung thu ma HSMT I.2.6.6 doi hoi.
    // ⚠️ Khoá phải DÀI HƠN `/results/admissions`, nếu không luật "khớp khoá dài nhất" trả về danh
    // sách đợt điều trị cho tuyến chỉ định — và tab "Chỉ định CLS" trống trơn dù máy chủ trả 200.
    '/results/admissions/adm-1/service-orders': '''
      [{"id":"so-1","orderCode":"CLS-2026-0101","serviceName":"Chụp X-quang ngực thẳng",
        "requestTypeName":"Chẩn đoán hình ảnh","executeRoomName":"Phòng X-quang 1",
        "orderDate":"2026-09-08T07:30:00","orderingDoctor":"BS.CKII Phạm Văn D",
        "status":1,"statusName":"Chờ thực hiện","queueNumber":"5","peopleAhead":2},
       {"id":"so-2","orderCode":"CLS-2026-0102","serviceName":"Công thức máu",
        "requestTypeName":"Xét nghiệm","executeRoomName":"Phòng lấy mẫu",
        "orderDate":"2026-09-08T07:35:00","orderingDoctor":"BS.CKII Phạm Văn D",
        "status":3,"statusName":"Đã có kết quả","queueNumber":null,"peopleAhead":-1}]''',

    // ------------------------------------------------------------------- gia đình
    '/family/members': '''
      {"maxMembers":20,
       "items":[{"id":"f1","patientCode":"BN000456","name":"Nguyễn Thị Mai","relationship":"Mẹ",
                 "status":"Verified","canViewResults":true,"canBookAppointments":true,
                 "canTakeQueueNumber":true,"verifiedAt":"2026-09-01T10:00:00"},
                {"id":"f2","patientCode":"BN000789","name":"Nguyễn Minh Khang","relationship":"Con",
                 "status":"Pending","canViewResults":false,"canBookAppointments":false,
                 "canTakeQueueNumber":true,"verifiedAt":null}]}''',

    // ------------------------------------------------------------------ ví giấy tờ
    '/documents': '''
      {"usedBytes":2621440,"quotaBytes":104857600,"maxFileBytes":10485760,
       "items":[{"id":"doc-1","category":"IdentityCard","title":"CCCD mặt trước",
                 "fileName":"cccd-truoc.jpg","contentType":"image/jpeg","sizeBytes":1258291,
                 "source":"manual","note":null,"createdAt":"2026-09-01T09:12:00"},
                {"id":"doc-2","category":"InsuranceCard","title":"Thẻ BHYT",
                 "fileName":"bhyt.png","contentType":"image/png","sizeBytes":865280,
                 "source":"manual","note":"Hạn đến 31/12/2026","createdAt":"2026-09-01T09:15:00"},
                {"id":"doc-3","category":"DischargePaper","title":"Giấy ra viện 08/2026",
                 "fileName":"ra-vien.pdf","contentType":"application/pdf","sizeBytes":497869,
                 "source":"his","note":null,"createdAt":"2026-08-28T16:40:00"}]}''',

    // ------------------------------------------------------------------- thông báo
    // Tra thang MOT DANH SACH, khong boc trong {unread, items}: `NotificationRepository.inbox`
    // doc `data` nhu List, va bo smoke UAT cung xac nhan BFF that tra list. Ban cu boc them mot
    // lop nen `data as List?` nem loi ngay, hop thu hien man "khong tai duoc".
    '/notifications/unread-count': '2',
    '/notifications': '''
      [{"id":"n1","title":"Kết quả xét nghiệm đã có",
                 "body":"Phiếu XN-2026-0001 đã có kết quả. Bấm để xem.",
                 "type":"lab_result","isRead":false,"createdAt":"2026-09-09T10:31:00",
                 "data":"{\\"labResultId\\":\\"lab-1\\"}"},
                {"id":"n2","title":"Nhắc lịch khám ngày mai",
                 "body":"08:00 ngày 12/09 tại Phòng khám 1 — BS.CKI Nguyễn Văn A.",
                 "type":"appointment_reminder","isRead":false,
                 "createdAt":"2026-09-11T08:00:00","data":"{\\"appointmentId\\":\\"a1\\"}"},
                {"id":"n3","title":"Tiêm chủng mở rộng tháng 9",
                 "body":"Bệnh viện tổ chức tiêm vắc-xin cúm mùa từ 15/09 đến 30/09.",
                 "type":"campaign","isRead":true,"createdAt":"2026-09-05T07:00:00","data":null}]''',

    // -------------------------------------------------------------------- thiết bị
    '/devices': '''
      [{"id":"dev-1","deviceName":"Máy đang dùng","platform":"android","osVersion":"7.1.1",
        "appVersion":"1.0.0","lastIp":"10.0.0.12","lastSeenAt":"2026-09-09T11:00:00",
        "createdAt":"2026-09-01T09:00:00","biometricEnabled":false,"isCurrent":true},
       {"id":"dev-2","deviceName":"iPhone của tôi","platform":"ios","osVersion":"12.5.7",
        "appVersion":"1.0.0","lastIp":"10.0.0.31","lastSeenAt":"2026-09-07T20:14:00",
        "createdAt":"2026-08-20T18:00:00","biometricEnabled":true,"isCurrent":false}]''',

    // ------------------------------------------------------------------ xoá tài khoản
    // Màn xoá tài khoản đọc bản kê "sẽ mất những gì" trước khi cho bấm nút. Thiếu tuyến này thì
    // màn rơi vào nhánh lỗi và không kiểm được đúng thứ đáng kiểm: người bệnh phải THẤY mình mất gì.
    '/account/deletion-preview': '''
      {"devices":2,"documents":3,"familyLinks":2,"notifications":3}''',

    // ------------------------------------------------- tra cứu cho nhân viên (HSMT I.3 #2.2)
    '/staff/auth/login': '''
      {"token":"staff-token-demo","fullName":"Lê Thị CSKH","roles":["Reception"]}''',
    '/staff/lookup/patients/p1/summary': '''
      {"patient":{"patientId":"p1","patientCode":"BN000123","fullName":"Nguyễn Văn Test",
                  "dateOfBirth":"1975-04-12T00:00:00","gender":1,"phoneNumber":"0912345678",
                  "hasAppAccount":true,"appAccountStatus":"Active","appMustChangePassword":false,
                  "appLastLoginAt":"2026-09-09T07:10:00"},
       "queueTicketsToday":[{"ticketCode":"A-042","roomName":"Phòng khám 1","priority":1}],
       "appointments":[{"appointmentCode":"LH-2026-0007","appointmentDate":"2026-09-12T00:00:00",
                        "departmentName":"Khoa Khám bệnh","statusName":"Đã xác nhận"}],
       "labResults":[{"orderCode":"XN-2026-0001","serviceName":"Sinh hoá máu",
                      "resultDate":"2026-09-09T10:30:00","hasAbnormal":true}],
       "imagingResults":[],"prescriptions":[],"admissions":[]}''',
    '/staff/lookup/patients': '''
      [{"patientId":"p1","patientCode":"BN000123","fullName":"Nguyễn Văn Test",
        "dateOfBirth":"1975-04-12T00:00:00","gender":1,"phoneNumber":"0912345678",
        "hasAppAccount":true,"appAccountStatus":"Active","appMustChangePassword":false,
        "appLastLoginAt":"2026-09-09T07:10:00"}]''',

    // --------------------------------------------------- cấu hình phát hành (không chặn)
    '/app-config': '''
      {"minimumVersion":"1.0.0","latestVersion":"1.0.0","storeUrl":"",
       "updateRequired":false,"updateAvailable":false,
       "maintenanceMessage":null,"supportPhone":"1900 1234"}''',
  };

  /// Một ca CĐHA — dùng chung cho danh sách và cho màn chi tiết, nên không thể lệch nhau.
  static const _imagingDetail = '''
    {"id":"img-1","orderCode":"CDHA-2026-0001","modality":"CT","bodyPart":"Lồng ngực",
     "studyDescription":"CT ngực có tiêm thuốc","orderDate":"2026-09-09T08:50:00",
     "studyDate":"2026-09-09T09:15:00",
     "findings":"Nhu mô phổi hai bên sáng đều. Không thấy hạch trung thất to.",
     "impression":"Không thấy tổn thương khu trú nhu mô phổi hai bên.",
     "recommendations":"Chụp kiểm tra lại sau 6 tháng nếu còn ho kéo dài.",
     "orderingDoctor":"BS.CKI Nguyễn Văn A","reportingDoctor":"BS.CKII Vũ Thị E",
     "status":"Completed","hasImages":true,"imageCount":24}''';

  /// Một phiếu thăm dò chức năng — cũng dùng chung cho danh sách và chi tiết.
  static const _functionalDetail = '''
    {"id":"tdcn-1","testCode":"TDCN-2026-0001","testType":"ECG",
     "testTypeName":"Điện tim 12 chuyển đạo","performedAt":"2026-09-09T09:40:00",
     "performingDoctorName":"KTV. Lê Văn C","deviceName":"Nihon Kohden ECG-2350",
     "clinicalIndication":"Theo dõi tăng huyết áp",
     "findings":"Nhịp xoang đều, không thấy ngoại tâm thu.",
     "conclusion":"Nhịp xoang đều, tần số 78 lần/phút. Không thấy dấu hiệu thiếu máu cơ tim.",
     "recommendation":"Không cần can thiệp thêm.",
     "status":2,"statusName":"Đã có kết quả","imageCount":0,
     "measurements":[{"name":"Tần số tim","value":"78 lần/phút"},
                     {"name":"Trục điện tim","value":"+45 độ"},
                     {"name":"Khoảng QT","value":"398 ms"}]}''';

  static const _labDetail = '''
    {"id":"lab-1","orderCode":"XN-2026-0001","serviceName":"Sinh hoá máu","testCategory":"Sinh hoá",
     "orderDate":"2026-09-09T08:00:00","resultDate":"2026-09-09T10:30:00",
     "orderingDoctor":"BS. Trần Thị B","department":"Khoa Khám bệnh",
     "status":"Completed","hasAbnormal":true,
     "testItems":[
       {"testName":"Glucose","result":"5.2","unit":"mmol/L","normalRange":"3.9 - 6.4",
        "flag":"Normal","interpretation":""},
       {"testName":"AST (GOT)","result":"120","unit":"U/L","normalRange":"5 - 40",
        "flag":"High","interpretation":""},
       {"testName":"ALT (GPT)","result":"98","unit":"U/L","normalRange":"5 - 40",
        "flag":"High","interpretation":""},
       {"testName":"Creatinin","result":"78","unit":"µmol/L","normalRange":"62 - 106",
        "flag":"Normal","interpretation":""},
       {"testName":"Kali","result":"2.6","unit":"mmol/L","normalRange":"3.5 - 5.1",
        "flag":"Critical","interpretation":""}]}''';
}
