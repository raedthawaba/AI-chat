import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

/// Lightweight Dio interceptor that surfaces request/response lifecycle
/// events through a [Logger]. Intended for development builds.
class LoggingInterceptor extends Interceptor {
  LoggingInterceptor(this._dio);

  final Dio _dio;
  final Logger _logger = Logger(
    printer: PrettyPrinter(methodCount: 0, colors: true, printEmojis: false),
  );

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    _logger.d('→ ${options.method} ${options.uri}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    _logger.d(
      '← ${response.statusCode} '
      '${response.requestOptions.method} ${response.requestOptions.uri}',
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _logger.e(
      '✗ ${err.response?.statusCode ?? 'NO_STATUS'} '
      '${err.requestOptions.method} ${err.requestOptions.uri} '
      '— ${err.message}',
    );
    handler.next(err);
  }
}
