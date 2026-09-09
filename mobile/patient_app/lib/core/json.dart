/// Đọc JSON theo kiểu "chịu được sai lệch", cho những trường mà máy chủ có thể trả bằng nhiều dạng.
///
/// Vì sao cần: app không nói chuyện thẳng với CSDL mà đi qua BFF, và BFF lấy dữ liệu từ HIS. Cùng
/// một trường trạng thái, HIS có thể trả `2` hoặc `"Confirmed"` — chỉ cần bên nào đó đăng ký
/// `JsonStringEnumConverter` là hình dạng đổi, mà app thì cài trên máy người bệnh, không sửa kịp.
/// App còn được đặt để ghép với HIS của đơn vị khác nữa, nên "một dạng duy nhất" là giả định sai.
///
/// Điều quan trọng hơn cả: `json['status'] as int?` gặp chuỗi thì **ném lỗi ngay giữa `fromJson`**,
/// và lỗi đó nổi lên tận `FutureProvider` — cả màn hình rơi vào nhánh lỗi "Không tải được lịch
/// khám" dù máy chủ đã trả về 200 kèm đủ dữ liệu. Người bệnh đặt lịch xong, mở app ra không thấy
/// lịch đâu, và không có gì trên màn nói cho họ biết vì sao.
library;

/// Số nguyên từ `int`, `double` tròn, hay chuỗi số. Không đọc được thì trả [fallback].
int asInt(Object? value, {int fallback = 0}) => tryAsInt(value) ?? fallback;

int? tryAsInt(Object? value) {
  if (value is int) return value;
  if (value is double) return value.toInt();
  if (value is String) return int.tryParse(value.trim());
  return null;
}

/// Số thực từ `num` hoặc chuỗi số. Dùng cho tiền và chỉ số xét nghiệm.
double asDouble(Object? value, {double fallback = 0}) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value.trim()) ?? fallback;
  return fallback;
}

/// `true`/`false` từ bool, số (0/1), hay chuỗi "true"/"1".
bool asBool(Object? value, {bool fallback = false}) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final v = value.trim().toLowerCase();
    if (v == 'true' || v == '1') return true;
    if (v == 'false' || v == '0') return false;
  }
  return fallback;
}

/// Chuỗi từ bất cứ giá trị nào không rỗng — số cũng thành chuỗi được.
String? asString(Object? value) {
  if (value == null) return null;
  if (value is String) return value.isEmpty ? null : value;
  return value.toString();
}

/// Mã trạng thái dạng số, chấp nhận cả tên trạng thái bằng chữ.
///
/// [names] ánh xạ tên → mã, viết thường không dấu cách. Tên lạ (một bản HIS khác đặt tên khác) thì
/// trả [fallback] chứ không ném lỗi: hiện sai một cái nhãn còn hơn mất trắng cả màn hình.
int asStatusCode(Object? value, Map<String, int> names, {int fallback = 0}) {
  final number = tryAsInt(value);
  if (number != null) return number;
  if (value is String) {
    return names[value.trim().toLowerCase().replaceAll(' ', '')] ?? fallback;
  }
  return fallback;
}

/// Ngày giờ từ chuỗi ISO, chấp nhận vài tên trường khác nhau cho cùng một ý.
///
/// `appointmentDate` và `scheduledAt` là cùng một thứ dưới hai cái tên; app đọc được cả hai thì
/// đổi bản BFF hay ghép HIS hãng khác không làm màn hình trống trơn.
DateTime? asDateTime(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final parsed = DateTime.tryParse(json[key] as String? ?? '');
    if (parsed != null) return parsed.toLocal();
  }
  return null;
}
