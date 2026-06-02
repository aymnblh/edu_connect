// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'analytics_overview.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ClassPerformanceImpl _$$ClassPerformanceImplFromJson(
        Map<String, dynamic> json) =>
    _$ClassPerformanceImpl(
      class_name: json['class_name'] as String,
      average_score: (json['average_score'] as num).toDouble(),
    );

Map<String, dynamic> _$$ClassPerformanceImplToJson(
        _$ClassPerformanceImpl instance) =>
    <String, dynamic>{
      'class_name': instance.class_name,
      'average_score': instance.average_score,
    };

_$SubjectPerformanceImpl _$$SubjectPerformanceImplFromJson(
        Map<String, dynamic> json) =>
    _$SubjectPerformanceImpl(
      subject: json['subject'] as String,
      average_score: (json['average_score'] as num).toDouble(),
    );

Map<String, dynamic> _$$SubjectPerformanceImplToJson(
        _$SubjectPerformanceImpl instance) =>
    <String, dynamic>{
      'subject': instance.subject,
      'average_score': instance.average_score,
    };

_$StudentRankingImpl _$$StudentRankingImplFromJson(Map<String, dynamic> json) =>
    _$StudentRankingImpl(
      student_id: json['student_id'] as String,
      student_name: json['student_name'] as String,
      class_name: json['class_name'] as String,
      average_score: (json['average_score'] as num).toDouble(),
    );

Map<String, dynamic> _$$StudentRankingImplToJson(
        _$StudentRankingImpl instance) =>
    <String, dynamic>{
      'student_id': instance.student_id,
      'student_name': instance.student_name,
      'class_name': instance.class_name,
      'average_score': instance.average_score,
    };

_$AnalyticsOverviewImpl _$$AnalyticsOverviewImplFromJson(
        Map<String, dynamic> json) =>
    _$AnalyticsOverviewImpl(
      school_avg: (json['school_avg'] as num?)?.toDouble() ?? 0.0,
      class_performance: (json['class_performance'] as List<dynamic>?)
              ?.map((e) => ClassPerformance.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      adoption_rate: (json['adoption_rate'] as num?)?.toDouble() ?? 0.0,
      subject_performance: (json['subject_performance'] as List<dynamic>?)
              ?.map(
                  (e) => SubjectPerformance.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      top_students: (json['top_students'] as List<dynamic>?)
              ?.map((e) => StudentRanking.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      struggling_students: (json['struggling_students'] as List<dynamic>?)
              ?.map((e) => StudentRanking.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      absence_rate: (json['absence_rate'] as num?)?.toDouble() ?? 0.0,
    );

Map<String, dynamic> _$$AnalyticsOverviewImplToJson(
        _$AnalyticsOverviewImpl instance) =>
    <String, dynamic>{
      'school_avg': instance.school_avg,
      'class_performance': instance.class_performance,
      'adoption_rate': instance.adoption_rate,
      'subject_performance': instance.subject_performance,
      'top_students': instance.top_students,
      'struggling_students': instance.struggling_students,
      'absence_rate': instance.absence_rate,
    };
