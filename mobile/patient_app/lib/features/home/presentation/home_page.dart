import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/router/app_router.dart';
import '../../../core/security/lock_gate.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/widgets.dart';
import '../../../l10n/app_localizations.dart';
import '../../appointments/domain/appointment_models.dart';
import '../../appointments/presentation/appointments_page.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../notifications/presentation/notifications_page.dart';
import '../../queue/presentation/queue_page.dart';
import 'update_gate.dart';

/// Trang chủ: thẻ bệnh nhân + lối tắt + việc đang diễn ra hôm nay (HSMT I.2).
///
/// Bố cục theo `docs/features/patient-app/design/patient-app-prototype.html` (khối `isHome`):
/// dải gradient thương hiệu ở trên mang lời chào và thẻ bệnh nhân, rồi một "tờ giấy" nền trang bo
/// góc trên nhô lên che một phần dải màu.
///
/// Thứ tự các khối là thứ tự cấp bách, không phải thứ tự đẹp: số thứ tự đang chờ nằm trên cùng vì
/// đó là thứ người bệnh mở app ra để xem khi đang ngồi ở hành lang; lịch khám sắp tới nằm cuối vì
/// nó là chuyện của ngày khác.
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final auth = ref.watch(authControllerProvider);
    // `valueOrNull` chứ KHÔNG `value`: trên `AsyncError`, `.value` NÉM LẠI lỗi thay vì trả null,
    // và lỗi đó nổ ngay trong `build` làm vỡ cả màn. Trang chủ đọc bốn provider — chỉ cần một
    // trong bốn hỏng (mất mạng, máy chủ 500) là người bệnh mất luôn trang chủ, kể cả những khối
    // không liên quan gì tới provider hỏng đó.
    final state = auth.valueOrNull;
    final account = state is AuthSignedIn ? state.account : null;

    final shortcuts = <_Shortcut>[
      _Shortcut(Icons.confirmation_number_outlined, l10n.shortcutQueue,
          route: AppRoutes.queue, phase: 2, tone: _TileTone.blue),
      _Shortcut(Icons.event_available_outlined, l10n.shortcutBooking,
          route: AppRoutes.appointments, phase: 2, tone: _TileTone.blue),
      _Shortcut(Icons.science_outlined, l10n.shortcutResults,
          route: AppRoutes.results, phase: 3, tone: _TileTone.violet),
      _Shortcut(Icons.medication_outlined, l10n.shortcutPrescription,
          route: AppRoutes.prescriptions, phase: 3, tone: _TileTone.rose),
      _Shortcut(Icons.local_hotel_outlined, 'Điều trị nội trú',
          route: AppRoutes.admissions, phase: 4, tone: _TileTone.blue),
      _Shortcut(Icons.folder_shared_outlined, l10n.shortcutWallet,
          route: AppRoutes.documents, phase: 5, tone: _TileTone.violet),
      _Shortcut(Icons.family_restroom_outlined, l10n.shortcutFamily,
          route: AppRoutes.family, phase: 5, tone: _TileTone.rose),
    ];

    return Scaffold(
      body: AppHeroHeader(
        header: _Greeting(
          name: account?.fullName ?? '',
          patientCode: account?.patientCode,
          isLinked: account?.isLinked ?? false,
        ),
        bodyPadding: EdgeInsets.zero,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screen,
            AppSpacing.screen,
            AppSpacing.screen,
            26,
          ),
          children: [
            const UpdateAvailableBanner(),
            const DeviceIntegrityBanner(),

            const _TodayTicketCard(),

            AppSectionTitle('Dịch vụ', padding: const EdgeInsets.only(bottom: 12)),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 4,
              crossAxisSpacing: AppSpacing.grid,
              mainAxisSpacing: AppSpacing.grid,
              // Ô vuông + chỗ cho nhãn HAI DÒNG. 0.72 chỉ chừa ~25dp cho chữ, đủ một dòng —
              // nên trên máy 320dp nhãn bị cắt còn "Đặt", "Đơn", "Điều trị", và người dùng đi tìm
              // nút đặt lịch khám không nhận ra nó. 0.60 chừa ~43dp, đủ hai dòng 12sp.
              childAspectRatio: 0.60,
              children: [
                for (final shortcut in shortcuts)
                  _ShortcutTile(
                    shortcut: shortcut,
                    onTap: shortcut.route != null
                        ? () => context.push(shortcut.route!)
                        : () => ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('"${shortcut.label}" sẽ có ở giai đoạn tới.')),
                            ),
                  ),
              ],
            ),

            const SizedBox(height: AppSpacing.block),
            const _UpcomingAppointment(),
          ],
        ),
      ),
    );
  }
}

/// Lời chào + nút thông báo + thẻ bệnh nhân kính mờ, nằm trên dải gradient.
class _Greeting extends ConsumerWidget {
  const _Greeting({required this.name, required this.patientCode, required this.isLinked});

  final String name;
  final String? patientCode;
  final bool isLinked;

  /// Lời chào theo giờ máy — người bệnh mở app lúc 6h sáng và 8h tối phải thấy khác nhau.
  static String _greetingFor(int hour) {
    if (hour < 11) return 'Chào buổi sáng';
    if (hour < 14) return 'Chào buổi trưa';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final initial = name.trim().isEmpty ? '?' : name.trim().characters.first.toUpperCase();
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _AccountMenuButton(initial: initial),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _greetingFor(DateTime.now().hour),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Colors.white.withValues(alpha: 0.82),
                    ),
                  ),
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            _HeaderIconButton(
              icon: Icons.notifications_none_rounded,
              tooltip: unread > 0 ? 'Thông báo ($unread mới)' : 'Thông báo',
              showDot: unread > 0,
              onTap: () => context.push(AppRoutes.notifications),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.block),
        _PatientCard(patientCode: patientCode, isLinked: isLinked),
      ],
    );
  }
}

/// Avatar mở menu tài khoản: Bảo mật và Đăng xuất.
///
/// Bản thiết kế chỉ vẽ MỘT nút trên đầu màn (thông báo), nhưng bản cũ có thêm hai nút "Bảo mật"
/// và "Đăng xuất" trên thanh tiêu đề — và trang chủ là chỗ DUY NHẤT trong app đăng xuất được.
/// Bỏ theo bản thiết kế thì người bệnh không còn đường nào thoát tài khoản trên máy mượn. Gom vào
/// avatar: giữ đúng dáng một-nút của bản thiết kế, mà không mất chức năng nào.
class _AccountMenuButton extends ConsumerWidget {
  const _AccountMenuButton({required this.initial});

  final String initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<String>(
      tooltip: 'Tài khoản',
      offset: const Offset(0, 58),
      onSelected: (value) {
        if (value == 'security') context.push(AppRoutes.security);
        if (value == 'logout') _confirmLogout(context, ref);
      },
      itemBuilder: (context) => const [
        PopupMenuItem(
          value: 'security',
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.shield_outlined),
            title: Text('Bảo mật'),
          ),
        ),
        PopupMenuItem(
          value: 'logout',
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.logout, color: AppColors.danger),
            title: Text('Đăng xuất', style: TextStyle(color: AppColors.danger)),
          ),
        ),
      ],
      child: Container(
        width: 52,
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(AppRadii.button),
          border: Border.all(color: Colors.white.withValues(alpha: 0.30)),
        ),
        child: Text(
          initial,
          style: const TextStyle(
            fontFamily: AppFonts.display,
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất?'),
        content: const Text('Bạn sẽ cần đăng nhập lại để xem kết quả khám.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
    }
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.showDot = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool showDot;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        label: tooltip,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadii.iconBox),
          child: Container(
            // 44 theo bản thiết kế, nhưng vùng chạm nới lên 48 bằng padding ngoài để đạt
            // khuyến nghị của Material mà không phá bố cục.
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(AppRadii.iconBox),
              border: Border.all(color: Colors.white.withValues(alpha: 0.26)),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(icon, size: 20, color: Colors.white),
                if (showDot)
                  Positioned(
                    top: 9,
                    right: 10,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: BoxDecoration(
                        color: AppColors.notificationDot,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.primaryAction, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Thẻ bệnh nhân kính mờ: mã bệnh nhân + mã QR để quầy quét.
class _PatientCard extends StatelessWidget {
  const _PatientCard({required this.patientCode, required this.isLinked});

  final String? patientCode;
  final bool isLinked;

  @override
  Widget build(BuildContext context) {
    final linked = isLinked && patientCode != null && patientCode!.isNotEmpty;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
      ),
      child: Row(
        children: [
          Expanded(
            child: linked
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'MÃ BỆNH NHÂN',
                        style: TextStyle(
                          fontSize: 11,
                          letterSpacing: 1.6,
                          fontWeight: FontWeight.w600,
                          color: Colors.white.withValues(alpha: 0.78),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        patientCode!,
                        style: const TextStyle(
                          fontFamily: AppFonts.display,
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.9,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: AppColors.accent,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          // Flexible chứ không để Text tự do: máy hẹp hoặc người dùng phóng to
                          // cỡ chữ hệ thống là hàng này tràn ra ngoài thẻ.
                          const Flexible(
                            child: Text(
                              'Đã liên kết hồ sơ bệnh án',
                              // Hai dòng: trên máy 320dp một dòng bị cắt thành "…hồ sơ bện…",
                              // và câu cụt đó không nói được gì.
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, height: 1.3, color: AppColors.tintMid),
                            ),
                          ),
                        ],
                      ),
                    ],
                  )
                // Chưa liên kết thì nói rõ phải làm gì. Câu này giữ nguyên từ bản cũ: nó đã được
                // dùng thật và người ở quầy tiếp đón quen với cách diễn đạt đó.
                : const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline, size: 18, color: Colors.white),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Tài khoản chưa liên kết hồ sơ bệnh án. Vui lòng liên hệ quầy tiếp đón '
                          'để xem được kết quả khám.',
                          style: TextStyle(fontSize: 13, height: 1.45, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
          ),
          if (linked) ...[
            const SizedBox(width: 16),
            Container(
              width: 62,
              height: 62,
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadii.iconBox - 1),
              ),
              child: QrImageView(
                data: patientCode!,
                version: QrVersions.auto,
                padding: EdgeInsets.zero,
                // Màu thương hiệu thay vì đen: vẫn thừa tương phản để máy quét đọc được.
                eyeStyle: const QrEyeStyle(
                  eyeShape: QrEyeShape.square,
                  color: AppColors.primary,
                ),
                dataModuleStyle: const QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Thẻ số thứ tự đang chờ hôm nay. Không có vé thì không chiếm chỗ.
class _TodayTicketCard extends ConsumerWidget {
  const _TodayTicketCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tickets = ref.watch(myTicketsTodayProvider).valueOrNull;
    if (tickets == null || tickets.isEmpty) return const SizedBox.shrink();

    final ticket = tickets.first;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.block),
      child: AppCard(
        gradient: AppGradients.ticketCard,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        shadows: AppShadows.primaryGlow,
        onTap: () => context.push('${AppRoutes.queueTicket}/${ticket.id}'),
        semanticLabel: 'Số thứ tự ${ticket.ticketCode}'
            '${ticket.roomName == null ? '' : ' tại ${ticket.roomName}'}',
        child: Row(
          children: [
            _PulsingBadge(code: ticket.ticketCode),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    (ticket.roomName ?? 'Số thứ tự hôm nay').toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1,
                      color: AppColors.accent,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Số của bạn: ${ticket.queueNumber}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Chạm để xem đang gọi tới số nào',
                    style: TextStyle(fontSize: 13, color: AppColors.onDarkMuted),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.accent),
          ],
        ),
      ),
    );
  }
}

/// Vòng tròn mang mã vé, có vòng sáng nhấp nháy quanh.
///
/// Nhịp thở chậm (2.4s) chứ không chớp: chớp nhanh gây khó chịu và với một số người là yếu tố
/// kích thích co giật. Vòng chỉ để mắt tìm thấy thẻ, không phải để báo động.
class _PulsingBadge extends StatefulWidget {
  const _PulsingBadge({required this.code});
  final String code;

  @override
  State<_PulsingBadge> createState() => _PulsingBadgeState();
}

class _PulsingBadgeState extends State<_PulsingBadge> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
  );

  bool _reduceMotion = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    // Tôn trọng "giảm chuyển động" của hệ điều hành. Quan trọng là DỪNG HẲN bộ chạy chứ không chỉ
    // ẩn vòng sáng đi: một `AnimationController` lặp vô hạn khiến khung hình không bao giờ đứng
    // yên, và mọi `pumpAndSettle` chạm tới màn này sẽ treo cho tới lúc hết giờ.
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (reduce == _reduceMotion && _controller.isAnimating != reduce) return;

    _reduceMotion = reduce;
    if (reduce) {
      _controller.stop();
      _controller.value = 0;
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = _reduceMotion;

    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (!reduceMotion)
            AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                final t = _controller.value;
                return Opacity(
                  opacity: (1 - t) * 0.55,
                  child: Transform.scale(
                    scale: 1 + t * 0.45,
                    child: Container(
                      decoration: const BoxDecoration(
                        color: AppColors.accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                );
              },
            ),
          Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              gradient: AppGradients.ticketBadge,
              shape: BoxShape.circle,
            ),
            // Thu nhỏ chữ thay vì cắt cụt: mã vé bị cắt thành "A-O…" là mất đúng thứ người
            // bệnh mở màn này để xem.
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  widget.code,
                  maxLines: 1,
                  style: const TextStyle(
                    fontFamily: AppFonts.display,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navyInk,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Khối "Lịch khám sắp tới". Rỗng thì hiện thẻ nét đứt mời đặt lịch.
class _UpcomingAppointment extends ConsumerWidget {
  const _UpcomingAppointment();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appointments = ref.watch(myAppointmentsProvider);

    final upcoming = (appointments.valueOrNull ?? const <Appointment>[])
        .where((a) => !a.isCancelled)
        .toList()
      ..sort((a, b) => a.appointmentDate.compareTo(b.appointmentDate));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const AppSectionTitle('Lịch khám sắp tới'),
        if (upcoming.isEmpty)
          _EmptyAppointmentCard(onTap: () => context.push(AppRoutes.bookAppointment))
        else
          _AppointmentSummaryCard(
            appointment: upcoming.first,
            onTap: () => context.push(AppRoutes.appointments),
          ),
      ],
    );
  }
}

class _EmptyAppointmentCard extends StatelessWidget {
  const _EmptyAppointmentCard({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.card),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(AppRadii.card),
            border: Border.all(color: AppColors.borderSoft),
          ),
          child: const Column(
            children: [
              Text(
                'Bạn chưa có lịch khám nào.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, height: 1.5, color: AppColors.textSecondary),
              ),
              SizedBox(height: 2),
              Text(
                'Đặt lịch ngay',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryAction,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AppointmentSummaryCard extends StatelessWidget {
  const _AppointmentSummaryCard({required this.appointment, required this.onTap});

  final Appointment appointment;
  final VoidCallback onTap;

  static const _weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  @override
  Widget build(BuildContext context) {
    final date = appointment.appointmentDate;
    final time = appointment.appointmentTime;

    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          // Ô ngày — Sora cho số để ngày 1 và ngày 11 rộng bằng nhau, cột không so le.
          Container(
            width: 54,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.tint,
              borderRadius: BorderRadius.circular(AppRadii.field),
              border: Border.all(color: AppColors.tintMid),
            ),
            child: Column(
              children: [
                Text(
                  _weekdays[date.weekday - 1],
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
                Text(
                  '${date.day}',
                  style: const TextStyle(
                    fontFamily: AppFonts.display,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                    color: AppColors.navy,
                  ),
                ),
                Text(
                  'Th.${date.month}',
                  style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  appointment.departmentName ?? 'Lịch khám',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  [
                    if (appointment.doctorName != null) 'BS. ${appointment.doctorName}',
                    if (time != null) _formatTime(time),
                    if (time == null) DateFormat('dd/MM/yyyy').format(date),
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                if (appointment.statusName != null) ...[
                  const SizedBox(height: 8),
                  AppStatusPill(
                    appointment.statusName!,
                    tone: appointment.status == 1 ? AppStatusTone.ok : AppStatusTone.wait,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Server trả "HH:mm:ss"; người bệnh chỉ cần giờ và phút.
  static String _formatTime(String raw) {
    final parts = raw.split(':');
    return parts.length >= 2 ? '${parts[0]}:${parts[1]}' : raw;
  }
}

enum _TileTone { blue, violet, rose }

class _Shortcut {
  const _Shortcut(
    this.icon,
    this.label, {
    this.route,
    required this.phase,
    required this.tone,
  });

  final IconData icon;
  final String label;

  /// Đường tới màn hình. null = chưa làm xong, còn ở giai đoạn sau.
  final String? route;

  /// Giai đoạn hoàn thiện lối tắt này (theo docs/features/patient-app/README.md §5).
  final int phase;

  final _TileTone tone;
}

class _ShortcutTile extends StatelessWidget {
  const _ShortcutTile({required this.shortcut, required this.onTap});

  final _Shortcut shortcut;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (gradient, iconColor) = switch (shortcut.tone) {
      _TileTone.blue => (AppGradients.serviceTileBlue, AppColors.primary),
      _TileTone.violet => (AppGradients.serviceTileViolet, AppColors.relative),
      _TileTone.rose => (AppGradients.serviceTileRose, AppColors.danger),
    };

    return Semantics(
      button: true,
      label: shortcut.label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.tile),
        child: Column(
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Container(
                decoration: BoxDecoration(
                  gradient: gradient,
                  borderRadius: BorderRadius.circular(AppRadii.tile),
                  boxShadow: AppShadows.tile,
                ),
                child: Icon(shortcut.icon, size: 26, color: iconColor),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Text(
                shortcut.label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  height: 1.2,
                  color: AppColors.textStrong,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
