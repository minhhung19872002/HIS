import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../../core/error/failure.dart';
import '../../../core/providers.dart';
import '../data/documents_repository.dart';
import '../domain/document_models.dart';

final _day = DateFormat('dd/MM/yyyy');

final documentsRepositoryProvider = Provider<DocumentsRepository>(
  (ref) => DocumentsRepository(ref.watch(apiClientProvider)),
);

final documentWalletProvider = FutureProvider.autoDispose<DocumentWallet>(
  (ref) => ref.watch(documentsRepositoryProvider).wallet(),
);

/// Ví giấy tờ — HSMT I.2 #8.
class DocumentsPage extends ConsumerStatefulWidget {
  const DocumentsPage({super.key});

  @override
  ConsumerState<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends ConsumerState<DocumentsPage> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(documentWalletProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Ví giấy tờ')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _busy ? null : _add,
        icon: _busy
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.add_a_photo_outlined),
        label: const Text('Thêm giấy tờ'),
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
                Text(error is Failure ? error.message : 'Không tải được ví giấy tờ.',
                    textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: () => ref.invalidate(documentWalletProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (wallet) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(documentWalletProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            children: [
              _QuotaBar(wallet: wallet),
              const SizedBox(height: 8),
              Text(
                'Giấy tờ được mã hoá trước khi lưu trên máy chủ bệnh viện. Chỉ bạn xem được.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),

              if (wallet.items.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 64),
                  child: Column(
                    children: [
                      Icon(Icons.folder_open_outlined, size: 56),
                      SizedBox(height: 12),
                      Text('Ví của bạn chưa có giấy tờ nào.', textAlign: TextAlign.center),
                    ],
                  ),
                )
              else
                for (final document in wallet.items)
                  Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Icon(document.isPdf
                          ? Icons.picture_as_pdf_outlined
                          : Icons.image_outlined),
                      title: Text(document.title),
                      subtitle: Text([
                        DocumentCategory.parse(document.category).label,
                        document.readableSize,
                        if (document.createdAt != null) _day.format(document.createdAt!),
                      ].join(' · ')),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        tooltip: 'Xoá',
                        onPressed: () => _remove(document),
                      ),
                      onTap: () => _preview(document),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }

  /// Chụp ảnh, chọn ảnh có sẵn, hay chọn tệp PDF — ba đường người bệnh thật sự dùng.
  Future<void> _add() async {
    final source = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Chụp ảnh giấy tờ'),
              onTap: () => Navigator.pop(context, 'camera'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Chọn ảnh có sẵn'),
              onTap: () => Navigator.pop(context, 'gallery'),
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf_outlined),
              title: const Text('Chọn tệp PDF'),
              onTap: () => Navigator.pop(context, 'pdf'),
            ),
          ],
        ),
      ),
    );

    if (source == null || !mounted) return;

    Uint8List? bytes;
    String fileName = '';
    String contentType = '';

    try {
      if (source == 'pdf') {
        final picked = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: const ['pdf'],
          withData: true,
        );
        final file = picked?.files.firstOrNull;
        if (file?.bytes == null) return;
        bytes = file!.bytes;
        fileName = file.name;
        contentType = 'application/pdf';
      } else {
        final picked = await ImagePicker().pickImage(
          source: source == 'camera' ? ImageSource.camera : ImageSource.gallery,
          // Ảnh chụp bằng máy đời mới lên tới 8–10 MB. Giảm ngay lúc chọn để vừa hạn mức và
          // vừa đỡ tốn dữ liệu di động của người bệnh — giấy tờ đọc được ở 1600px là đủ.
          maxWidth: 1600,
          imageQuality: 80,
        );
        if (picked == null) return;
        bytes = await picked.readAsBytes();
        fileName = picked.name;
        contentType = picked.mimeType ?? 'image/jpeg';
      }
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không đọc được tệp: $e')),
        );
      }
      return;
    }

    if (bytes == null || !mounted) return;

    final meta = await _askMeta(fileName);
    if (meta == null || !mounted) return;

    setState(() => _busy = true);
    try {
      await ref.read(documentsRepositoryProvider).upload(
            bytes: bytes,
            fileName: fileName,
            contentType: contentType,
            category: meta.category,
            title: meta.title,
            note: meta.note,
          );
      ref.invalidate(documentWalletProvider);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Đã lưu vào ví giấy tờ.')));
      }
    } on Failure catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<_DocumentMeta?> _askMeta(String suggestedTitle) async {
    var category = DocumentCategory.other;
    final title = TextEditingController(text: suggestedTitle);
    final note = TextEditingController();

    return showDialog<_DocumentMeta>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Lưu giấy tờ'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<DocumentCategory>(
                value: category,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Loại giấy tờ'),
                items: [
                  for (final c in DocumentCategory.values)
                    DropdownMenuItem(value: c, child: Text(c.label)),
                ],
                onChanged: (v) => setState(() => category = v ?? DocumentCategory.other),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: title,
                decoration: const InputDecoration(labelText: 'Tên gợi nhớ'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: note,
                decoration: const InputDecoration(labelText: 'Ghi chú (không bắt buộc)'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Huỷ')),
            FilledButton(
              onPressed: () => Navigator.pop(
                context,
                _DocumentMeta(category, title.text.trim(), note.text.trim()),
              ),
              child: const Text('Lưu'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _preview(PatientDocument document) async {
    if (!document.isImage) {
      // PDF chưa xem được ngay trong app (gói đọc PDF phải ghim bản cũ vì iOS 12 — xem D3).
      // Nói thẳng thay vì mở một màn trắng.
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tệp PDF hiện chỉ lưu trữ, chưa xem được trong app.')),
      );
      return;
    }

    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _DocumentViewerPage(document: document),
    ));
  }

  Future<void> _remove(PatientDocument document) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xoá giấy tờ?'),
        content: Text('"${document.title}" sẽ bị xoá khỏi ví và không khôi phục được.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Xoá')),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await ref.read(documentsRepositoryProvider).remove(document.id);
      ref.invalidate(documentWalletProvider);
    } on Failure catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

class _DocumentMeta {
  const _DocumentMeta(this.category, this.title, this.note);
  final DocumentCategory category;
  final String title;
  final String note;
}

class _QuotaBar extends StatelessWidget {
  const _QuotaBar({required this.wallet});
  final DocumentWallet wallet;

  @override
  Widget build(BuildContext context) {
    final nearlyFull = wallet.usedRatio > 0.9;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Expanded chứ không để Text tự do: ở cỡ chữ mới, nhãn cộng con số dung lượng rộng
            // hơn thẻ trên màn 360dp và hàng bị tràn.
            Expanded(
              child: Text(
                'Dung lượng đã dùng',
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ),
            const SizedBox(width: 8),
            Text(wallet.readableUsed),
          ],
        ),
        const SizedBox(height: 4),
        LinearProgressIndicator(
          value: wallet.usedRatio,
          color: nearlyFull ? Theme.of(context).colorScheme.error : null,
        ),
      ],
    );
  }
}

class _DocumentViewerPage extends ConsumerStatefulWidget {
  const _DocumentViewerPage({required this.document});
  final PatientDocument document;

  @override
  ConsumerState<_DocumentViewerPage> createState() => _DocumentViewerPageState();
}

class _DocumentViewerPageState extends ConsumerState<_DocumentViewerPage> {
  late final Future<Uint8List> _future =
      ref.read(documentsRepositoryProvider).content(widget.document.id);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.document.title),
      ),
      body: Center(
        child: FutureBuilder<Uint8List>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              final error = snapshot.error;
              return Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  error is Failure ? error.message : 'Không mở được giấy tờ này.',
                  style: const TextStyle(color: Colors.white70),
                  textAlign: TextAlign.center,
                ),
              );
            }
            if (!snapshot.hasData) return const CircularProgressIndicator();

            return InteractiveViewer(
              minScale: 1,
              maxScale: 5,
              child: Image.memory(snapshot.data!, fit: BoxFit.contain),
            );
          },
        ),
      ),
    );
  }
}
