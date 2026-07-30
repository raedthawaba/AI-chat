part of 'localization_cubit.dart';

/// Immutable state object held by [LocalizationCubit].
class LocalizationState extends Equatable {
  const LocalizationState({required this.locale});

  const LocalizationState.initial() : locale = AppLocale.english;

  final AppLocale locale;

  /// The [Locale] consumed by Flutter's localization machinery.
  Locale get flutterLocale => locale.locale;

  LocalizationState copyWith({AppLocale? locale}) {
    return LocalizationState(locale: locale ?? this.locale);
  }

  @override
  List<Object?> get props => [locale];
}
