import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/di/injection.dart';
import 'core/services/local_storage_service.dart';
import 'core/theme/theme_cubit.dart';
import 'localization/cubit/localization_cubit.dart';

class HajeenApp extends StatelessWidget {
  const HajeenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<ThemeCubit>(
          create: (_) => ThemeCubit(storage: sl<LocalStorageService>())..load(),
        ),
        BlocProvider<LocalizationCubit>(
          create: (_) =>
              LocalizationCubit(storage: sl<LocalStorageService>())..load(),
        ),
      ],
      child: BlocBuilder<ThemeCubit, ThemeState>(
        builder: (context, themeState) {
          return BlocBuilder<LocalizationCubit, LocalizationState>(
            builder: (context, localeState) {
              return MaterialApp(
                title: 'Hajeen AI',
                debugShowCheckedModeBanner: false,
                theme: themeState.themeData,
                themeMode: themeState.mode,
                locale: localeState.flutterLocale,
                supportedLocales: AppLocale.values.map((l) => l.locale).toList(),
                localizationsDelegates: const [
                  GlobalMaterialLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                ],
                home: const _BootstrapHome(),
              );
            },
          );
        },
      ),
    );
  }
}

class _BootstrapHome extends StatelessWidget {
  const _BootstrapHome();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text(
          'Hajeen AI',
          style: TextStyle(fontSize: 32, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
