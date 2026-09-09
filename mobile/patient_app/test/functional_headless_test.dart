// Chạy bộ đi-hết-chức-năng ở chế độ không cần máy thật.
//
// Cùng MỘT bộ mã với `integration_test/functional_test.dart`: ở đây nó chạy bằng `flutter test`
// (nhanh, chạy được ngay trên máy lập trình viên và trong mọi bước CI), còn CI chạy thêm lần nữa
// bằng `flutter drive` trên máy ảo Android và simulator iOS để chứng minh trên đúng hai nền tảng.
//
// Giữ một bản mã duy nhất là có chủ đích: chép ra hai bản thì bản chạy nhanh sẽ được sửa, bản chạy
// trên máy thật thì không, và chỗ lệch đó chính là chỗ lỗi lọt qua.
import '../integration_test/functional_test.dart' as functional;

void main() => functional.main();
