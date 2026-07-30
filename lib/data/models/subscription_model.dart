import 'package:equatable/equatable.dart';

enum SubscriptionTier { free, pro, enterprise }

SubscriptionTier _tierFromString(String raw) {
  switch (raw) {
    case 'pro':
      return SubscriptionTier.pro;
    case 'enterprise':
      return SubscriptionTier.enterprise;
    case 'free':
    default:
      return SubscriptionTier.free;
  }
}

class SubscriptionModel extends Equatable {
  const SubscriptionModel({
    required this.id,
    required this.tier,
    required this.renewsAt,
    this.isActive = true,
    this.usageQuota = 0,
    this.usageConsumed = 0,
  });

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) =>
      SubscriptionModel(
        id: json['id'] as String,
        tier: _tierFromString(json['tier'] as String? ?? 'free'),
        renewsAt: DateTime.parse(json['renews_at'] as String),
        isActive: json['is_active'] as bool? ?? true,
        usageQuota: json['usage_quota'] as int? ?? 0,
        usageConsumed: json['usage_consumed'] as int? ?? 0,
      );

  final String id;
  final SubscriptionTier tier;
  final DateTime renewsAt;
  final bool isActive;
  final int usageQuota;
  final int usageConsumed;

  double get usageRatio =>
      usageQuota == 0 ? 0 : (usageConsumed / usageQuota).clamp(0, 1);

  Map<String, dynamic> toJson() => {
        'id': id,
        'tier': tier.name,
        'renews_at': renewsAt.toIso8601String(),
        'is_active': isActive,
        'usage_quota': usageQuota,
        'usage_consumed': usageConsumed,
      };

  @override
  List<Object?> get props =>
      [id, tier, renewsAt, isActive, usageQuota, usageConsumed];
}
