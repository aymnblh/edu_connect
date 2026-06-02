// ignore_for_file: non_constant_identifier_names
import 'package:freezed_annotation/freezed_annotation.dart';

part 'school_model.freezed.dart';
part 'school_model.g.dart';

@freezed
class SchoolModel with _$SchoolModel {
  const factory SchoolModel({
    required String id,
    required String name,
    required String student_id_prefix,
    required bool prefix_locked,
    required bool is_active,
    required DateTime created_at,
    DateTime? subscription_expires_at,
  }) = _SchoolModel;

  factory SchoolModel.fromJson(Map<String, dynamic> json) =>
      _$SchoolModelFromJson(json);
}
