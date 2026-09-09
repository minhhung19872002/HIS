import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error/failure.dart';
import '../../../core/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_theme.dart';
import '../data/family_repository.dart';
import '../domain/family_models.dart';

final familyRepositoryProvider = Provider<FamilyRepository>(
  (ref) => FamilyRepository(ref.watch(apiClientProvider)),
);

final familyProvider = FutureProvider.autoDispose<FamilyList>(
  (ref) => ref.watch(familyRepositoryProvider).members(),
);

/// Đang xem hồ sơ của ai: null = của chính mình, ngược lại là id liên kết gia đình.
///
/// Giữ ở một chỗ để mọi màn kết quả cùng đổi theo — người nhà bấm "xem hồ sơ của mẹ" một lần rồi
/// duyệt tiếp như bình thường, thay vì phải chọn lại ở từng màn.
class ViewingMember extends Notifier<FamilyMember?> {
  @override
  FamilyMember? build() => null;

  void select(FamilyMember? member) => state = member;
}

final viewingMemberProvider = NotifierProvider<ViewingMember, FamilyMember?>(ViewingMember.new);

/// Quản lý gia đình — HSMT I.2 #7.
class FamilyPage extends ConsumerWidget {
  const FamilyPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(familyProvider);
    final viewing = ref.watch(viewingMemberProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Gia đình')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _addMember(context, ref),
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Thêm người thân'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, size: 56),
                const SizedBox(height: 12),
                Text(
                  error is Failure ? error.message : 'Không tải được danh sách gia đình.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: () => ref.invalidate(familyProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (family) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(familyProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            children: [
              Text(
                'Bạn có thể kết nối tối đa ${family.maxMembers} người thân '
                '(đang có ${family.items.length}). Người thân phải đồng ý thì bạn mới xem được '
                'hồ sơ của họ.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),

              if (viewing != null) _ViewingBanner(member: viewing),

              if (family.items.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 64),
                  child: Column(
                    children: [
                      Icon(Icons.family_restroom_outlined, size: 56),
                      SizedBox(height: 12),
                      Text('Bạn chưa kết nối người thân nào.', textAlign: TextAlign.center),
                    ],
                  ),
                )
              else
                for (final member in family.items)
                  _MemberCard(
                    member: member,
                    onView: member.isVerified && member.canViewResults
                        ? () {
                            ref.read(viewingMemberProvider.notifier).select(member);
                            context.push(AppRoutes.results);
                          }
                        : null,
                    onVerify: member.isVerified ? null : () => _verify(context, ref, member),
                    onRemove: () => _remove(context, ref, member),
                    onPermissions: member.isVerified
                        ? () => _editPermissions(context, ref, member)
                        : null,
                  ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _addMember(BuildContext context, WidgetRef ref) async {
    final code = TextEditingController();
    final relationship = TextEditingController();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Thêm người thân'),
        // `SingleChildScrollView` chứ không để `Column` trần: bàn phím bật lên là hộp thoại co
        // lại, nội dung không vừa và Flutter vẽ sọc vàng-đen "BOTTOM OVERFLOWED" đè lên ô nhập.
        // Cho cuộn thì bàn phím che bớt cũng vẫn với tới được mọi ô.
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: code,
                decoration: const InputDecoration(
                  labelText: 'Mã bệnh nhân',
                  helperText: 'In trên thẻ khám bệnh của người thân',
                ),
                textCapitalization: TextCapitalization.characters,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: relationship,
                decoration: const InputDecoration(labelText: 'Quan hệ (Cha, Mẹ, Con…)'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Tiếp tục'),
          ),
        ],
      ),
    );

    if (submitted != true || !context.mounted) return;

    try {
      final result = await ref
          .read(familyRepositoryProvider)
          .add(patientCode: code.text.trim(), relationship: relationship.text.trim());
      ref.invalidate(familyProvider);
      if (context.mounted) await _showVerifyDialog(context, ref, result);
    } on Failure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  /// Hộp thoại xác minh, nội dung đổi theo cách mà máy chủ yêu cầu.
  Future<void> _showVerifyDialog(
    BuildContext context,
    WidgetRef ref,
    AddFamilyMemberResult result,
  ) async {
    final input = TextEditingController();
    final isOtp = result.verification == FamilyVerification.memberOtp;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Xác nhận kết nối với ${result.memberName}'),
        // `SingleChildScrollView` chứ không để `Column` trần: bàn phím bật lên là hộp thoại co
        // lại, nội dung không vừa và Flutter vẽ sọc vàng-đen "BOTTOM OVERFLOWED" đè lên ô nhập.
        // Cho cuộn thì bàn phím che bớt cũng vẫn với tới được mọi ô.
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(result.message),
              const SizedBox(height: 12),
              TextField(
                controller: input,
                keyboardType: isOtp ? TextInputType.number : TextInputType.text,
                decoration: InputDecoration(
                  labelText: isOtp ? 'Mã xác nhận' : 'Số CCCD/CMND hoặc ngày sinh',
                  helperText: isOtp
                      ? 'Mã đã gửi tới ${result.maskedPhone ?? "số điện thoại của người thân"}'
                      : 'Ngày sinh nhập theo dạng 1975-04-12',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Để sau')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    try {
      await ref
          .read(familyRepositoryProvider)
          .verify(
            result.linkId,
            otpCode: isOtp ? input.text.trim() : null,
            identityData: isOtp ? null : input.text.trim(),
          );
      ref.invalidate(familyProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Đã kết nối với ${result.memberName}.')));
      }
    } on Failure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _verify(BuildContext context, WidgetRef ref, FamilyMember member) =>
      _showVerifyDialog(
        context,
        ref,
        AddFamilyMemberResult(
          linkId: member.id,
          memberName: member.name,
          // Không biết chắc cách xác minh khi mở lại từ danh sách; nhận cả hai kiểu và để máy chủ
          // quyết. Máy chủ mới là nơi biết người thân đó đã có tài khoản hay chưa.
          verification: FamilyVerification.identityData,
          message: 'Nhập mã xác nhận người thân đọc cho bạn, hoặc số CCCD/ngày sinh trên hồ sơ.',
        ),
      );

  Future<void> _editPermissions(BuildContext context, WidgetRef ref, FamilyMember member) async {
    var view = member.canViewResults;
    var book = member.canBookAppointments;
    var queue = member.canTakeQueueNumber;

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text('Quyền với ${member.name}'),
          // `SingleChildScrollView` chứ không để `Column` trần: bàn phím bật lên là hộp thoại co
          // lại, nội dung không vừa và Flutter vẽ sọc vàng-đen "BOTTOM OVERFLOWED" đè lên ô nhập.
          // Cho cuộn thì bàn phím che bớt cũng vẫn với tới được mọi ô.
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SwitchListTile(
                  value: view,
                  onChanged: (v) => setState(() => view = v),
                  title: const Text('Xem kết quả khám'),
                ),
                SwitchListTile(
                  value: book,
                  onChanged: (v) => setState(() => book = v),
                  title: const Text('Đặt lịch khám hộ'),
                ),
                SwitchListTile(
                  value: queue,
                  onChanged: (v) => setState(() => queue = v),
                  title: const Text('Lấy số thứ tự hộ'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Lưu')),
          ],
        ),
      ),
    );

    if (saved != true || !context.mounted) return;

    try {
      await ref
          .read(familyRepositoryProvider)
          .updatePermissions(
            member.id,
            canViewResults: view,
            canBookAppointments: book,
            canTakeQueueNumber: queue,
          );
      ref.invalidate(familyProvider);
    } on Failure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _remove(BuildContext context, WidgetRef ref, FamilyMember member) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Gỡ kết nối với ${member.name}?'),
        content: const Text('Bạn sẽ không xem được kết quả khám của người này nữa.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Gỡ')),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    try {
      await ref.read(familyRepositoryProvider).remove(member.id);
      // Đang xem hồ sơ của chính người vừa gỡ thì phải quay về hồ sơ của mình ngay.
      if (ref.read(viewingMemberProvider)?.id == member.id) {
        ref.read(viewingMemberProvider.notifier).select(null);
      }
      ref.invalidate(familyProvider);
    } on Failure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

/// Dải nhắc "đang xem hồ sơ của người khác" — không có nó thì rất dễ tưởng đang xem hồ sơ mình.
class _ViewingBanner extends ConsumerWidget {
  const _ViewingBanner({required this.member});
  final FamilyMember member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
      decoration: BoxDecoration(
        color: scheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.visibility_outlined, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text('Đang xem hồ sơ của ${member.name}')),
          TextButton(
            onPressed: () => ref.read(viewingMemberProvider.notifier).select(null),
            child: const Text('Về hồ sơ của tôi'),
          ),
        ],
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  const _MemberCard({
    required this.member,
    required this.onView,
    required this.onVerify,
    required this.onRemove,
    required this.onPermissions,
  });

  final FamilyMember member;
  final VoidCallback? onView;
  final VoidCallback? onVerify;
  final VoidCallback onRemove;
  final VoidCallback? onPermissions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  child: Text(
                    member.name.isNotEmpty ? member.name.characters.first.toUpperCase() : '?',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(member.name, style: theme.textTheme.titleMedium),
                      Text(
                        [
                          if (member.relationship?.isNotEmpty == true) member.relationship!,
                          member.patientCode,
                        ].join(' · '),
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                if (!member.isVerified)
                  Chip(
                    label: const Text('Chờ xác nhận'),
                    visualDensity: VisualDensity.compact,
                    backgroundColor: theme.colorScheme.secondaryContainer,
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 8,
              children: [
                TextButton(onPressed: onRemove, child: const Text('Gỡ')),
                if (onPermissions != null)
                  TextButton(onPressed: onPermissions, child: const Text('Quyền')),
                if (onVerify != null)
                  FilledButton.tonal(
                    style: AppTheme.rowButton,
                    onPressed: onVerify,
                    child: const Text('Xác nhận'),
                  ),
                if (onView != null)
                  FilledButton(
                    style: AppTheme.rowButton,
                    onPressed: onView,
                    child: const Text('Xem hồ sơ'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
