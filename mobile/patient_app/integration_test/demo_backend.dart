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
    '/appointments/slots': '''
      [{"start":"2026-09-12T08:00:00","end":"2026-09-12T08:30:00","doctorId":"bs1",
        "doctorName":"BS.CKI Nguyễn Văn A","roomName":"Phòng khám 1","remaining":3},
       {"start":"2026-09-12T09:00:00","end":"2026-09-12T09:30:00","doctorId":"bs2",
        "doctorName":"BS. Trần Thị B","roomName":"Phòng khám 2","remaining":1}]''',
    '/appointments': '''
      [{"id":"a1","appointmentCode":"LH-2026-0007","scheduledAt":"2026-09-12T08:00:00",
        "departmentName":"Khoa Khám bệnh","doctorName":"BS.CKI Nguyễn Văn A",
        "roomName":"Phòng khám 1","status":"Confirmed","reason":"Tái khám tăng huyết áp"}]''',

    // ------------------------------------------------------------ kết quả ngoại trú
    '/results/visits': '''
      [{"id":"v1","examinationId":"e1","visitCode":"KB-2026-0912","visitDate":"2026-09-09T07:45:00",
        "departmentName":"Khoa Khám bệnh","doctorName":"BS.CKI Nguyễn Văn A",
        "diagnosis":"Tăng huyết áp nguyên phát (I10)"}]''',
    '/results/lab/lab-1': _labDetail,
    '/results/lab': '''
      [{"id":"lab-1","orderCode":"XN-2026-0001","serviceName":"Sinh hoá máu","testCategory":"Sinh hoá",
        "orderDate":"2026-09-09T08:00:00","resultDate":"2026-09-09T10:30:00",
        "orderingDoctor":"BS. Trần Thị B","department":"Khoa Khám bệnh",
        "status":"Completed","hasAbnormal":true,"testItems":[]},
       {"id":"lab-2","orderCode":"XN-2026-0002","serviceName":"Huyết học","testCategory":"Huyết học",
        "orderDate":"2026-09-09T08:05:00","status":"Pending","hasAbnormal":false,"testItems":[]}]''',
    '/results/imaging': '''
      [{"id":"img-1","orderCode":"CDHA-2026-0001","modality":"CT","bodyPart":"Lồng ngực",
        "studyDescription":"CT ngực có tiêm thuốc","studyDate":"2026-09-09T09:15:00",
        "conclusion":"Không thấy tổn thương khu trú nhu mô phổi hai bên.",
        "orderingDoctor":"BS.CKI Nguyễn Văn A","status":"Completed",
        "hasImages":true,"imageCount":24}]''',
    '/results/functional': '''
      [{"id":"tdcn-1","orderCode":"TDCN-2026-0001","serviceName":"Điện tim 12 chuyển đạo",
        "performedAt":"2026-09-09T09:40:00","performedBy":"KTV. Lê Văn C",
        "conclusion":"Nhịp xoang đều, tần số 78 lần/phút. Không thấy dấu hiệu thiếu máu cơ tim.",
        "status":"Completed",
        "measurements":[{"name":"Tần số tim","value":"78","unit":"lần/phút"},
                        {"name":"Trục điện tim","value":"+45","unit":"độ"}]}]''',
    '/results/prescriptions': '''
      [{"id":"rx-1","prescriptionCode":"DT-2026-0031","issuedAt":"2026-09-09T11:00:00",
        "doctorName":"BS.CKI Nguyễn Văn A","departmentName":"Khoa Khám bệnh",
        "diagnosis":"Tăng huyết áp nguyên phát (I10)","note":"Uống sau ăn, tái khám sau 4 tuần.",
        "items":[
          {"drugName":"Amlodipin 5mg","strength":"5mg","quantity":28,"unit":"viên",
           "dosage":"1 viên","frequency":"1 lần/ngày","durationDays":28,
           "instructions":"Uống buổi sáng sau ăn"},
          {"drugName":"Atorvastatin 20mg","strength":"20mg","quantity":28,"unit":"viên",
           "dosage":"1 viên","frequency":"1 lần/ngày","durationDays":28,
           "instructions":"Uống buổi tối"}]}]''',
    '/results/health-checkups': '''
      [{"id":"ksk-1","checkupCode":"KSK-2026-0005","contractName":"Công ty CP Bluestar",
        "checkupDate":"2026-08-20T08:00:00","conclusion":"Sức khoẻ loại II",
        "classification":"Loại II","status":"Completed"}]''',

    // ------------------------------------------------------------ kết quả nội trú
    '/results/admissions': '''
      [{"id":"adm-1","admissionCode":"NT-2026-0012","departmentName":"Khoa Nội tổng hợp",
        "roomName":"Phòng 305","bedName":"Giường 3","admittedAt":"2026-09-02T14:20:00",
        "dischargedAt":null,"diagnosis":"Viêm phổi cộng đồng (J18)","status":"Đang điều trị",
        "attendingDoctor":"BS.CKII Phạm Văn D"}]''',
    '/medicine-disclosure': '''
      {"admissionCode":"NT-2026-0012","patientName":"Nguyễn Văn Demo",
       "days":[{"date":"2026-09-08T00:00:00","total":186000,"insurancePaid":149000,
                "patientPaid":37000,
                "items":[{"drugName":"Ceftriaxon 1g","unit":"lọ","quantity":2,"unitPrice":68000,
                          "amount":136000,"insuranceRate":80},
                         {"drugName":"Natri clorid 0,9% 500ml","unit":"chai","quantity":2,
                          "unitPrice":25000,"amount":50000,"insuranceRate":80}]}]}''',
    '/service-orders': '''
      [{"id":"so-1","serviceName":"Chụp X-quang ngực thẳng","departmentName":"Khoa CĐHA",
        "roomName":"Phòng X-quang 1","orderedAt":"2026-09-08T07:30:00","status":"Chờ thực hiện",
        "queueNumber":5,"doctorName":"BS.CKII Phạm Văn D"},
       {"id":"so-2","serviceName":"Công thức máu","departmentName":"Khoa Xét nghiệm",
        "roomName":"Phòng lấy mẫu","orderedAt":"2026-09-08T07:35:00","status":"Đã có kết quả",
        "queueNumber":null,"doctorName":"BS.CKII Phạm Văn D"}]''',

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
    '/notifications': '''
      {"unread":2,
       "items":[{"id":"n1","title":"Kết quả xét nghiệm đã có",
                 "body":"Phiếu XN-2026-0001 đã có kết quả. Bấm để xem.",
                 "type":"lab_result","isRead":false,"createdAt":"2026-09-09T10:31:00",
                 "data":"{\\"labResultId\\":\\"lab-1\\"}"},
                {"id":"n2","title":"Nhắc lịch khám ngày mai",
                 "body":"08:00 ngày 12/09 tại Phòng khám 1 — BS.CKI Nguyễn Văn A.",
                 "type":"appointment_reminder","isRead":false,
                 "createdAt":"2026-09-11T08:00:00","data":"{\\"appointmentId\\":\\"a1\\"}"},
                {"id":"n3","title":"Tiêm chủng mở rộng tháng 9",
                 "body":"Bệnh viện tổ chức tiêm vắc-xin cúm mùa từ 15/09 đến 30/09.",
                 "type":"campaign","isRead":true,"createdAt":"2026-09-05T07:00:00","data":null}]}''',

    // -------------------------------------------------------------------- thiết bị
    '/devices': '''
      [{"id":"dev-1","deviceName":"Máy đang dùng","platform":"android","osVersion":"7.1.1",
        "appVersion":"1.0.0","lastIp":"10.0.0.12","lastSeenAt":"2026-09-09T11:00:00",
        "createdAt":"2026-09-01T09:00:00","biometricEnabled":false,"isCurrent":true},
       {"id":"dev-2","deviceName":"iPhone của tôi","platform":"ios","osVersion":"12.5.7",
        "appVersion":"1.0.0","lastIp":"10.0.0.31","lastSeenAt":"2026-09-07T20:14:00",
        "createdAt":"2026-08-20T18:00:00","biometricEnabled":true,"isCurrent":false}]''',

    // --------------------------------------------------- cấu hình phát hành (không chặn)
    '/app-config': '''
      {"minimumVersion":"1.0.0","latestVersion":"1.0.0","storeUrl":"",
       "updateRequired":false,"updateAvailable":false,
       "maintenanceMessage":null,"supportPhone":"1900 1234"}''',
  };

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
