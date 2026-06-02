// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'school_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$SchoolModelImpl _$$SchoolModelImplFromJson(Map<String, dynamic> json) =>
    _$SchoolModelImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      student_id_prefix: json['student_id_prefix'] as String,
      prefix_locked: json['prefix_locked'] as bool,
      is_active: json['is_active'] as bool,
      created_at: DateTime.parse(json['created_at'] as String),
      subscription_expires_at: json['subscription_expires_at'] == null
          ? null
          : DateTime.parse(json['subscription_expires_at'] as String),
    );

Map<String, dynamic> _$$SchoolModelImplToJson(_$SchoolModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'student_id_prefix': instance.student_id_prefix,
      'prefix_locked': instance.prefix_locked,
      'is_active': instance.is_active,
      'created_at': instance.created_at.toIso8601String(),
      'subscription_expires_at':
          instance.subscription_expires_at?.toIso8601String(),
    };
