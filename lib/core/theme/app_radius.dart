import 'package:flutter/material.dart';

/// Border radius tokens. Use via [Theme.radius] or import directly.
class AppRadius {
  const AppRadius();

  static const AppRadius instance = AppRadius();

  final Radius xs = const Radius.circular(4);
  final Radius sm = const Radius.circular(8);
  final Radius md = const Radius.circular(12);
  final Radius lg = const Radius.circular(16);
  final Radius xl = const Radius.circular(24);
  final Radius pill = const Radius.circular(999);
}

extension AppRadiusExtension on ThemeData {
  AppRadius get radius => AppRadius.instance;
}
