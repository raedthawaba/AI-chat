import 'package:equatable/equatable.dart';

enum MessageRole { user, assistant, system }

MessageRole _roleFromString(String raw) {
  switch (raw) {
    case 'user':
      return MessageRole.user;
    case 'system':
      return MessageRole.system;
    case 'assistant':
    default:
      return MessageRole.assistant;
  }
}

class MessageModel extends Equatable {
  const MessageModel({
    required this.id,
    required this.conversationId,
    required this.role,
    required this.content,
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) => MessageModel(
        id: json['id'] as String,
        conversationId: json['conversation_id'] as String,
        role: _roleFromString(json['role'] as String? ?? 'assistant'),
        content: json['content'] as String? ?? '',
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  final String id;
  final String conversationId;
  final MessageRole role;
  final String content;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'conversation_id': conversationId,
        'role': role.name,
        'content': content,
        'created_at': createdAt.toIso8601String(),
      };

  @override
  List<Object?> get props => [id, conversationId, role, content, createdAt];
}
