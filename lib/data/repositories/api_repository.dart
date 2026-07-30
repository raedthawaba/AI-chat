import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../models/ai_model.dart';
import '../models/conversation_model.dart';
import '../models/message_model.dart';
import '../models/subscription_model.dart';
import '../services/api_service.dart';

/// Public API the rest of the app talks to. Cubits depend on this — never
/// on [ApiService] directly. Replaces the legacy `ApiProvider`.
class ApiRepository {
  ApiRepository(this._api);

  final ApiService _api;

  // ─── Models ───────────────────────────────────────────────────────────────

  Future<Either<Failure, List<AiModel>>> getAiModels() => _guard(() async {
        final res = await _api.get<List<dynamic>>(_api.endpoints.aiModels);
        return (res.data ?? const [])
            .cast<Map<String, dynamic>>()
            .map(AiModel.fromJson)
            .toList();
      });

  // ─── Conversations ────────────────────────────────────────────────────────

  Future<Either<Failure, List<ConversationModel>>> getConversations() =>
      _guard(() async {
        final res =
            await _api.get<List<dynamic>>(_api.endpoints.conversations);
        return (res.data ?? const [])
            .cast<Map<String, dynamic>>()
            .map(ConversationModel.fromJson)
            .toList();
      });

  Future<Either<Failure, ConversationModel>> createConversation({
    required String title,
    required String modelId,
  }) =>
      _guard(() async {
        final res = await _api.post<Map<String, dynamic>>(
          _api.endpoints.conversations,
          data: {'title': title, 'model_id': modelId},
        );
        return ConversationModel.fromJson(res.data!);
      });

  Future<Either<Failure, Unit>> deleteConversation(String id) => _guard(() async {
        await _api.delete(_api.endpoints.conversationById(id));
        return unit;
      });

  // ─── Messages ─────────────────────────────────────────────────────────────

  Future<Either<Failure, List<MessageModel>>> getMessages(String conversationId) =>
      _guard(() async {
        final res = await _api.get<List<dynamic>>(
          _api.endpoints.messages(conversationId),
        );
        return (res.data ?? const [])
            .cast<Map<String, dynamic>>()
            .map(MessageModel.fromJson)
            .toList();
      });

  Future<Either<Failure, MessageModel>> sendMessage({
    required String conversationId,
    required String content,
  }) =>
      _guard(() async {
        final res = await _api.post<Map<String, dynamic>>(
          _api.endpoints.messages(conversationId),
          data: {'content': content},
        );
        return MessageModel.fromJson(res.data!);
      });

  // ─── Subscriptions ────────────────────────────────────────────────────────

  Future<Either<Failure, SubscriptionModel>> getCurrentSubscription() =>
      _guard(() async {
        final res =
            await _api.get<Map<String, dynamic>>(_api.endpoints.subscription);
        return SubscriptionModel.fromJson(res.data!);
      });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  Future<Either<Failure, T>> _guard<T>(Future<T> Function() body) async {
    try {
      return Right(await body());
    } on DioException catch (e) {
      return Left(_mapDioError(e));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  Failure _mapDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return const NetworkFailure('Connection timed out');
      case DioExceptionType.badResponse:
        final code = e.response?.statusCode ?? 0;
        return ServerFailure(
          'Server returned $code',
          statusCode: code,
        );
      case DioExceptionType.cancel:
        return const NetworkFailure('Request cancelled');
      case DioExceptionType.connectionError:
        return const NetworkFailure('No internet connection');
      case DioExceptionType.badCertificate:
        return const NetworkFailure('Bad certificate');
      case DioExceptionType.unknown:
        return UnknownFailure(e.message ?? 'Unknown error');
    }
  }
}
