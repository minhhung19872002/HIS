import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/error/failure.dart';
import 'results_providers.dart';

/// Bản in phiếu kết quả xét nghiệm — HSMT I.2 #5 ("xem file kết quả xét nghiệm trên app").
///
/// Máy chủ trả HTML in được, đúng như mọi bản in khác của HIS. App hiển thị trong khung xem web nên
/// người bệnh phóng to, cuộn, và dùng chức năng in/chia sẻ của hệ điều hành được.
///
/// Nội dung nạp bằng `loadHtmlString` chứ không trỏ URL: khung xem web không mang theo token của app,
/// nên trỏ URL sẽ nhận 401. Tải bằng client đã xác thực rồi nạp chuỗi vào là cách duy nhất đúng.
class LabReportPage extends ConsumerStatefulWidget {
  const LabReportPage({super.key, required this.resultId, required this.title});

  final String resultId;
  final String title;

  @override
  ConsumerState<LabReportPage> createState() => _LabReportPageState();
}

class _LabReportPageState extends ConsumerState<LabReportPage> {
  final _controller = WebViewController()
    ..setJavaScriptMode(JavaScriptMode.disabled)   // bản in là văn bản tĩnh, không cần kịch bản
    ..setBackgroundColor(Colors.white);

  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final html = await ref.read(resultsRepositoryProvider).labResultReport(widget.resultId);
      await _controller.loadHtmlString(html);
      if (mounted) setState(() => _loading = false);
    } on Failure catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(_error!, textAlign: TextAlign.center),
              ),
            )
          : Stack(
              children: [
                WebViewWidget(controller: _controller),
                if (_loading) const Center(child: CircularProgressIndicator()),
              ],
            ),
    );
  }
}
