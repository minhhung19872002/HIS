import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/inpatient_models.dart';
import '../domain/result_models.dart';
import 'results_providers.dart';

final admissionsProvider = FutureProvider.autoDispose<List<Admission>>(
  (ref) => ref.watch(resultsRepositoryProvider).admissions(),
);

final medicineDisclosureProvider =
    FutureProvider.autoDispose.family<MedicineDisclosure, String>(
  (ref, admissionId) => ref.watch(resultsRepositoryProvider).medicineDisclosure(admissionId),
);

final serviceOrdersProvider = FutureProvider.autoDispose.family<List<ServiceOrder>, String>(
  (ref, admissionId) => ref.watch(resultsRepositoryProvider).serviceOrders(admissionId),
);

final admissionLabProvider = FutureProvider.autoDispose.family<List<LabResult>, String>(
  (ref, admissionId) =>
      ref.watch(resultsRepositoryProvider).labResults(admissionId: admissionId),
);

final admissionImagingProvider = FutureProvider.autoDispose.family<List<ImagingResult>, String>(
  (ref, admissionId) =>
      ref.watch(resultsRepositoryProvider).imagingResults(admissionId: admissionId),
);

final admissionFunctionalProvider =
    FutureProvider.autoDispose.family<List<FunctionalResult>, String>(
  (ref, admissionId) =>
      ref.watch(resultsRepositoryProvider).functionalResults(admissionId: admissionId),
);
