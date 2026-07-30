import 'package:equatable/equatable.dart';

class ConversationModel extends Equatable {
  const ConversationModel({
    required this.id,
    required this.title,
    required this.modelId,
    required this.createdAt,
    required this.updatedAt,
    this.preview,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) =>
      ConversationModel(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        modelId: json['model_id'] as String? ?? '',
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
        preview: json['preview'] as String?,
      );

  final String id;
  final String title;
  final String modelId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? preview;

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'model_id': modelId,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        'preview': preview,
      };

  ConversationModel copyWith({
    String? id,
    String? title,
    String? modelId,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? preview,
  }) {
    return ConversationModel(
      id: id ?? this.id,
      title: title ?? this.title,
      modelId: modelId ?? this.modelId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      preview: preview ?? this.preview,
    );
  }

  @override
  List<Object?> get props =>
      [id, title, modelId, createdAt, updatedAt, preview];
}
