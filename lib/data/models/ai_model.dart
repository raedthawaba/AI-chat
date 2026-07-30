import 'package:equatable/equatable.dart';

class AiModel extends Equatable {
  const AiModel({
    required this.id,
    required this.name,
    required this.provider,
    this.description,
    this.contextWindow = 0,
  });

  factory AiModel.fromJson(Map<String, dynamic> json) => AiModel(
        id: json['id'] as String,
        name: json['name'] as String,
        provider: json['provider'] as String? ?? 'unknown',
        description: json['description'] as String?,
        contextWindow: json['context_window'] as int? ?? 0,
      );

  final String id;
  final String name;
  final String provider;
  final String? description;
  final int contextWindow;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'provider': provider,
        'description': description,
        'context_window': contextWindow,
      };

  @override
  List<Object?> get props => [id, name, provider, description, contextWindow];
}
