import 'environments/development.dart';
import 'environments/production.dart';
import 'environments/staging.dart';
import 'flavor.dart';

/// Top-level configuration. The active flavor is chosen at compile time
/// via the `--dart-define=APP_FLAVOR=<name>` flag.
class AppConfig {
  const AppConfig._({
    required this.flavor,
    required this.apiBaseUrl,
    required this.appName,
  });

  factory AppConfig.fromEnv() {
    const flavorName = String.fromEnvironment('APP_FLAVOR', defaultValue: 'dev');
    switch (flavorName) {
      case 'prod':
        return AppConfig._(
          flavor: Flavor.production,
          apiBaseUrl: ProductionEnv.apiBaseUrl,
          appName: ProductionEnv.appName,
        );
      case 'staging':
        return AppConfig._(
          flavor: Flavor.staging,
          apiBaseUrl: StagingEnv.apiBaseUrl,
          appName: StagingEnv.appName,
        );
      case 'dev':
      default:
        return AppConfig._(
          flavor: Flavor.development,
          apiBaseUrl: DevelopmentEnv.apiBaseUrl,
          appName: DevelopmentEnv.appName,
        );
    }
  }

  final Flavor flavor;
  final String apiBaseUrl;
  final String appName;

  bool get isProduction => flavor == Flavor.production;
  bool get isStaging => flavor == Flavor.staging;
  bool get isDevelopment => flavor == Flavor.development;
}
