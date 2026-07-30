import 'package:flutter/material.dart';

/// Spacing tokens. Use these via [Theme.spacing] or import directly.
class AppSpacing {
  const AppSpacing();

  static const AppSpacing instance = AppSpacing();

  final double xxs = 2;
  final double xs = 4;
  final double sm = 8;
  final double md = 16;
  final double lg = 24;
  final double xl = 32;
  final double xxl = 48;
}

extension AppSpacingExtension on ThemeData {
  AppSpacing get spacing => AppSpacing.instance;
}
