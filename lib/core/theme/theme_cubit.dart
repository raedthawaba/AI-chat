import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../services/local_storage_service.dart';
import 'app_theme.dart';

part 'theme_state.dart';

/// Cubit responsible for managing the application's theme mode.
///
/// Replaces the legacy [ThemeProvider] and is the single source of truth
/// for theme state across the app. Persists the user's choice through
/// [LocalStorageService].
class ThemeCubit extends Cubit<ThemeState> {
  ThemeCubit({required LocalStorageService storage})
      : _storage = storage,
        super(const ThemeState.initial());

  static const _storageKey = 'app_theme_mode';
  final LocalStorageService _storage;

  /// Loads the previously persisted theme mode (defaults to system).
  Future<void> load() async {
    final raw = _storage.read<String>(_storageKey);
    final mode = raw != null ? _decodeMode(raw) : ThemeMode.system;
    emit(state.copyWith(mode: mode));
  }

  /// Sets the theme mode and persists it.
  Future<void> setMode(ThemeMode mode) async {
    if (state.mode == mode) return;
    emit(state.copyWith(mode: mode));
    await _storage.write(_storageKey, _encodeMode(mode));
  }

  /// Convenience: toggle between light and dark (system is left untouched).
  Future<void> toggleLightDark() async {
    final next = state.mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await setMode(next);
  }

  ThemeMode _decodeMode(String raw) {
    return ThemeMode.values.firstWhere(
      (m) => m.name == raw,
      orElse: () => ThemeMode.system,
    );
  }

  String _encodeMode(ThemeMode mode) => mode.name;
}
