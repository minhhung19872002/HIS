import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/error/failure.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/widgets.dart';
import '../domain/queue_models.dart';
import 'queue_page.dart';

/// Theo dõi số thứ tự đã lấy: đang gọi số nào, còn bao nhiêu người, ước tính bao nhiêu phút.
///
/// Tự hỏi lại máy chủ mỗi 20 giây. HIS chưa có kênh realtime cho hàng đợi (khảo sát §11.4 GAP 16)
/// nên hỏi lại định kỳ là cách trung thực nhất hiện có — và endpoint trạng thái vé được làm riêng
/// cho việc này nên rất nhẹ.
///
/// Màn duy nhất trong app dùng NỀN TỐI (khối `isTicket` của bản prototype). Có lý do: người bệnh
/// mở màn này ở hành lang và để mở suốt cả lúc chờ, nên nền tối vừa đỡ chói vừa đỡ tốn pin, và mã
/// số sáng trên nền tối thì liếc qua là đọc được từ xa.
class QueueTicketPage extends ConsumerStatefulWidget {
  const QueueTicketPage({super.key, required this.ticketId, this.initialMessage});

  final String ticketId;

  /// Thông điệp máy chủ trả lúc cấp số, ví dụ nhắc mang giấy tờ chứng minh diện ưu tiên.
  final String? initialMessage;

  @override
  ConsumerState<QueueTicketPage> createState() => _QueueTicketPageState();
}

class _QueueTicketPageState extends ConsumerState<QueueTicketPage> {
  static const _refreshInterval = Duration(seconds: 20);

  QueueTicketStatus? _status;
  String? _error;
  Timer? _timer;
  DateTime? _lastUpdated;

  /// Số người chờ ở lần đọc ĐẦU TIÊN — mốc để vẽ thanh tiến độ.
  ///
  /// Không có mốc này thì không nói được "đã đi được bao nhiêu": máy chủ chỉ trả số người còn lại,
  /// mà 5 người còn lại là gần xong hay còn xa thì tuỳ lúc đầu có bao nhiêu.
  int? _initialAhead;

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(_refreshInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final status = await ref.read(queueRepositoryProvider).ticketStatus(widget.ticketId);
      if (!mounted) return;
      setState(() {
        _status = status;
        _error = null;
        _lastUpdated = DateTime.now();
        _initialAhead ??= status.peopleAhead;
        // Hàng đợi dài ra (có người ưu tiên chen vào trước) thì dời mốc, nếu không thanh tiến độ
        // sẽ chạy lùi và người bệnh tưởng app tính sai.
        if (status.peopleAhead > _initialAhead!) _initialAhead = status.peopleAhead;
      });

      // Xong rồi thì thôi hỏi nữa — để tiếp cũng chỉ tốn pin và dữ liệu của người bệnh.
      if (status.isFinished) _timer?.cancel();
    } on Failure catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  double get _progress {
    final status = _status;
    final start = _initialAhead;
    if (status == null || start == null || start <= 0) return 1;
    return ((start - status.peopleAhead) / start).clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      // Nền tối cần biểu tượng thanh trạng thái màu sáng, nếu không giờ và pin biến mất.
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        body: Container(
          decoration: const BoxDecoration(gradient: AppGradients.ticketBackground),
          child: Stack(
            children: [
              const _CornerGlow(),
              SafeArea(
                child: Column(
                  children: [
                    _TicketHeader(live: status != null && !status.isFinished),
                    Expanded(
                      child: status == null
                          ? Center(
                              child: _error != null
                                  ? _DarkErrorView(message: _error!, onRetry: _refresh)
                                  : const CircularProgressIndicator(color: AppColors.accent),
                            )
                          : RefreshIndicator(
                              onRefresh: _refresh,
                              backgroundColor: AppColors.navy,
                              color: AppColors.accent,
                              child: ListView(
                                padding: const EdgeInsets.fromLTRB(26, 0, 26, 16),
                                children: [
                                  if (widget.initialMessage != null) ...[
                                    _GlassNote(message: widget.initialMessage!),
                                    const SizedBox(height: 16),
                                  ],
                                  _TicketCard(status: status),
                                  const SizedBox(height: 16),
                                  if (status.isCalled)
                                    _CalledCard(roomName: status.roomName)
                                  else if (status.isFinished)
                                    const _GlassNote(message: 'Lượt khám này đã kết thúc.')
                                  else ...[
                                    _WaitingStats(status: status),
                                    const SizedBox(height: 16),
                                    _QueueProgress(
                                      progress: _progress,
                                      ahead: status.peopleAhead,
                                    ),
                                  ],
                                  if (!status.priorityVerified && status.priority > 0) ...[
                                    const SizedBox(height: 16),
                                    const _GlassNote(
                                      message: 'Số ưu tiên của bạn cần được xác minh. Vui lòng '
                                          'mang theo giấy tờ chứng minh diện ưu tiên khi được gọi.',
                                    ),
                                  ],
                                ],
                              ),
                            ),
                    ),
                    _RefreshBar(
                      onRefresh: _refresh,
                      lastUpdated: _lastUpdated,
                      intervalSeconds: _refreshInterval.inSeconds,
                      stopped: status?.isFinished ?? false,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Quầng sáng góc trên phải — làm nền tối bớt phẳng.
class _CornerGlow extends StatelessWidget {
  const _CornerGlow();

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: -100,
      right: -60,
      child: IgnorePointer(
        child: Container(
          width: 280,
          height: 280,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [
                AppColors.primaryAction.withValues(alpha: 0.55),
                AppColors.primaryAction.withValues(alpha: 0),
              ],
              stops: const [0, 0.7],
            ),
          ),
        ),
      ),
    );
  }
}

class _TicketHeader extends StatelessWidget {
  const _TicketHeader({required this.live});
  final bool live;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(26, 10, 26, 8),
      child: Row(
        children: [
          Semantics(
            button: true,
            label: 'Quay lại',
            child: InkWell(
              onTap: () => Navigator.of(context).maybePop(),
              borderRadius: BorderRadius.circular(AppRadii.iconBox - 1),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadii.iconBox - 1),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.20)),
                ),
                child: const Icon(Icons.chevron_left_rounded, color: Colors.white),
              ),
            ),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Text(
              'Số thứ tự của bạn',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white),
            ),
          ),
          if (live) const _LiveChip(),
        ],
      ),
    );
  }
}

/// Chip "TRỰC TIẾP" với chấm thở — cho biết con số trên màn là mới, không phải ảnh chụp cũ.
class _LiveChip extends StatefulWidget {
  const _LiveChip();

  @override
  State<_LiveChip> createState() => _LiveChipState();
}

class _LiveChipState extends State<_LiveChip> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 2),
  );

  bool _reduceMotion = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    // Dừng HẲN bộ chạy khi người dùng bật "giảm chuyển động": một controller lặp vô hạn khiến
    // khung hình không bao giờ đứng yên và mọi `pumpAndSettle` chạm màn này sẽ treo.
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.accent.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: AppColors.accent.withValues(alpha: 0.30)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 7,
            height: 7,
            child: _reduceMotion
                ? const DecoratedBox(
                    decoration: BoxDecoration(color: AppColors.accent, shape: BoxShape.circle),
                  )
                : AnimatedBuilder(
                    animation: _controller,
                    builder: (context, _) => Opacity(
                      opacity: 0.35 + (1 - (_controller.value - 0.5).abs() * 2) * 0.65,
                      child: const DecoratedBox(
                        decoration:
                            BoxDecoration(color: AppColors.accent, shape: BoxShape.circle),
                      ),
                    ),
                  ),
          ),
          const SizedBox(width: 7),
          const Text(
            'TRỰC TIẾP',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: AppColors.accent,
            ),
          ),
        ],
      ),
    );
  }
}

/// Thẻ chính: tên phòng · mã số cỡ lớn · nhãn ưu tiên · QR.
class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.status});
  final QueueTicketStatus status;

  @override
  Widget build(BuildContext context) {
    final priority = status.priority > 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(34),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Column(
        children: [
          Text(
            status.roomName.toUpperCase(),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              letterSpacing: 2.2,
              fontWeight: FontWeight.w700,
              color: Color(0xFFA9CDF5),
            ),
          ),
          const SizedBox(height: 8),
          // Mã số tô bằng gradient sáng: đây là thứ người bệnh nhìn nhiều nhất trên màn này.
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Colors.white, AppColors.accent],
            ).createShader(bounds),
            child: Text(
              status.ticketCode,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppFonts.display,
                fontSize: 68,
                fontWeight: FontWeight.w800,
                height: 1,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
            decoration: BoxDecoration(
              color: priority
                  ? AppColors.accent.withValues(alpha: 0.16)
                  : Colors.white.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppRadii.pill),
              border: Border.all(
                color: priority
                    ? AppColors.accent.withValues(alpha: 0.35)
                    : Colors.white.withValues(alpha: 0.16),
              ),
            ),
            child: Text(
              priority
                  ? (status.priorityVerified ? 'Số ưu tiên' : 'Số ưu tiên · chờ xác minh')
                  : 'Số thường',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: priority ? AppColors.accent : AppColors.onDarkSubtle,
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Mã QR để quầy quét khi check-in, khỏi đọc số bằng miệng.
          Container(
            width: 128,
            height: 128,
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadii.card),
            ),
            child: QrImageView(
              data: status.ticketCode,
              version: QrVersions.auto,
              padding: EdgeInsets.zero,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: AppColors.navyDeep,
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: AppColors.navyDeep,
              ),
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Đưa mã này cho quầy tiếp đón khi được gọi',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Color(0xFFA3BEDC)),
          ),
        ],
      ),
    );
  }
}

/// Thẻ "đã tới lượt" — sáng hẳn lên, đọc được từ đầu kia hành lang.
class _CalledCard extends StatelessWidget {
  const _CalledCard({required this.roomName});
  final String roomName;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppGradients.ticketCalled,
        borderRadius: BorderRadius.circular(AppRadii.cardLarge),
      ),
      child: Row(
        children: [
          const Icon(Icons.notifications_active_rounded, size: 26, color: AppColors.navyInk),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              'Đã tới lượt bạn.\nVui lòng vào $roomName.',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                height: 1.4,
                color: AppColors.navyInk,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Ba hàng thống kê trong thẻ kính mờ.
class _WaitingStats extends StatelessWidget {
  const _WaitingStats({required this.status});
  final QueueTicketStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AppRadii.cardLarge),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          _StatRow(
            icon: Icons.campaign_outlined,
            label: 'Đang gọi số',
            value: status.currentServingTicket ?? 'Chưa gọi số nào',
          ),
          _statDivider,
          _StatRow(
            icon: Icons.people_outline,
            label: 'Còn chờ trước bạn',
            value: '${status.peopleAhead} người',
          ),
          _statDivider,
          _StatRow(
            icon: Icons.schedule,
            label: 'Dự kiến còn khoảng',
            value: '${status.estimatedWaitMinutes} phút',
            highlight: true,
          ),
        ],
      ),
    );
  }

  static Widget get _statDivider => Container(
        height: 1,
        color: Colors.white.withValues(alpha: 0.10),
      );
}

class _StatRow extends StatelessWidget {
  const _StatRow({
    required this.icon,
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.accent),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 15, color: AppColors.onDarkSubtle),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontFamily: AppFonts.display,
              fontSize: 19,
              fontWeight: FontWeight.w800,
              color: highlight ? AppColors.accent : Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

/// Thanh tiến độ hàng đợi.
class _QueueProgress extends StatelessWidget {
  const _QueueProgress({required this.progress, required this.ahead});

  final double progress;
  final int ahead;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Tiến độ hàng đợi',
              style: TextStyle(fontSize: 12, color: Color(0xFFA3BEDC)),
            ),
            Text(
              ahead == 0 ? 'Sắp tới lượt' : 'Còn $ahead người',
              style: const TextStyle(fontSize: 12, color: Color(0xFFA3BEDC)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadii.pill),
          child: Stack(
            children: [
              Container(height: 10, color: Colors.white.withValues(alpha: 0.10)),
              // Đổi mượt thay vì nhảy: người bệnh thấy thanh nhích lên là thấy hàng đang chạy.
              AnimatedFractionallySizedBox(
                duration: const Duration(milliseconds: 600),
                curve: Curves.easeOut,
                widthFactor: progress.clamp(0.02, 1.0),
                child: Container(
                  height: 10,
                  decoration: const BoxDecoration(gradient: AppGradients.ticketNumber),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Nút cập nhật + dòng nói rõ nhịp tự làm mới.
class _RefreshBar extends StatelessWidget {
  const _RefreshBar({
    required this.onRefresh,
    required this.lastUpdated,
    required this.intervalSeconds,
    required this.stopped,
  });

  final VoidCallback onRefresh;
  final DateTime? lastUpdated;
  final int intervalSeconds;
  final bool stopped;

  @override
  Widget build(BuildContext context) {
    final at = lastUpdated;
    final time = at == null
        ? null
        : '${at.hour.toString().padLeft(2, '0')}:${at.minute.toString().padLeft(2, '0')}';

    return Padding(
      padding: const EdgeInsets.fromLTRB(26, 8, 26, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppPrimaryButton(
            label: 'Cập nhật ngay',
            icon: Icons.refresh_rounded,
            onPressed: onRefresh,
            gradient: AppGradients.ticketCalled,
            foreground: AppColors.navyInk,
            height: 54,
          ),
          const SizedBox(height: 10),
          Text(
            // Nói rõ đã dừng tự cập nhật, thay vì để người bệnh ngồi đợi một con số không bao giờ
            // đổi nữa.
            stopped
                ? 'Đã ngừng tự cập nhật${time == null ? '' : ' · lần cuối $time'}'
                : 'Tự cập nhật mỗi $intervalSeconds giây'
                    '${time == null ? '' : ' · lần cuối $time'}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: Color(0xFF8CA6C2)),
          ),
        ],
      ),
    );
  }
}

/// Ghi chú trên nền tối.
class _GlassNote extends StatelessWidget {
  const _GlassNote({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, size: 20, color: AppColors.accent),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 14,
                height: 1.45,
                color: AppColors.onDarkSubtle,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Màn lỗi trên nền tối — `AppErrorState` dùng bảng màu nền sáng nên không dùng lại được ở đây.
class _DarkErrorView extends StatelessWidget {
  const _DarkErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(26),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_rounded, size: 56, color: AppColors.accent),
          const SizedBox(height: 14),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, height: 1.5, color: Colors.white),
          ),
          const SizedBox(height: 20),
          AppPrimaryButton(
            label: 'Thử lại',
            icon: Icons.refresh_rounded,
            onPressed: onRetry,
            gradient: AppGradients.ticketCalled,
            foreground: AppColors.navyInk,
            expand: false,
          ),
        ],
      ),
    );
  }
}
