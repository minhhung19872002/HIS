import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/results_repository.dart';
import '../domain/result_models.dart';

final resultsRepositoryProvider = Provider<ResultsRepository>(
  (ref) => ResultsRepository(ref.watch(apiClientProvider)),
);

/// Lọc theo một lượt khám; null = xem tất cả.
///
/// Dùng chung cho mọi tab để người bệnh chọn "lần khám ngày 5/9" một lần là cả xét nghiệm, chẩn đoán
/// hình ảnh và thăm dò chức năng cùng lọc theo — thay vì phải chọn lại ở từng tab.
class VisitFilter extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String? visitId) => state = visitId;
}

final visitFilterProvider = NotifierProvider<VisitFilter, String?>(VisitFilter.new);

final visitsProvider = FutureProvider.autoDispose<List<Visit>>(
  (ref) => ref.watch(resultsRepositoryProvider).visits(),
);

final labResultsProvider = FutureProvider.autoDispose<List<LabResult>>(
  (ref) => ref.watch(resultsRepositoryProvider).labResults(visitId: ref.watch(visitFilterProvider)),
);

final labResultProvider = FutureProvider.autoDispose.family<LabResult, String>(
  (ref, id) => ref.watch(resultsRepositoryProvider).labResult(id),
);

final imagingResultsProvider = FutureProvider.autoDispose<List<ImagingResult>>(
  (ref) =>
      ref.watch(resultsRepositoryProvider).imagingResults(visitId: ref.watch(visitFilterProvider)),
);

final imagingResultProvider = FutureProvider.autoDispose.family<ImagingResult, String>(
  (ref, id) => ref.watch(resultsRepositoryProvider).imagingResult(id),
);

final imagingImagesProvider = FutureProvider.autoDispose.family<List<ImagingInstance>, String>(
  (ref, resultId) => ref.watch(resultsRepositoryProvider).imagingImages(resultId),
);

final functionalResultsProvider = FutureProvider.autoDispose<List<FunctionalResult>>(
  (ref) => ref
      .watch(resultsRepositoryProvider)
      .functionalResults(visitId: ref.watch(visitFilterProvider)),
);

final functionalResultProvider = FutureProvider.autoDispose.family<FunctionalResult, String>(
  (ref, id) => ref.watch(resultsRepositoryProvider).functionalResult(id),
);

final healthCheckupsProvider = FutureProvider.autoDispose<List<HealthCheckup>>(
  (ref) => ref.watch(resultsRepositoryProvider).healthCheckups(),
);

final prescriptionsProvider = FutureProvider.autoDispose<List<Prescription>>(
  (ref) => ref.watch(resultsRepositoryProvider).prescriptions(),
);
