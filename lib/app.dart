import 'package:flutter/material.dart';

class HajeenApp extends StatelessWidget {
  const HajeenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: Center(
          child: Text('Hajeen AI Platform'),
        ),
      ),
    );
  }
}
