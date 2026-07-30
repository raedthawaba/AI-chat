import 'package:dio/dio.dart';

/// Retries idempotent requests (GET only) up to [_maxRetries] times on
/// transient network failures. Backoff is exponential.
class RetryInterceptor extends Interceptor {
  RetryInterceptor(this._dio, {int maxRetries = 2})
      : _maxRetries = maxRetries;

  final Dio _dio;
  final int _maxRetries;

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final attempt = (err.requestOptions.extra['retry_attempt'] as int?) ?? 0;
    final shouldRetry = _isRetriable(err) && attempt < _maxRetries;
    if (!shouldRetry) return handler.next(err);

    final nextAttempt = attempt + 1;
    final delay = Duration(milliseconds: 300 * (1 << attempt));
    await Future<void>.delayed(delay);

    final opts = err.requestOptions
      ..extra['retry_attempt'] = nextAttempt;
    try {
      final response = await _dio.fetch<dynamic>(opts);
      handler.resolve(response);
    } on DioException catch (e) {
      handler.next(e);
    }
  }

  bool _isRetriable(DioException e) {
    final method = e.requestOptions.method.toUpperCase();
    if (method != 'GET') return false;
    return e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout;
  }
}
