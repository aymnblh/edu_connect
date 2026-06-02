// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'school_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

SchoolModel _$SchoolModelFromJson(Map<String, dynamic> json) {
  return _SchoolModel.fromJson(json);
}

/// @nodoc
mixin _$SchoolModel {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get student_id_prefix => throw _privateConstructorUsedError;
  bool get prefix_locked => throw _privateConstructorUsedError;
  bool get is_active => throw _privateConstructorUsedError;
  DateTime get created_at => throw _privateConstructorUsedError;
  DateTime? get subscription_expires_at => throw _privateConstructorUsedError;

  /// Serializes this SchoolModel to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SchoolModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SchoolModelCopyWith<SchoolModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SchoolModelCopyWith<$Res> {
  factory $SchoolModelCopyWith(
          SchoolModel value, $Res Function(SchoolModel) then) =
      _$SchoolModelCopyWithImpl<$Res, SchoolModel>;
  @useResult
  $Res call(
      {String id,
      String name,
      String student_id_prefix,
      bool prefix_locked,
      bool is_active,
      DateTime created_at,
      DateTime? subscription_expires_at});
}

/// @nodoc
class _$SchoolModelCopyWithImpl<$Res, $Val extends SchoolModel>
    implements $SchoolModelCopyWith<$Res> {
  _$SchoolModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SchoolModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? student_id_prefix = null,
    Object? prefix_locked = null,
    Object? is_active = null,
    Object? created_at = null,
    Object? subscription_expires_at = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      student_id_prefix: null == student_id_prefix
          ? _value.student_id_prefix
          : student_id_prefix // ignore: cast_nullable_to_non_nullable
              as String,
      prefix_locked: null == prefix_locked
          ? _value.prefix_locked
          : prefix_locked // ignore: cast_nullable_to_non_nullable
              as bool,
      is_active: null == is_active
          ? _value.is_active
          : is_active // ignore: cast_nullable_to_non_nullable
              as bool,
      created_at: null == created_at
          ? _value.created_at
          : created_at // ignore: cast_nullable_to_non_nullable
              as DateTime,
      subscription_expires_at: freezed == subscription_expires_at
          ? _value.subscription_expires_at
          : subscription_expires_at // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SchoolModelImplCopyWith<$Res>
    implements $SchoolModelCopyWith<$Res> {
  factory _$$SchoolModelImplCopyWith(
          _$SchoolModelImpl value, $Res Function(_$SchoolModelImpl) then) =
      __$$SchoolModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String student_id_prefix,
      bool prefix_locked,
      bool is_active,
      DateTime created_at,
      DateTime? subscription_expires_at});
}

/// @nodoc
class __$$SchoolModelImplCopyWithImpl<$Res>
    extends _$SchoolModelCopyWithImpl<$Res, _$SchoolModelImpl>
    implements _$$SchoolModelImplCopyWith<$Res> {
  __$$SchoolModelImplCopyWithImpl(
      _$SchoolModelImpl _value, $Res Function(_$SchoolModelImpl) _then)
      : super(_value, _then);

  /// Create a copy of SchoolModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? student_id_prefix = null,
    Object? prefix_locked = null,
    Object? is_active = null,
    Object? created_at = null,
    Object? subscription_expires_at = freezed,
  }) {
    return _then(_$SchoolModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      student_id_prefix: null == student_id_prefix
          ? _value.student_id_prefix
          : student_id_prefix // ignore: cast_nullable_to_non_nullable
              as String,
      prefix_locked: null == prefix_locked
          ? _value.prefix_locked
          : prefix_locked // ignore: cast_nullable_to_non_nullable
              as bool,
      is_active: null == is_active
          ? _value.is_active
          : is_active // ignore: cast_nullable_to_non_nullable
              as bool,
      created_at: null == created_at
          ? _value.created_at
          : created_at // ignore: cast_nullable_to_non_nullable
              as DateTime,
      subscription_expires_at: freezed == subscription_expires_at
          ? _value.subscription_expires_at
          : subscription_expires_at // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SchoolModelImpl implements _SchoolModel {
  const _$SchoolModelImpl(
      {required this.id,
      required this.name,
      required this.student_id_prefix,
      required this.prefix_locked,
      required this.is_active,
      required this.created_at,
      this.subscription_expires_at});

  factory _$SchoolModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$SchoolModelImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final String student_id_prefix;
  @override
  final bool prefix_locked;
  @override
  final bool is_active;
  @override
  final DateTime created_at;
  @override
  final DateTime? subscription_expires_at;

  @override
  String toString() {
    return 'SchoolModel(id: $id, name: $name, student_id_prefix: $student_id_prefix, prefix_locked: $prefix_locked, is_active: $is_active, created_at: $created_at, subscription_expires_at: $subscription_expires_at)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SchoolModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.student_id_prefix, student_id_prefix) ||
                other.student_id_prefix == student_id_prefix) &&
            (identical(other.prefix_locked, prefix_locked) ||
                other.prefix_locked == prefix_locked) &&
            (identical(other.is_active, is_active) ||
                other.is_active == is_active) &&
            (identical(other.created_at, created_at) ||
                other.created_at == created_at) &&
            (identical(
                    other.subscription_expires_at, subscription_expires_at) ||
                other.subscription_expires_at == subscription_expires_at));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, name, student_id_prefix,
      prefix_locked, is_active, created_at, subscription_expires_at);

  /// Create a copy of SchoolModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SchoolModelImplCopyWith<_$SchoolModelImpl> get copyWith =>
      __$$SchoolModelImplCopyWithImpl<_$SchoolModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SchoolModelImplToJson(
      this,
    );
  }
}

abstract class _SchoolModel implements SchoolModel {
  const factory _SchoolModel(
      {required final String id,
      required final String name,
      required final String student_id_prefix,
      required final bool prefix_locked,
      required final bool is_active,
      required final DateTime created_at,
      final DateTime? subscription_expires_at}) = _$SchoolModelImpl;

  factory _SchoolModel.fromJson(Map<String, dynamic> json) =
      _$SchoolModelImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  String get student_id_prefix;
  @override
  bool get prefix_locked;
  @override
  bool get is_active;
  @override
  DateTime get created_at;
  @override
  DateTime? get subscription_expires_at;

  /// Create a copy of SchoolModel
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SchoolModelImplCopyWith<_$SchoolModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
