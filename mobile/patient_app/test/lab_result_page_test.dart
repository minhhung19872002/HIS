import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/features/results/domain/result_models.dart';
import 'package:patient_app/features/results/presentation/lab_result_page.dart';
import 'package:patient_app/features/results/presentation/results_providers.dart';

/// Màn kết quả xét nghiệm (HSMT I.2 #5).
///
/// Đây là màn hình người bệnh đọc **chỉ số của chính mình**, thường là một mình, thường không có bác
/// sĩ bên cạnh. Ba mệnh đề phải luôn đúng:
///
/// - chỉ số ngoài khoảng tham chiếu **phải** nhìn ra được ngay (không được lẫn vào giữa bảng);
/// - câu "đừng tự chẩn đoán" **luôn** có mặt, kể cả khi mọi chỉ số đều bình thường;
/// - phiếu **chưa có kết quả** không được hiện nút "xem bản in" — bản in của phiếu chờ là tờ giấy
///   trắng, và người bệnh sẽ tưởng hệ thống mất kết quả của họ.
void main() {
  LabResult lab({
    String status = 'Completed',
    bool hasAbnormal = false,
    List<Map<String, dynamic>> items = const [],
  }) =>
      LabResult.fromJson({
        'id': 'lab-1',
        'orderCode': 'XN-2026-0001',
        'serviceName': 'Sinh hoá máu',
        'testCategory': 'Sinh hoá',
        'orderingDoctor': 'BS. Trần Thị B',
        'department': 'Khoa Khám bệnh',
        'status': status,
        'hasAbnormal': hasAbnormal,
        'resultDate': '2026-09-09T10:30:00',
        'testItems': items,
      });

  Future<void> pump(WidgetTester tester, LabResult result) async {
    tester.view.physicalSize = const Size(1080, 2160);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(ProviderScope(
      overrides: [labResultProvider('lab-1').overrideWith((ref) async => result)],
      child: const MaterialApp(home: LabResultPage(resultId: 'lab-1')),
    ));
    await tester.pumpAndSettle();
  }

  const normalItem = {
    'testName': 'ALT', 'result': '22', 'unit': 'U/L', 'normalRange': '5 - 40', 'flag': 'Normal',
  };
  const highItem = {
    'testName': 'AST', 'result': '120', 'unit': 'U/L', 'normalRange': '5 - 40', 'flag': 'High',
  };
  const lowItem = {
    'testName': 'Hemoglobin', 'result': '95', 'unit': 'g/L', 'normalRange': '120 - 160',
    'flag': 'Low',
  };

  testWidgets('Hiện đủ thông tin nhận dạng phiếu', (tester) async {
    await pump(tester, lab(items: const [normalItem]));

    // Các dòng nhận dạng dựng bằng RichText (nhãn đậm + giá trị thường) nên phải bật findRichText.
    expect(find.text('Sinh hoá máu'), findsOneWidget);
    expect(find.textContaining('XN-2026-0001', findRichText: true), findsOneWidget);
    expect(find.textContaining('BS. Trần Thị B', findRichText: true), findsOneWidget);
    expect(find.textContaining('Khoa Khám bệnh', findRichText: true), findsOneWidget);
  });

  testWidgets('Bảng chỉ số hiện đủ kết quả, đơn vị và khoảng tham chiếu', (tester) async {
    await pump(tester, lab(items: const [normalItem, highItem]));

    expect(find.text('ALT'), findsOneWidget);
    expect(find.text('AST'), findsOneWidget);
    expect(find.text('120'), findsOneWidget);
    expect(find.text('5 - 40'), findsNWidgets(2));
  });

  testWidgets('Chỉ số CAO có mũi tên lên, chỉ số THẤP có mũi tên xuống', (tester) async {
    await pump(tester, lab(hasAbnormal: true, items: const [highItem, lowItem]));

    // Chỉ tô đỏ thôi thì người bệnh vẫn phải tự so với khoảng tham chiếu để đoán cao hay thấp.
    expect(find.byIcon(Icons.arrow_upward), findsOneWidget);
    expect(find.byIcon(Icons.arrow_downward), findsOneWidget);
  });

  testWidgets('Chỉ số bất thường được tô màu cảnh báo và in đậm', (tester) async {
    await pump(tester, lab(hasAbnormal: true, items: const [normalItem, highItem]));

    final context = tester.element(find.byType(LabResultPage));
    final errorColor = Theme.of(context).colorScheme.error;

    final abnormal = tester.widget<Text>(find.text('120'));
    expect(abnormal.style?.color, errorColor);
    expect(abnormal.style?.fontWeight, FontWeight.bold);

    final normal = tester.widget<Text>(find.text('22'));
    expect(normal.style?.color, isNot(errorColor));
  });

  testWidgets('Có chỉ số bất thường thì hiện lời khuyên mang kết quả tới bác sĩ', (tester) async {
    await pump(tester, lab(hasAbnormal: true, items: const [highItem]));

    expect(find.textContaining('nằm ngoài khoảng tham chiếu'), findsOneWidget);
    expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
  });

  testWidgets('Mọi chỉ số bình thường thì KHÔNG hù người bệnh', (tester) async {
    await pump(tester, lab(items: const [normalItem]));

    expect(find.textContaining('nằm ngoài khoảng tham chiếu'), findsNothing);
    expect(find.byIcon(Icons.warning_amber_rounded), findsNothing);
  });

  testWidgets('Câu "không tự chẩn đoán" LUÔN có mặt, kể cả khi mọi chỉ số bình thường',
      (tester) async {
    await pump(tester, lab(items: const [normalItem]));
    expect(find.textContaining('không tự chẩn đoán'), findsOneWidget);

    await pump(tester, lab(hasAbnormal: true, items: const [highItem]));
    expect(find.textContaining('không tự chẩn đoán'), findsOneWidget);
  });

  testWidgets('Phiếu chưa có chỉ số nói rõ lý do thay vì để bảng trống', (tester) async {
    await pump(tester, lab(status: 'Pending'));

    expect(find.textContaining('chưa có chỉ số nào'), findsOneWidget);
    expect(find.byType(DataTable), findsNothing);
  });

  testWidgets('Phiếu ĐÃ xong mới hiện nút "Xem bản in"', (tester) async {
    await pump(tester, lab(items: const [normalItem]));
    expect(find.byTooltip('Xem bản in'), findsOneWidget);
  });

  testWidgets('Phiếu CHƯA xong thì KHÔNG hiện nút "Xem bản in"', (tester) async {
    // Bản in của một phiếu đang chờ là tờ giấy trắng — người bệnh sẽ tưởng mất kết quả.
    await pump(tester, lab(status: 'Pending'));
    expect(find.byTooltip('Xem bản in'), findsNothing);
  });
}
