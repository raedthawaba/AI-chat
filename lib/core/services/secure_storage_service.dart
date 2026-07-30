import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Encrypted key-value storage for sensitive data (tokens, refresh tokens, etc.).
///
/// Lives alongside [LocalStorageService] but is reserved for secrets that
/// must not touch unencrypted disk.
class SecureStorageService {
  SecureStorageService([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  Future<String?> read(String key) => _storage.read(key: key);
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);
  Future<void> delete(String key) => _storage.delete(key: key);
  Future<void> deleteAll() => _storage.deleteAll();
  Future<bool> containsKey(String key) => _storage.containsKey(key: key);
}
