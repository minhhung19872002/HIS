import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../domain/result_models.dart';
import 'results_providers.dart';
import 'widgets/result_scaffolding.dart';

final _dateTime = DateFormat('HH:mm dd/MM/yyyy');

/// Chi tiết một phiếu chẩn đoán hình ảnh + khung xem ảnh PACS (HSMT I.2 #5).
class ImagingResultPage extends ConsumerWidget {
  const ImagingResultPage({super.key, required this.resultId});

  final String resultId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(imagingResultProvider(resultId));

    return Scaffold(
      appBar: AppBar(title: const Text('Kết quả chẩn đoán hình ảnh')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ResultErrorView(
          error: error,
          onRetry: () => ref.invalidate(imagingResultProvider(resultId)),
        ),
        data: (img) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(img.title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            DetailRow(Icons.tag, 'Mã phiếu', img.orderCode),
            DetailRow(Icons.description_outlined, 'Kỹ thuật', img.studyDescription),
            DetailRow(Icons.schedule, 'Ngày chụp',
                img.studyDate == null ? null : _dateTime.format(img.studyDate!)),
            DetailRow(Icons.person_outline, 'Bác sĩ chỉ định', img.orderingDoctor),
            DetailRow(Icons.visibility_outlined, 'Bác sĩ đọc phim', img.reportingDoctor),

            DetailSection(title: 'Mô tả hình ảnh', body: img.findings),
            DetailSection(title: 'Kết luận', body: img.impression, highlight: true),
            DetailSection(title: 'Đề nghị', body: img.recommendations),

            const SizedBox(height: 24),
            Text('Hình ảnh', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (!img.hasImages)
              // Nói thẳng là không có ảnh. Nhiều kỹ thuật (siêu âm mô tả, đọc phim ngoài) vốn không
              // lưu ảnh vào PACS, và im lặng ở đây sẽ bị hiểu là app hỏng.
              const Text('Ca chụp này không có hình ảnh lưu trên hệ thống.')
            else
              _ImageStrip(resultId: resultId),
          ],
        ),
      ),
    );
  }
}

class _ImageStrip extends ConsumerWidget {
  const _ImageStrip({required this.resultId});
  final String resultId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(imagingImagesProvider(resultId));

    return async.when(
      loading: () => const SizedBox(height: 120, child: Center(child: CircularProgressIndicator())),
      error: (_, _) => Text(
        'Chưa tải được hình ảnh. Vui lòng thử lại sau.',
        style: Theme.of(context).textTheme.bodyMedium,
      ),
      data: (images) => images.isEmpty
          ? const Text('Ca chụp này không có hình ảnh lưu trên hệ thống.')
          : GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              children: [
                for (final image in images)
                  _Thumbnail(
                    resultId: resultId,
                    instance: image,
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => ImageViewerPage(
                        resultId: resultId,
                        images: images,
                        initialIndex: images.indexOf(image),
                      ),
                    )),
                  ),
              ],
            ),
    );
  }
}

/// Ảnh PACS tải qua BFF.
///
/// Là `StatefulWidget` chứ không phải một `FutureBuilder` dựng trong `build`: dựng trong `build`
/// nghĩa là mỗi lần widget vẽ lại sẽ tải lại ảnh — vuốt qua vuốt lại trong khung xem ảnh là tải hàng
/// chục lần cùng một ảnh CT.
class _PacsImage extends ConsumerStatefulWidget {
  const _PacsImage({
    super.key,
    required this.resultId,
    required this.instanceId,
    required this.width,
    required this.fit,
  });

  final String resultId;
  final String instanceId;
  final int width;
  final BoxFit fit;

  @override
  ConsumerState<_PacsImage> createState() => _PacsImageState();
}

class _PacsImageState extends ConsumerState<_PacsImage> {
  late Future<Uint8List> _future;

  @override
  void initState() {
    super.initState();
    _future = ref
        .read(resultsRepositoryProvider)
        .imagingImageBytes(widget.resultId, widget.instanceId, width: widget.width);
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Uint8List>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return const Center(child: Icon(Icons.broken_image_outlined, color: Colors.white70));
          }
          if (!snapshot.hasData) {
            return const Center(
              child: SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)),
            );
          }
          return Image.memory(snapshot.data!, fit: widget.fit);
        },
      );
}

class _Thumbnail extends StatelessWidget {
  const _Thumbnail({required this.resultId, required this.instance, required this.onTap});

  final String resultId;
  final ImagingInstance instance;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Container(
            color: Colors.black12,
            // Ảnh nhỏ tải ở 320px: đủ nét cho ô 1/3 màn hình mà nhẹ hơn hẳn ảnh đầy đủ — chuyện
            // đáng kể với mạng 3G ở tuyến huyện.
            child: _PacsImage(
              resultId: resultId,
              instanceId: instance.instanceId,
              width: 320,
              fit: BoxFit.cover,
            ),
          ),
        ),
      );
}

/// Xem ảnh toàn màn hình, vuốt sang ảnh khác, chụm để phóng to.
class ImageViewerPage extends ConsumerStatefulWidget {
  const ImageViewerPage({
    super.key,
    required this.resultId,
    required this.images,
    required this.initialIndex,
  });

  final String resultId;
  final List<ImagingInstance> images;
  final int initialIndex;

  @override
  ConsumerState<ImageViewerPage> createState() => _ImageViewerPageState();
}

class _ImageViewerPageState extends ConsumerState<ImageViewerPage> {
  late final PageController _controller = PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final current = widget.images[_index];

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('Ảnh ${_index + 1}/${widget.images.length}'),
        // Nói rõ ảnh thuộc chuỗi nào: một ca chụp CT có nhiều chuỗi, mất ngữ cảnh này thì các ảnh
        // trông như nhau.
        bottom: current.seriesDescription?.isNotEmpty == true
            ? PreferredSize(
                preferredSize: const Size.fromHeight(24),
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(current.seriesDescription!,
                      style: const TextStyle(color: Colors.white70, fontSize: 12)),
                ),
              )
            : null,
      ),
      body: PageView.builder(
        controller: _controller,
        itemCount: widget.images.length,
        onPageChanged: (i) => setState(() => _index = i),
        itemBuilder: (context, i) => _ZoomableImage(
          key: ValueKey(widget.images[i].instanceId),
          child: Center(
            // Giữ `key` theo instanceId: mất nó thì mỗi lần widget dựng lại là tải lại ảnh CT.
            child: _PacsImage(
              key: ValueKey('pacs-${widget.images[i].instanceId}'),
              resultId: widget.resultId,
              instanceId: widget.images[i].instanceId,
              width: 1024,
              fit: BoxFit.contain,
            ),
          ),
        ),
      ),
    );
  }
}

/// Ảnh chụm-để-phóng-to, nhưng **chỉ kéo ảnh khi đã phóng to**.
///
/// Vì sao phải tách ra thay vì dùng `InteractiveViewer` trơn: ở mức thu gọn (scale = 1) `InteractiveViewer`
/// vẫn nhận cú kéo ngang — mà kéo một ảnh chưa phóng to thì KHÔNG có gì để kéo, nên cú vuốt chỉ đơn
/// giản bị ăn mất và **không sang được ảnh kế**. Bộ đi-hết-chức-năng bắt được đúng chuyện này: cùng
/// một mã, cùng một cú vuốt, máy ảo Android không đổi ảnh còn iOS simulator thì đổi — tranh chấp cử
/// chỉ, ai thắng tuỳ lúc. Người bệnh gặp nó dưới dạng "vuốt mãi không sang ảnh khác".
///
/// Tắt `panEnabled` khi chưa phóng to thì cú kéo ngang về lại `PageView` ở cả hai nền tảng; phóng to
/// rồi mới bật kéo để soi từng vùng ảnh.
class _ZoomableImage extends StatefulWidget {
  const _ZoomableImage({super.key, required this.child});

  final Widget child;

  @override
  State<_ZoomableImage> createState() => _ZoomableImageState();
}

class _ZoomableImageState extends State<_ZoomableImage> {
  final _transform = TransformationController();
  bool _zoomed = false;

  @override
  void initState() {
    super.initState();
    _transform.addListener(_onTransform);
  }

  void _onTransform() {
    // `getMaxScaleOnAxis` là mức phóng hiện tại. Chừa một khoảng nhỏ để sai số dấu phẩy động lúc
    // chụm-rồi-nhả không làm cờ nhảy qua nhảy lại.
    final zoomed = _transform.value.getMaxScaleOnAxis() > 1.01;
    if (zoomed != _zoomed) setState(() => _zoomed = zoomed);
  }

  @override
  void dispose() {
    _transform.removeListener(_onTransform);
    _transform.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => InteractiveViewer(
        transformationController: _transform,
        minScale: 1,
        maxScale: 5,
        panEnabled: _zoomed,
        child: widget.child,
      );
}
