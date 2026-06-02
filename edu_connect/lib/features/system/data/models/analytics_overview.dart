// ignore_for_file: non_constant_identifier_names
import 'package:freezed_annotation/freezed_annotation.dart';

part 'analytics_overview.freezed.dart';
part 'analytics_overview.g.dart';

@freezed
class ClassPerformance with _$ClassPerformance {
  const factory ClassPerformance({
    required String class_name,
    required double average_score,
  }) = _ClassPerformance;

  factory ClassPerformance.fromJson(Map<String, dynamic> json) =>
      _$ClassPerformanceFromJson(json);
}

@freezed
class SubjectPerformance with _$SubjectPerformance {
  const factory SubjectPerformance({
    required String subject,
    required double average_score,
  }) = _SubjectPerformance;

  factory SubjectPerformance.fromJson(Map<String, dynamic> json) =>
      _$SubjectPerformanceFromJson(json);
}

@freezed
class StudentRanking with _$StudentRanking {
  const factory StudentRanking({
    required String student_id,
    required String student_name,
    required String class_name,
    required double average_score,
  }) = _StudentRanking;

  factory StudentRanking.fromJson(Map<String, dynamic> json) =>
      _$StudentRankingFromJson(json);
}

@freezed
class AnalyticsOverview with _$AnalyticsOverview {
  const factory AnalyticsOverview({
    @Default(0.0) double school_avg,
    @Default([]) List<ClassPerformance> class_performance,
    @Default(0.0) double adoption_rate,
    @Default([]) List<SubjectPerformance> subject_performance,
    @Default([]) List<StudentRanking> top_students,
    @Default([]) List<StudentRanking> struggling_students,
    @Default(0.0) double absence_rate,
  }) = _AnalyticsOverview;

  factory AnalyticsOverview.fromJson(Map<String, dynamic> json) =>
      _$AnalyticsOverviewFromJson(json);
}
