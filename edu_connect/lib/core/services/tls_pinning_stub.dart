import 'package:dio/dio.dart';

/// Web builds rely on browser TLS validation; custom socket pinning is a no-op.
void configureTlsPinning(Dio dio) {}
