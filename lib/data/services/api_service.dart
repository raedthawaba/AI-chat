import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';

import '../../core/network/endpoints.dart';
import '../../core/network/interceptors/auth_interceptor.dart';
import '../../core/network/interceptors/logging_interceptor.dart';
import '../../core/network/interceptors/retry_interceptor.dart';
import '../../core/services/secure_storage_service.dart';

/// Low-level HTTP transport. Owned by [ApiRepository] — never used directly
/// from Cubits or widgets.
class ApiService {
  ApiService({
    required String baseUrl,
    required SecureStorageService secureStorage,
    Dio? dio,
  }) : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl,
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 20),
                sendTimeout: const Duration(seconds: 15),
                headers: const {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
              ),
            ) {
    _dio.interceptors.addAll([
      AuthInterceptor(secureStorage),
      RetryInterceptor(_dio),
      LoggingInterceptor(_dio),
      PrettyDioLogger(
        requestBody: true,
        responseBody: true,
        requestHeader: false,
        responseHeader: false,
        compact: true,
      ),
    ]);
  }

  final Dio _dio;
  final Endpoints _endpoints = Endpoints();

  Endpoints get endpoints => _endpoints;
  Dio get dio => _dio;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.get<T>(path, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response<T>> put<T>(
    String path, {
    Object? data,
    Options? options,
  }) {
    return _dio.put<T>(path, data: data, options: options);
  }

  Future<Response<T>> delete<T>(String path, {Options? options}) {
    return _dio.delete<T>(path, options: options);
  }
}
