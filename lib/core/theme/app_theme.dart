import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_radius.dart';
import 'app_spacing.dart';
import 'app_text_styles.dart';

/// Builds [ThemeData] instances consumed by [MaterialApp]. Themes are
/// derived from a single [ThemeMode] and share all other design tokens
/// defined in this folder.
class AppTheme {
  const AppTheme._();

  static ThemeData fromMode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.dark:
        return _dark();
      case ThemeMode.light:
        return _light();
      case ThemeMode.system:
        return _light();
    }
  }

  static ThemeData _light() => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorScheme: AppColors.lightScheme,
        scaffoldBackgroundColor: AppColors.lightBackground,
        textTheme: AppTextStyles.textTheme(AppColors.lightText),
        spacing: AppSpacing.instance,
        radius: AppRadius.instance,
      );

  static ThemeData _dark() => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: AppColors.darkScheme,
        scaffoldBackgroundColor: AppColors.darkBackground,
        textTheme: AppTextStyles.textTheme(AppColors.darkText),
        spacing: AppSpacing.instance,
        radius: AppRadius.instance,
      );
}
