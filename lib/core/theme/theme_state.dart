part of 'theme_cubit.dart';

/// Immutable state object held by [ThemeCubit].
class ThemeState extends Equatable {
  const ThemeState({required this.mode});

  const ThemeState.initial() : mode = ThemeMode.system;

  final ThemeMode mode;

  ThemeState copyWith({ThemeMode? mode}) {
    return ThemeState(mode: mode ?? this.mode);
  }

  /// Convenience: derive the [ThemeData] for the current mode.
  ThemeData get themeData => AppTheme.fromMode(mode);

  @override
  List<Object?> get props => [mode];
}
