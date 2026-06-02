import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/api_service.dart';

class StudentImportResult {
  final int imported;
  final int skipped;

  const StudentImportResult({required this.imported, required this.skipped});

  factory StudentImportResult.fromJson(Map<String, dynamic> json) {
    return StudentImportResult(
      imported: (json['imported'] as num?)?.toInt() ?? 0,
      skipped: (json['skipped'] as num?)?.toInt() ?? 0,
    );
  }
}

class CourseModel {
  final String id;
  final String name;
  final String schoolId;
  final double coefficient;

  CourseModel({
    required this.id,
    required this.name,
    required this.schoolId,
    this.coefficient = 1.0,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    return CourseModel(
      id: json['id'] as String,
      name: json['name'] as String,
      schoolId: json['school_id'] as String,
      coefficient: (json['coefficient'] as num? ?? 1).toDouble(),
    );
  }
}

class TeacherModel {
  final String id;
  final String fullName;
  final String email;

  TeacherModel({required this.id, required this.fullName, required this.email});

  factory TeacherModel.fromJson(Map<String, dynamic> json) {
    return TeacherModel(
      id: json['id'] as String,
      fullName: json['full_name'] as String,
      email: json['email'] as String,
    );
  }
}

class ClassCourseModel {
  final String classId;
  final String courseId;
  final String teacherId;
  final double coefficient;
  final String? courseName;
  final String? teacherName;

  ClassCourseModel({
    required this.classId,
    required this.courseId,
    required this.teacherId,
    this.coefficient = 1.0,
    this.courseName,
    this.teacherName,
  });

  factory ClassCourseModel.fromJson(Map<String, dynamic> json) {
    return ClassCourseModel(
      classId: json['class_id'] as String,
      courseId: json['course_id'] as String,
      teacherId: json['teacher_id'] as String,
      coefficient: (json['coefficient'] as num? ?? 1).toDouble(),
      courseName: json['course_name'] as String?,
      teacherName: json['teacher_name'] as String?,
    );
  }
}

class ClassPerformanceModel {
  final String className;
  final double averageScore;

  ClassPerformanceModel({required this.className, required this.averageScore});

  factory ClassPerformanceModel.fromJson(Map<String, dynamic> json) {
    return ClassPerformanceModel(
      className: json['class_name'] as String,
      averageScore: (json['average_score'] as num).toDouble(),
    );
  }
}

class AnalyticsOverviewModel {
  final double schoolAvg;
  final List<ClassPerformanceModel> classPerformance;
  final double adoptionRate;

  AnalyticsOverviewModel({
    required this.schoolAvg,
    required this.classPerformance,
    required this.adoptionRate,
  });

  factory AnalyticsOverviewModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsOverviewModel(
      schoolAvg: (json['school_avg'] as num).toDouble(),
      classPerformance: (json['class_performance'] as List)
          .map((e) => ClassPerformanceModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      adoptionRate: (json['adoption_rate'] as num).toDouble(),
    );
  }
}

class AdminRepository {
  final ApiService _api = ApiService.instance;

  Future<List<CourseModel>> getCourses() async {
    final data = await _api.get('/admin/courses') as List<dynamic>;
    return data
        .map((e) => CourseModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CourseModel> createCourse({required String name}) async {
    final data = await _api.post('/admin/courses', data: {
      'name': name,
    }) as Map<String, dynamic>;
    return CourseModel.fromJson(data);
  }

  Future<AnalyticsOverviewModel> getAnalyticsOverview() async {
    final data =
        await _api.get('/admin/analytics/overview') as Map<String, dynamic>;
    return AnalyticsOverviewModel.fromJson(data);
  }

  Future<void> createTeacher(
      {required String email, required String fullName}) async {
    await _api.post('/admin/create-teacher', data: {
      'email': email,
      'full_name': fullName,
    });
  }

  Future<StudentImportResult> importStudents(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        filename: _fileNameFromPath(filePath),
      ),
    });
    final response = await _api.dio.post(
      '/admin/import/students',
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return StudentImportResult.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  // ── Class management ────────────────────────────────────────────────────────

  Future<List<TeacherModel>> getSchoolTeachers() async {
    final data = await _api.get('/classes/teachers/all') as List<dynamic>;
    return data
        .map((e) => TeacherModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ClassCourseModel>> getClassCourses(String classId) async {
    final data = await _api.get('/classes/$classId/courses') as List<dynamic>;
    return data
        .map((e) => ClassCourseModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ClassCourseModel> assignCourseToClass({
    required String classId,
    required String courseId,
    required String teacherId,
    required double coefficient,
  }) async {
    final data = await _api.post('/classes/$classId/courses', data: {
      'course_id': courseId,
      'teacher_id': teacherId,
      'coefficient': coefficient,
    }) as Map<String, dynamic>;
    return ClassCourseModel.fromJson(data);
  }

  Future<void> removeCourseFromClass({
    required String classId,
    required String courseId,
  }) async {
    await _api.delete('/classes/$classId/courses/$courseId');
  }

  Future<void> enrollStudents({
    required String classId,
    required List<String> studentIds,
  }) async {
    await _api.put('/classes/$classId/students', data: {
      'student_ids': studentIds,
    });
  }
}

String _fileNameFromPath(String path) {
  final normalized = path.replaceAll(r'\', '/');
  return normalized.split('/').last;
}

final adminRepositoryProvider =
    Provider<AdminRepository>((ref) => AdminRepository());

final schoolCoursesProvider = FutureProvider<List<CourseModel>>((ref) async {
  return ref.watch(adminRepositoryProvider).getCourses();
});

final schoolAnalyticsProvider =
    FutureProvider<AnalyticsOverviewModel>((ref) async {
  return ref.watch(adminRepositoryProvider).getAnalyticsOverview();
});

final schoolTeachersProvider = FutureProvider<List<TeacherModel>>((ref) async {
  return ref.watch(adminRepositoryProvider).getSchoolTeachers();
});

final classCoursesProvider =
    FutureProvider.family<List<ClassCourseModel>, String>((ref, classId) async {
  return ref.watch(adminRepositoryProvider).getClassCourses(classId);
});
