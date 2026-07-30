import 'package:flutter/material.dart';

/// Brand and semantic colors. The full token list lives here so screen-level
/// widgets never hardcode hex values.
class AppColors {
  const AppColors._();

  static const Color brandPrimary = Color(0xFF6750A4);
  static const Color brandSecondary = Color(0xFF625B71);
  static const Color brandTertiary = Color(0xFF7D5260);

  static const Color lightBackground = Color(0xFFFFFBFE);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightText = Color(0xFF1C1B1F);

  static const Color darkBackground = Color(0xFF1C1B1F);
  static const Color darkSurface = Color(0xFF2B2930);
  static const Color darkText = Color(0xFFE6E1E5);

  static const Color error = Color(0xFFB3261E);
  static const Color success = Color(0xFF2E7D32);
  static const Color warning = Color(0xFFF9A825);

  static const ColorScheme lightScheme = ColorScheme.light(
    primary: brandPrimary,
    secondary: brandSecondary,
    tertiary: brandTertiary,
    error: error,
    surface: lightSurface,
    onPrimary: Colors.white,
    onSecondary: Colors.white,
    onSurface: lightText,
  );

  static const ColorScheme darkScheme = ColorScheme.dark(
    primary: brandPrimary,
    secondary: brandSecondary,
    tertiary: brandTertiary,
    error: error,
    surface: darkSurface,
    onPrimary: Colors.white,
    onSecondary: Colors.white,
    onSurface: darkText,
  );
}
