import 'package:get_it/get_it.dart';

import '../../data/repositories/api_repository.dart';
import '../../data/services/api_service.dart';
import '../config/app_config.dart';
import '../services/local_storage_service.dart';
import '../services/secure_storage_service.dart';

/// Service locator. Use `sl<T>()` to resolve dependencies from anywhere.
final GetIt sl = GetIt.instance;

/// Wires up the entire dependency graph. Must be awaited inside `main()`
/// before [runApp] is called.
Future<void> configureDependencies() async {
  // ─── Config ───────────────────────────────────────────────────────────────
  final config = AppConfig.fromEnv();
  sl.registerSingleton<AppConfig>(config);

  // ─── Services (singletons) ────────────────────────────────────────────────
  final localStorage = await LocalStorageService.create();
  sl.registerSingleton<LocalStorageService>(localStorage);
  sl.registerSingleton<SecureStorageService>(SecureStorageService());

  // ─── Networking ───────────────────────────────────────────────────────────
  sl.registerLazySingleton<ApiService>(
    () => ApiService(
      baseUrl: config.apiBaseUrl,
      secureStorage: sl<SecureStorageService>(),
    ),
  );
  sl.registerLazySingleton<ApiRepository>(
    () => ApiRepository(sl<ApiService>()),
  );
}
