import 'package:shared_preferences/shared_preferences.dart';

/// A thin abstraction over [SharedPreferences].
///
/// Provides typed `read` / `write` helpers and serves as the single
/// persistence layer for non-sensitive user preferences. Replaces the
/// legacy `StorageProvider`.
class LocalStorageService {
  LocalStorageService(this._prefs);

  final SharedPreferences _prefs;

  /// Constructs the service asynchronously, then hands the instance to DI.
  static Future<LocalStorageService> create() async {
    final prefs = await SharedPreferences.getInstance();
    return LocalStorageService(prefs);
  }

  // ─── Typed read helpers ──────────────────────────────────────────────────

  T? read<T>(String key) {
    final value = _prefs.get(key);
    if (value is T) return value;
    return null;
  }

  String? readString(String key) => _prefs.getString(key);
  int? readInt(String key) => _prefs.getInt(key);
  double? readDouble(String key) => _prefs.getDouble(key);
  bool? readBool(String key) => _prefs.getBool(key);
  List<String>? readStringList(String key) => _prefs.getStringList(key);

  // ─── Write helpers ───────────────────────────────────────────────────────

  Future<bool> write(String key, Object value) {
    if (value is String) return _prefs.setString(key, value);
    if (value is int) return _prefs.setInt(key, value);
    if (value is double) return _prefs.setDouble(key, value);
    if (value is bool) return _prefs.setBool(key, value);
    if (value is List<String>) return _prefs.setStringList(key, value);
    throw ArgumentError(
      'Unsupported value type for LocalStorageService: ${value.runtimeType}',
    );
  }

  Future<bool> remove(String key) => _prefs.remove(key);
  Future<bool> clear() => _prefs.clear();
  bool containsKey(String key) => _prefs.containsKey(key);
}
