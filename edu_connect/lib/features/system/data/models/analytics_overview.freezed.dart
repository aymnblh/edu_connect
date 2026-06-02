// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'analytics_overview.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ClassPerformance _$ClassPerformanceFromJson(Map<String, dynamic> json) {
  return _ClassPerformance.fromJson(json);
}

/// @nodoc
mixin _$ClassPerformance {
  String get class_name => throw _privateConstructorUsedError;
  double get average_score => throw _privateConstructorUsedError;

  /// Serializes this ClassPerformance to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ClassPerformance
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ClassPerformanceCopyWith<ClassPerformance> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ClassPerformanceCopyWith<$Res> {
  factory $ClassPerformanceCopyWith(
          ClassPerformance value, $Res Function(ClassPerformance) then) =
      _$ClassPerformanceCopyWithImpl<$Res, ClassPerformance>;
  @useResult
  $Res call({String class_name, double average_score});
}

/// @nodoc
class _$ClassPerformanceCopyWithImpl<$Res, $Val extends ClassPerformance>
    implements $ClassPerformanceCopyWith<$Res> {
  _$ClassPerformanceCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ClassPerformance
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? class_name = null,
    Object? average_score = null,
  }) {
    return _then(_value.copyWith(
      class_name: null == class_name
          ? _value.class_name
          : class_name // ignore: cast_nullable_to_non_nullable
              as String,
      average_score: null == average_score
          ? _value.average_score
          : average_score // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ClassPerformanceImplCopyWith<$Res>
    implements $ClassPerformanceCopyWith<$Res> {
  factory _$$ClassPerformanceImplCopyWith(_$ClassPerformanceImpl value,
          $Res Function(_$ClassPerformanceImpl) then) =
      __$$ClassPerformanceImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String class_name, double average_score});
}

/// @nodoc
class __$$ClassPerformanceImplCopyWithImpl<$Res>
    extends _$ClassPerformanceCopyWithImpl<$Res, _$ClassPerformanceImpl>
    implements _$$ClassPerformanceImplCopyWith<$Res> {
  __$$ClassPerformanceImplCopyWithImpl(_$ClassPerformanceImpl _value,
      $Res Function(_$ClassPerformanceImpl) _then)
      : super(_value, _then);

  /// Create a copy of ClassPerformance
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? class_name = null,
    Object? average_score = null,
  }) {
    return _then(_$ClassPerformanceImpl(
      class_name: null == class_name
          ? _value.class_name
          : class_name // ignore: cast_nullable_to_non_nullable
              as String,
      average_score: null == average_score
          ? _value.average_score
          : average_score // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ClassPerformanceImpl implements _ClassPerformance {
  const _$ClassPerformanceImpl(
      {required this.class_name, required this.average_score});

  factory _$ClassPerformanceImpl.fromJson(Map<String, dynamic> json) =>
      _$$ClassPerformanceImplFromJson(json);

  @override
  final String class_name;
  @override
  final double average_score;

  @override
  String toString() {
    return 'ClassPerformance(class_name: $class_name, average_score: $average_score)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ClassPerformanceImpl &&
            (identical(other.class_name, class_name) ||
                other.class_name == class_name) &&
            (identical(other.average_score, average_score) ||
                other.average_score == average_score));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, class_name, average_score);

  /// Create a copy of ClassPerformance
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ClassPerformanceImplCopyWith<_$ClassPerformanceImpl> get copyWith =>
      __$$ClassPerformanceImplCopyWithImpl<_$ClassPerformanceImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ClassPerformanceImplToJson(
      this,
    );
  }
}

abstract class _ClassPerformance implements ClassPerformance {
  const factory _ClassPerformance(
      {required final String class_name,
      required final double average_score}) = _$ClassPerformanceImpl;

  factory _ClassPerformance.fromJson(Map<String, dynamic> json) =
      _$ClassPerformanceImpl.fromJson;

  @override
  String get class_name;
  @override
  double get average_score;

  /// Create a copy of ClassPerformance
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ClassPerformanceImplCopyWith<_$ClassPerformanceImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SubjectPerformance _$SubjectPerformanceFromJson(Map<String, dynamic> json) {
  return _SubjectPerformance.fromJson(json);
}

/// @nodoc
mixin _$SubjectPerformance {
  String get subject => throw _privateConstructorUsedError;
  double get average_score => throw _privateConstructorUsedError;

  /// Serializes this SubjectPerformance to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SubjectPerformance
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SubjectPerformanceCopyWith<SubjectPerformance> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SubjectPerformanceCopyWith<$Res> {
  factory $SubjectPerformanceCopyWith(
          SubjectPerformance value, $Res Function(SubjectPerformance) then) =
      _$SubjectPerformanceCopyWithImpl<$Res, SubjectPerformance>;
  @useResult
  $Res call({String subject, double average_score});
}

/// @nodoc
class _$SubjectPerformanceCopyWithImpl<$Res, $Val extends SubjectPerformance>
    implements $SubjectPerformanceCopyWith<$Res> {
  _$SubjectPerformanceCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SubjectPerformance
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? average_score = null,
  }) {
    return _then(_value.copyWith(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      average_score: null == average_score
          ? _value.average_score
          : average_score // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SubjectPerformanceImplCopyWith<$Res>
    implements $SubjectPerformanceCopyWith<$Res> {
  factory _$$SubjectPerformanceImplCopyWith(_$SubjectPerformanceImpl value,
          $Res Function(_$SubjectPerformanceImpl) then) =
      __$$SubjectPerformanceImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String subject, double average_score});
}

/// @nodoc
class __$$SubjectPerformanceImplCopyWithImpl<$Res>
    extends _$SubjectPerformanceCopyWithImpl<$Res, _$SubjectPerformanceImpl>
    implements _$$SubjectPerformanceImplCopyWith<$Res> {
  __$$SubjectPerformanceImplCopyWithImpl(_$SubjectPerformanceImpl _value,
      $Res Function(_$SubjectPerformanceImpl) _then)
      : super(_value, _then);

  /// Create a copy of SubjectPerformance
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? average_score = null,
  }) {
    return _then(_$SubjectPerformanceImpl(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      average_score: null == average_score
          ? _value.average_score
          : average_score // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SubjectPerformanceImpl implements _SubjectPerformance {
  const _$SubjectPerformanceImpl(
      {required this.subject, required this.average_score});

  factory _$SubjectPerformanceImpl.fromJson(Map<String, dynamic> json) =>
      _$$SubjectPerformanceImplFromJson(json);

  @override
  final String subject;
  @override
  final double average_score;

  @override
  String toString() {
    return 'SubjectPerformance(subject: $subject, average_score: $average_score)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SubjectPerformanceImpl &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.average_score, average_score) ||
                other.average_score == average_score));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, subject, average_score);

  /// Create a copy of SubjectPerformance
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SubjectPerformanceImplCopyWith<_$SubjectPerformanceImpl> get copyWith =>
      __$$SubjectPerformanceImplCopyWithImpl<_$SubjectPerformanceImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SubjectPerformanceImplToJson(
      this,
    );
  }
}

abstract class _SubjectPerformance implements SubjectPerformance {
  const factory _SubjectPerformance(
      {required final String subject,
      required final double average_score}) = _$SubjectPerformanceImpl;

  factory _SubjectPerformance.fromJson(Map<String, dynamic> json) =
      _$SubjectPerformanceImpl.fromJson;

  @override
  String get subject;
  @override
  double get average_score;

  /// Create a copy of SubjectPerformance
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SubjectPerformanceImplCopyWith<_$SubjectPerformanceImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

StudentRanking _$StudentRankingFromJson(Map<String, dynamic> json) {
  return _StudentRanking.fromJson(json);
}

/// @nodoc
mixin _$StudentRanking {
  String get student_id => throw _privateConstructorUsedError;
  String get student_name => throw _privateConstructorUsedError;
  String get class_name => throw _privateConstructorUsedError;
  double get average_score => throw _privateConstructorUsedError;

  /// Serializes this StudentRanking to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of StudentRanking
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $StudentRankingCopyWith<StudentRanking> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $StudentRankingCopyWith<$Res> {
  factory $StudentRankingCopyWith(
          StudentRanking value, $Res Function(StudentRanking) then) =
      _$StudentRankingCopyWithImpl<$Res, StudentRanking>;
  @useResult
  $Res call(
      {String student_id,
      String student_name,
      String class_name,
      double average_score});
}

/// @nodoc
class _$StudentRankingCopyWithImpl<$Res, $Val extends StudentRanking>
    implements $StudentRankingCopyWith<$Res> {
  _$StudentRankingCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of StudentRanking
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? student_id = null,
    Object? student_name = null,
    Object? class_name = null,
    Object? average_score = null,
  }) {
    return _then(_value.copyWith(
      student_id: null == student_id
          ? _value.student_id
          : student_id // ignore: cast_nullable_to_non_nullable
              as String,
      student_name: null == student_name
          ? _value.student_name
          : student_name // ignore: cast_nullable_to_non_nullable
              as String,
      class_name: null == class_name
          ? _value.class_name
          : class_name // ignore: cast_nullable_to_non_nullable
              as String,
      average_score: null == average_score
          ? _value.average_score
          : average_score // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$StudentRankingImplCopyWith<$Res>
    implements $StudentRankingCopyWith<$Res> {
  factory _$$StudentRankingImplCopyWith(_$StudentRankingImpl value,
          $Res Function(_$StudentRankingImpl) then) =
      __$$StudentRankingImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String student_id,
      String student_name,
      String class_name,
      double average_score});
}

/// @nodoc
class __$$StudentRankingImplCopyWithImpl<$Res>
    extends _$StudentRankingCopyWithImpl<$Res, _$StudentRankingImpl>
    implements _$$StudentRankingImplCopyWith<$Res> {
  __$$StudentRankingImplCopyWithImpl(
      _$StudentRankingImpl _value, $Res Function(_$StudentRankingImpl) _then)
      : super(_value, _then);

  /// Create a copy of StudentRanking
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? student_id = null,
    Object? student_name = null,
    Object? class_name = null,
    Object? average_score = null,
  }) {
    return _then(_$StudentRankingImpl(
      student_id: null == student_id
          ? _value.student_id
          : student_id // ignore: cast_nullable_to_non_nullable
              as String,
      student_name: null == student_name
          ? _value.student_name
          : student_name // ignore: cast_nullable_to_non_nullable
              as String,
      class_name: null == class_name
          ? _value.class_name
          : class_name // ignore: cast_nullable_to_non_nullable
              as String,
      average_score: null == average_score
          ? _value.average_score
          : average_score // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$StudentRankingImpl implements _StudentRanking {
  const _$StudentRankingImpl(
      {required this.student_id,
      required this.student_name,
      required this.class_name,
      required this.average_score});

  factory _$StudentRankingImpl.fromJson(Map<String, dynamic> json) =>
      _$$StudentRankingImplFromJson(json);

  @override
  final String student_id;
  @override
  final String student_name;
  @override
  final String class_name;
  @override
  final double average_score;

  @override
  String toString() {
    return 'StudentRanking(student_id: $student_id, student_name: $student_name, class_name: $class_name, average_score: $average_score)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$StudentRankingImpl &&
            (identical(other.student_id, student_id) ||
                other.student_id == student_id) &&
            (identical(other.student_name, student_name) ||
                other.student_name == student_name) &&
            (identical(other.class_name, class_name) ||
                other.class_name == class_name) &&
            (identical(other.average_score, average_score) ||
                other.average_score == average_score));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, student_id, student_name, class_name, average_score);

  /// Create a copy of StudentRanking
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$StudentRankingImplCopyWith<_$StudentRankingImpl> get copyWith =>
      __$$StudentRankingImplCopyWithImpl<_$StudentRankingImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$StudentRankingImplToJson(
      this,
    );
  }
}

abstract class _StudentRanking implements StudentRanking {
  const factory _StudentRanking(
      {required final String student_id,
      required final String student_name,
      required final String class_name,
      required final double average_score}) = _$StudentRankingImpl;

  factory _StudentRanking.fromJson(Map<String, dynamic> json) =
      _$StudentRankingImpl.fromJson;

  @override
  String get student_id;
  @override
  String get student_name;
  @override
  String get class_name;
  @override
  double get average_score;

  /// Create a copy of StudentRanking
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$StudentRankingImplCopyWith<_$StudentRankingImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AnalyticsOverview _$AnalyticsOverviewFromJson(Map<String, dynamic> json) {
  return _AnalyticsOverview.fromJson(json);
}

/// @nodoc
mixin _$AnalyticsOverview {
  double get school_avg => throw _privateConstructorUsedError;
  List<ClassPerformance> get class_performance =>
      throw _privateConstructorUsedError;
  double get adoption_rate => throw _privateConstructorUsedError;
  List<SubjectPerformance> get subject_performance =>
      throw _privateConstructorUsedError;
  List<StudentRanking> get top_students => throw _privateConstructorUsedError;
  List<StudentRanking> get struggling_students =>
      throw _privateConstructorUsedError;
  double get absence_rate => throw _privateConstructorUsedError;

  /// Serializes this AnalyticsOverview to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AnalyticsOverview
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AnalyticsOverviewCopyWith<AnalyticsOverview> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AnalyticsOverviewCopyWith<$Res> {
  factory $AnalyticsOverviewCopyWith(
          AnalyticsOverview value, $Res Function(AnalyticsOverview) then) =
      _$AnalyticsOverviewCopyWithImpl<$Res, AnalyticsOverview>;
  @useResult
  $Res call(
      {double school_avg,
      List<ClassPerformance> class_performance,
      double adoption_rate,
      List<SubjectPerformance> subject_performance,
      List<StudentRanking> top_students,
      List<StudentRanking> struggling_students,
      double absence_rate});
}

/// @nodoc
class _$AnalyticsOverviewCopyWithImpl<$Res, $Val extends AnalyticsOverview>
    implements $AnalyticsOverviewCopyWith<$Res> {
  _$AnalyticsOverviewCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AnalyticsOverview
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? school_avg = null,
    Object? class_performance = null,
    Object? adoption_rate = null,
    Object? subject_performance = null,
    Object? top_students = null,
    Object? struggling_students = null,
    Object? absence_rate = null,
  }) {
    return _then(_value.copyWith(
      school_avg: null == school_avg
          ? _value.school_avg
          : school_avg // ignore: cast_nullable_to_non_nullable
              as double,
      class_performance: null == class_performance
          ? _value.class_performance
          : class_performance // ignore: cast_nullable_to_non_nullable
              as List<ClassPerformance>,
      adoption_rate: null == adoption_rate
          ? _value.adoption_rate
          : adoption_rate // ignore: cast_nullable_to_non_nullable
              as double,
      subject_performance: null == subject_performance
          ? _value.subject_performance
          : subject_performance // ignore: cast_nullable_to_non_nullable
              as List<SubjectPerformance>,
      top_students: null == top_students
          ? _value.top_students
          : top_students // ignore: cast_nullable_to_non_nullable
              as List<StudentRanking>,
      struggling_students: null == struggling_students
          ? _value.struggling_students
          : struggling_students // ignore: cast_nullable_to_non_nullable
              as List<StudentRanking>,
      absence_rate: null == absence_rate
          ? _value.absence_rate
          : absence_rate // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AnalyticsOverviewImplCopyWith<$Res>
    implements $AnalyticsOverviewCopyWith<$Res> {
  factory _$$AnalyticsOverviewImplCopyWith(_$AnalyticsOverviewImpl value,
          $Res Function(_$AnalyticsOverviewImpl) then) =
      __$$AnalyticsOverviewImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {double school_avg,
      List<ClassPerformance> class_performance,
      double adoption_rate,
      List<SubjectPerformance> subject_performance,
      List<StudentRanking> top_students,
      List<StudentRanking> struggling_students,
      double absence_rate});
}

/// @nodoc
class __$$AnalyticsOverviewImplCopyWithImpl<$Res>
    extends _$AnalyticsOverviewCopyWithImpl<$Res, _$AnalyticsOverviewImpl>
    implements _$$AnalyticsOverviewImplCopyWith<$Res> {
  __$$AnalyticsOverviewImplCopyWithImpl(_$AnalyticsOverviewImpl _value,
      $Res Function(_$AnalyticsOverviewImpl) _then)
      : super(_value, _then);

  /// Create a copy of AnalyticsOverview
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? school_avg = null,
    Object? class_performance = null,
    Object? adoption_rate = null,
    Object? subject_performance = null,
    Object? top_students = null,
    Object? struggling_students = null,
    Object? absence_rate = null,
  }) {
    return _then(_$AnalyticsOverviewImpl(
      school_avg: null == school_avg
          ? _value.school_avg
          : school_avg // ignore: cast_nullable_to_non_nullable
              as double,
      class_performance: null == class_performance
          ? _value._class_performance
          : class_performance // ignore: cast_nullable_to_non_nullable
              as List<ClassPerformance>,
      adoption_rate: null == adoption_rate
          ? _value.adoption_rate
          : adoption_rate // ignore: cast_nullable_to_non_nullable
              as double,
      subject_performance: null == subject_performance
          ? _value._subject_performance
          : subject_performance // ignore: cast_nullable_to_non_nullable
              as List<SubjectPerformance>,
      top_students: null == top_students
          ? _value._top_students
          : top_students // ignore: cast_nullable_to_non_nullable
              as List<StudentRanking>,
      struggling_students: null == struggling_students
          ? _value._struggling_students
          : struggling_students // ignore: cast_nullable_to_non_nullable
              as List<StudentRanking>,
      absence_rate: null == absence_rate
          ? _value.absence_rate
          : absence_rate // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AnalyticsOverviewImpl implements _AnalyticsOverview {
  const _$AnalyticsOverviewImpl(
      {this.school_avg = 0.0,
      final List<ClassPerformance> class_performance = const [],
      this.adoption_rate = 0.0,
      final List<SubjectPerformance> subject_performance = const [],
      final List<StudentRanking> top_students = const [],
      final List<StudentRanking> struggling_students = const [],
      this.absence_rate = 0.0})
      : _class_performance = class_performance,
        _subject_performance = subject_performance,
        _top_students = top_students,
        _struggling_students = struggling_students;

  factory _$AnalyticsOverviewImpl.fromJson(Map<String, dynamic> json) =>
      _$$AnalyticsOverviewImplFromJson(json);

  @override
  @JsonKey()
  final double school_avg;
  final List<ClassPerformance> _class_performance;
  @override
  @JsonKey()
  List<ClassPerformance> get class_performance {
    if (_class_performance is EqualUnmodifiableListView)
      return _class_performance;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_class_performance);
  }

  @override
  @JsonKey()
  final double adoption_rate;
  final List<SubjectPerformance> _subject_performance;
  @override
  @JsonKey()
  List<SubjectPerformance> get subject_performance {
    if (_subject_performance is EqualUnmodifiableListView)
      return _subject_performance;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_subject_performance);
  }

  final List<StudentRanking> _top_students;
  @override
  @JsonKey()
  List<StudentRanking> get top_students {
    if (_top_students is EqualUnmodifiableListView) return _top_students;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_top_students);
  }

  final List<StudentRanking> _struggling_students;
  @override
  @JsonKey()
  List<StudentRanking> get struggling_students {
    if (_struggling_students is EqualUnmodifiableListView)
      return _struggling_students;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_struggling_students);
  }

  @override
  @JsonKey()
  final double absence_rate;

  @override
  String toString() {
    return 'AnalyticsOverview(school_avg: $school_avg, class_performance: $class_performance, adoption_rate: $adoption_rate, subject_performance: $subject_performance, top_students: $top_students, struggling_students: $struggling_students, absence_rate: $absence_rate)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AnalyticsOverviewImpl &&
            (identical(other.school_avg, school_avg) ||
                other.school_avg == school_avg) &&
            const DeepCollectionEquality()
                .equals(other._class_performance, _class_performance) &&
            (identical(other.adoption_rate, adoption_rate) ||
                other.adoption_rate == adoption_rate) &&
            const DeepCollectionEquality()
                .equals(other._subject_performance, _subject_performance) &&
            const DeepCollectionEquality()
                .equals(other._top_students, _top_students) &&
            const DeepCollectionEquality()
                .equals(other._struggling_students, _struggling_students) &&
            (identical(other.absence_rate, absence_rate) ||
                other.absence_rate == absence_rate));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      school_avg,
      const DeepCollectionEquality().hash(_class_performance),
      adoption_rate,
      const DeepCollectionEquality().hash(_subject_performance),
      const DeepCollectionEquality().hash(_top_students),
      const DeepCollectionEquality().hash(_struggling_students),
      absence_rate);

  /// Create a copy of AnalyticsOverview
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AnalyticsOverviewImplCopyWith<_$AnalyticsOverviewImpl> get copyWith =>
      __$$AnalyticsOverviewImplCopyWithImpl<_$AnalyticsOverviewImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AnalyticsOverviewImplToJson(
      this,
    );
  }
}

abstract class _AnalyticsOverview implements AnalyticsOverview {
  const factory _AnalyticsOverview(
      {final double school_avg,
      final List<ClassPerformance> class_performance,
      final double adoption_rate,
      final List<SubjectPerformance> subject_performance,
      final List<StudentRanking> top_students,
      final List<StudentRanking> struggling_students,
      final double absence_rate}) = _$AnalyticsOverviewImpl;

  factory _AnalyticsOverview.fromJson(Map<String, dynamic> json) =
      _$AnalyticsOverviewImpl.fromJson;

  @override
  double get school_avg;
  @override
  List<ClassPerformance> get class_performance;
  @override
  double get adoption_rate;
  @override
  List<SubjectPerformance> get subject_performance;
  @override
  List<StudentRanking> get top_students;
  @override
  List<StudentRanking> get struggling_students;
  @override
  double get absence_rate;

  /// Create a copy of AnalyticsOverview
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AnalyticsOverviewImplCopyWith<_$AnalyticsOverviewImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
