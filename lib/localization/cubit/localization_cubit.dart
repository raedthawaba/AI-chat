import 'package:equatable/equatable.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/services/local_storage_service.dart';

part 'localization_state.dart';

/// Supported application locales.
enum AppLocale {
  english(Locale('en'), 'English'),
  arabic(Locale('ar'), 'العربية');

  const AppLocale(this.locale, this.label);
  final Locale locale;
  final String label;
}

/// Cubit responsible for the current app locale.
///
/// Replaces the legacy [LocalizationProvider]. Persists the user's choice
/// via [LocalStorageService]. The host [MaterialApp] observes this cubit
/// and rebuilds whenever the locale changes.
class LocalizationCubit extends Cubit<LocalizationState> {
  LocalizationCubit({required LocalStorageService storage})
      : _storage = storage,
        super(const LocalizationState.initial());

  static const _storageKey = 'app_locale_code';
  final LocalStorageService _storage;

  /// Loads the persisted locale (defaults to English).
  Future<void> load() async {
    final code = _storage.read<String>(_storageKey);
    final locale = code == null
        ? AppLocale.english
        : AppLocale.values.firstWhere(
            (l) => l.locale.languageCode == code,
            orElse: () => AppLocale.english,
          );
    emit(state.copyWith(locale: locale));
  }

  /// Switches the active locale and persists the choice.
  Future<void> setLocale(AppLocale locale) async {
    if (state.locale == locale) return;
    emit(state.copyWith(locale: locale));
    await _storage.write(_storageKey, locale.locale.languageCode);
  }
}
