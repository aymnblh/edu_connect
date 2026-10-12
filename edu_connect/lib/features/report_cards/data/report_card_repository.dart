import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/api_service.dart';

class ReportCardSubject {
  final String subject;
  final double coefficient;
  final double? average;
  final double? classAverage;

  const ReportCardSubject({
    required this.subject,
    required this.coefficient,
    this.average,
    this.classAverage,
  });

  factory ReportCardSubject.fromJson(Map<String, dynamic> json) =>
      ReportCardSubject(
        subject: json['subject'] as String? ?? '',
        coefficient: (json['coefficient'] as num? ?? 1).toDouble(),
        average: (json['average'] as num?)?.toDouble(),
        classAverage: (json['class_average'] as num?)?.toDouble(),
      );
}

class ReportCardSummary {
  final String id;
  final String? semesterName;
  final String? className;
  final double? overallAverage;
  final int? rank;
  final int classSize;
  final DateTime publishedAt;

  const ReportCardSummary({
    required this.id,
    this.semesterName,
    this.className,
    this.overallAverage,
    this.rank,
    required this.classSize,
    required this.publishedAt,
  });

  factory ReportCardSummary.fromJson(Map<String, dynamic> json) =>
      ReportCardSummary(
        id: json['id'] as String,
        semesterName: json['semester_name'] as String?,
        className: json['class_name'] as String?,
        overallAverage: (json['overall_average'] as num?)?.toDouble(),
        rank: json['rank'] as int?,
        classSize: json['class_size'] as int? ?? 0,
        publishedAt: DateTime.parse(json['published_at'] as String),
      );
}

/// The snapshot published by the school (see backend reports.compute).
class ReportCardDetail {
  final ReportCardSummary summary;
  final String? schoolName;
  final String studentName;
  final String? studentNumber;
  final String? periodStart;
  final String? periodEnd;
  final List<ReportCardSubject> subjects;
  final double? classAverage;
  final int absences;
  final int justifiedAbsences;
  final int lates;

  const ReportCardDetail({
    required this.summary,
    this.schoolName,
    required this.studentName,
    this.studentNumber,
    this.periodStart,
    this.periodEnd,
    required this.subjects,
    this.classAverage,
    required this.absences,
    required this.justifiedAbsences,
    required this.lates,
  });

  factory ReportCardDetail.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? const {};
    final attendance = data['attendance'] as Map<String, dynamic>? ?? const {};
    return ReportCardDetail(
      summary: ReportCardSummary.fromJson(json),
      schoolName: data['school_name'] as String?,
      studentName: data['student_name'] as String? ?? '',
      studentNumber: data['student_number'] as String?,
      periodStart: data['period_start'] as String?,
      periodEnd: data['period_end'] as String?,
      subjects: (data['subjects'] as List<dynamic>? ?? const [])
          .map((e) => ReportCardSubject.fromJson(e as Map<String, dynamic>))
          .toList(),
      classAverage: (data['class_average'] as num?)?.toDouble(),
      absences: attendance['absences'] as int? ?? 0,
      justifiedAbsences: attendance['justified_absences'] as int? ?? 0,
      lates: attendance['lates'] as int? ?? 0,
    );
  }
}

class ReportCardRepository {
  final ApiService _api = ApiService.instance;

  Future<List<ReportCardSummary>> listForStudent(String studentId) async {
    final data =
        await _api.get('/report-cards/', query: {'student_id': studentId})
            as List<dynamic>;
    return data
        .map((e) => ReportCardSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ReportCardDetail> get(String id) async {
    final data = await _api.get('/report-cards/$id') as Map<String, dynamic>;
    return ReportCardDetail.fromJson(data);
  }
}

final reportCardRepositoryProvider =
    Provider<ReportCardRepository>((ref) => ReportCardRepository());

final studentReportCardsProvider = FutureProvider.autoDispose
    .family<List<ReportCardSummary>, String>((ref, studentId) {
  return ref.watch(reportCardRepositoryProvider).listForStudent(studentId);
});

final reportCardDetailProvider =
    FutureProvider.autoDispose.family<ReportCardDetail, String>((ref, id) {
  return ref.watch(reportCardRepositoryProvider).get(id);
});
