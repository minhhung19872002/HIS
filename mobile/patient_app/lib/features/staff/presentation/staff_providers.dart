import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/staff_repository.dart';
import '../domain/staff_models.dart';

/// `Dio` riêng cho luồng nhân viên: cùng máy chủ nhưng KHÔNG có interceptor gắn token người bệnh.
///
/// Token nhân viên được truyền tường minh ở từng lời gọi. Cố ý không lưu vào interceptor để không
/// bao giờ có chuyện một màn hình của người bệnh vô tình đi kèm token nhân viên.
final staffDioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  return Dio(BaseOptions(
    baseUrl: config.apiBaseUrl,
    connectTimeout: config.connectTimeout,
    receiveTimeout: config.receiveTimeout,
    contentType: 'application/json',
  ));
});

final staffRepositoryProvider = Provider<StaffRepository>(
  (ref) => StaffRepository(ref.watch(staffDioProvider)),
);

/// Phiên làm việc của nhân viên.
///
/// Giữ trong bộ nhớ, KHÔNG lưu xuống thiết bị: điện thoại nhân viên hay được dùng chung ở quầy, và
/// một phiên tra cứu sống qua đêm là một phiên không ai chịu trách nhiệm. Đóng app là mất phiên.
class StaffSessionController extends Notifier<StaffSession?> {
  @override
  StaffSession? build() => null;

  void signIn(StaffSession session) => state = session;
  void signOut() => state = null;
}

final staffSessionProvider =
    NotifierProvider<StaffSessionController, StaffSession?>(StaffSessionController.new);
