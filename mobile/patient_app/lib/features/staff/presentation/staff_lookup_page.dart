import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/error/failure.dart';
import '../../../core/theme/app_theme.dart';
import '../domain/staff_models.dart';
import 'staff_providers.dart';

final _day = DateFormat('dd/MM/yyyy');

/// Module tra cứu trên điện thoại của nhân viên — HSMT I.3 #2.2.
///
/// Chưa đăng nhập thì hiện màn đăng nhập; đăng nhập rồi thì hiện ô tra cứu. Gộp vào một trang vì đây
/// là một luồng liền mạch của cùng một người, không phải hai tính năng.
class StaffLookupPage extends ConsumerWidget {
  const StaffLookupPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(staffSessionProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tra cứu cho nhân viên'),
        actions: [
          if (session != null)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Thoát',
              onPressed: () => ref.read(staffSessionProvider.notifier).signOut(),
            ),
        ],
      ),
      body: session == null ? const _StaffLoginForm() : _StaffSearch(session: session),
    );
  }
}

class _StaffLoginForm extends ConsumerStatefulWidget {
  const _StaffLoginForm();

  @override
  ConsumerState<_StaffLoginForm> createState() => _StaffLoginFormState();
}

class _StaffLoginFormState extends ConsumerState<_StaffLoginForm> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final session = await ref
          .read(staffRepositoryProvider)
          .login(username: _username.text.trim(), password: _password.text);
      ref.read(staffSessionProvider.notifier).signIn(session);
    } on Failure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 24),
        Icon(Icons.badge_outlined, size: 56, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 16),
        Text(
          'Đăng nhập bằng tài khoản HIS của bạn',
          style: Theme.of(context).textTheme.titleMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Chỉ những tài khoản đã được cấp quyền tra cứu mới dùng được màn hình này.',
          style: Theme.of(context).textTheme.bodySmall,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),

        TextField(
          controller: _username,
          autocorrect: false,
          decoration: const InputDecoration(
            labelText: 'Tài khoản',
            prefixIcon: Icon(Icons.person_outline),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _password,
          obscureText: true,
          onSubmitted: (_) => _busy ? null : _submit(),
          decoration: const InputDecoration(
            labelText: 'Mật khẩu',
            prefixIcon: Icon(Icons.lock_outline),
          ),
        ),

        if (_error != null) ...[const SizedBox(height: 16), _ErrorBox(message: _error!)],

        const SizedBox(height: 24),
        FilledButton(
          onPressed: _busy ? null : _submit,
          child: _busy
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Đăng nhập'),
        ),
      ],
    );
  }
}

class _StaffSearch extends ConsumerStatefulWidget {
  const _StaffSearch({required this.session});
  final StaffSession session;

  @override
  ConsumerState<_StaffSearch> createState() => _StaffSearchState();
}

class _StaffSearchState extends ConsumerState<_StaffSearch> {
  final _keyword = TextEditingController();
  List<StaffPatient>? _results;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _keyword.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final term = _keyword.text.trim();
    if (term.length < 3) {
      setState(() => _error = 'Nhập ít nhất 3 ký tự để tra cứu.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final found = await ref
          .read(staffRepositoryProvider)
          .search(term, token: widget.session.token);
      setState(() => _results = found);
    } on Failure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final results = _results;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _keyword,
                      onSubmitted: (_) => _busy ? null : _search(),
                      decoration: const InputDecoration(
                        labelText: 'Mã BN, số điện thoại hoặc CCCD',
                        prefixIcon: Icon(Icons.search),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    style: AppTheme.rowButton,
                    onPressed: _busy ? null : _search,
                    child: _busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Tra'),
                  ),
                ],
              ),
              if (_error != null) ...[const SizedBox(height: 12), _ErrorBox(message: _error!)],
            ],
          ),
        ),

        Expanded(
          child: results == null
              ? const _Hint(text: 'Nhập thông tin người bệnh rồi bấm Tra.')
              : results.isEmpty
              ? const _Hint(text: 'Không tìm thấy người bệnh nào khớp thông tin đã nhập.')
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: results.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final patient = results[index];
                    return Card(
                      margin: EdgeInsets.zero,
                      child: ListTile(
                        title: Text(patient.fullName),
                        subtitle: Text(
                          [
                            patient.patientCode,
                            if (patient.dateOfBirth != null) _day.format(patient.dateOfBirth!),
                            if (patient.phoneNumber?.isNotEmpty == true) patient.phoneNumber!,
                          ].join(' · '),
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                StaffPatientPage(patient: patient, token: widget.session.token),
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

/// Hồ sơ tóm tắt của một người bệnh, đủ để nhân viên trả lời ngay tại quầy.
class StaffPatientPage extends ConsumerStatefulWidget {
  const StaffPatientPage({super.key, required this.patient, required this.token});

  final StaffPatient patient;
  final String token;

  @override
  ConsumerState<StaffPatientPage> createState() => _StaffPatientPageState();
}

class _StaffPatientPageState extends ConsumerState<StaffPatientPage> {
  late Future<StaffPatientSummary> _future;

  @override
  void initState() {
    super.initState();
    _future = ref
        .read(staffRepositoryProvider)
        .summary(widget.patient.patientId, token: widget.token);
  }

  Future<void> _resetPassword() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Đặt lại mật khẩu app cho ${widget.patient.fullName}?'),
        content: const Text('Mật khẩu tạm sẽ hiện ra để bạn đọc cho người bệnh.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Đặt lại')),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      final password = await ref
          .read(staffRepositoryProvider)
          .resetAppPassword(widget.patient.patientId, token: widget.token);

      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Mật khẩu tạm'),
          // `SingleChildScrollView` chứ không để `Column` trần: bàn phím bật lên là hộp thoại co
          // lại, nội dung không vừa và Flutter vẽ sọc vàng-đen "BOTTOM OVERFLOWED" đè lên ô nhập.
          // Cho cuộn thì bàn phím che bớt cũng vẫn với tới được mọi ô.
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SelectableText(
                  password,
                  style: const TextStyle(fontSize: 28, fontFamily: 'monospace', letterSpacing: 3),
                ),
                const SizedBox(height: 12),
                const Text('Đọc cho người bệnh và nhắc họ đổi ngay sau khi đăng nhập.'),
              ],
            ),
          ),
          actions: [
            FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Đã rõ')),
          ],
        ),
      );
    } on Failure catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.patient.fullName)),
      body: FutureBuilder<StaffPatientSummary>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            final error = snapshot.error;
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  error is Failure ? error.message : 'Không lấy được hồ sơ.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          final summary = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        summary.patient.fullName,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [
                          summary.patient.patientCode,
                          if (summary.patient.dateOfBirth != null)
                            _day.format(summary.patient.dateOfBirth!),
                          if (summary.patient.phoneNumber?.isNotEmpty == true)
                            summary.patient.phoneNumber!,
                        ].join(' · '),
                      ),
                      const SizedBox(height: 8),
                      Text(summary.patient.appStatusLabel),
                      if (summary.patient.hasAppAccount) ...[
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.tonal(
                            onPressed: _resetPassword,
                            child: const Text('Đặt lại mật khẩu app'),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              _Section(
                title: 'Số thứ tự hôm nay',
                lines: summary.queueTickets,
                empty: 'Hôm nay chưa lấy số.',
              ),
              _Section(title: 'Lịch hẹn', lines: summary.appointments, empty: 'Không có lịch hẹn.'),
              _Section(
                title: 'Xét nghiệm gần đây',
                lines: summary.labResults,
                empty: 'Chưa có kết quả xét nghiệm.',
              ),
              _Section(
                title: 'Chẩn đoán hình ảnh',
                lines: summary.imagingResults,
                empty: 'Chưa có kết quả chẩn đoán hình ảnh.',
              ),
              _Section(
                title: 'Đơn thuốc',
                lines: summary.prescriptions,
                empty: 'Chưa có đơn thuốc.',
              ),
              _Section(
                title: 'Đợt nội trú',
                lines: summary.admissions,
                empty: 'Chưa có đợt nội trú.',
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.lines, required this.empty});

  final String title;
  final List<StaffSummaryLine> lines;
  final String empty;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.titleSmall),
          const SizedBox(height: 4),
          if (lines.isEmpty)
            Text(empty, style: theme.textTheme.bodySmall)
          else
            Card(
              margin: EdgeInsets.zero,
              child: Column(
                children: [
                  for (final line in lines)
                    ListTile(
                      dense: true,
                      title: Text(line.title),
                      subtitle: line.subtitle.isEmpty ? null : Text(line.subtitle),
                      leading: line.highlight
                          ? Icon(Icons.warning_amber_rounded, color: theme.colorScheme.error)
                          : null,
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Hint extends StatelessWidget {
  const _Hint({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(text, textAlign: TextAlign.center),
    ),
  );
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: scheme.onErrorContainer),
          const SizedBox(width: 12),
          Expanded(
            child: Text(message, style: TextStyle(color: scheme.onErrorContainer)),
          ),
        ],
      ),
    );
  }
}
