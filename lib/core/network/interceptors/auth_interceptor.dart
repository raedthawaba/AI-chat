import 'package:dio/dio.dart';

import '../../services/secure_storage_service.dart';

/// Attaches a bearer token (if present) to every outgoing request.
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._secureStorage);

  static const _tokenKey = 'auth_token';
  final SecureStorageService _secureStorage;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _secureStorage.read(_tokenKey);
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}
