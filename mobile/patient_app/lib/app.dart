import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers.dart';
import 'core/router/app_router.dart';
import 'core/security/lock_gate.dart';
import 'features/home/presentation/update_gate.dart';
import 'core/theme/app_theme.dart';
import 'l10n/app_localizations.dart';

/// Gốc widget của app, dùng chung cho cả ba flavor.
class PatientApp extends ConsumerWidget {
  const PatientApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    return MaterialApp.router(
      title: config.appName,
      debugShowCheckedModeBanner: !config.isProd,
      routerConfig: ref.watch(routerProvider),
      // Bọc mọi màn bằng lớp tự khoá. Đặt ở đây để màn hình viết sau này tự được bảo vệ mà tác giả
      // không phải nhớ gì (HSMT I.2 #9).
      // Hai lớp phủ toàn app, thứ tự có chủ đích: chặn bản quá cũ TRƯỚC, vì một bản hỏng có thể
      // hỏng ngay ở màn khoá; rồi mới tới lớp tự khoá.
      builder: (context, child) => UpdateGate(
        child: LockGate(child: child ?? const SizedBox.shrink()),
      ),
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      // Tiếng Việt là mặc định; tiếng Anh có sẵn để bật sau (HSMT/prompt §1.6).
      locale: const Locale('vi'),
      supportedLocales: AppL10n.supportedLocales,
      localizationsDelegates: const [
        AppL10n.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
