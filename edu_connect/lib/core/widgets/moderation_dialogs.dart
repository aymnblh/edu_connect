import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class ModerationReportInput {
  final String reason;
  final String? details;

  const ModerationReportInput({required this.reason, this.details});
}

class ModerationText {
  final String languageCode;
  const ModerationText(this.languageCode);

  static ModerationText of(BuildContext context) =>
      ModerationText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get reportContent => _ar
      ? 'الإبلاغ عن محتوى غير لائق'
      : _fr
          ? 'Signaler un contenu inapproprié'
          : 'Report inappropriate content';
  String get reportMessage => _ar
      ? 'الإبلاغ عن هذه الرسالة'
      : _fr
          ? 'Signaler ce message'
          : 'Report this message';
  String get blockUser => _ar
      ? 'حظر المستخدم'
      : _fr
          ? "Bloquer l'utilisateur"
          : 'Block user';
  String get unblockUser => _ar
      ? 'إلغاء حظر المستخدم'
      : _fr
          ? "Débloquer l'utilisateur"
          : 'Unblock user';
  String get reportSubmitted => _ar
      ? 'تم إرسال البلاغ إلى إدارة المؤسسة.'
      : _fr
          ? "Signalement envoyé à l'administration de l'établissement."
          : 'Report sent to the school administration.';
  String get userBlocked => _ar
      ? 'تم حظر هذا المستخدم.'
      : _fr
          ? 'Cet utilisateur a été bloqué.'
          : 'This user has been blocked.';
  String get userUnblocked => _ar
      ? 'تم إلغاء حظر هذا المستخدم.'
      : _fr
          ? 'Cet utilisateur a été débloqué.'
          : 'This user has been unblocked.';
  String get actionFailed => _ar
      ? 'تعذر تنفيذ الإجراء. حاول مرة أخرى.'
      : _fr
          ? "Impossible d'effectuer cette action. Réessayez."
          : 'Could not complete this action. Please try again.';
  String get reasonPrompt => _ar
      ? 'اختر سبب البلاغ:'
      : _fr
          ? 'Choisissez le motif du signalement :'
          : 'Select a reason for reporting:';
  String get detailsHint => _ar
      ? 'تفاصيل إضافية (اختياري)'
      : _fr
          ? 'Précisions complémentaires (facultatif)'
          : 'Additional details (optional)';
  String get submitReport => _ar
      ? 'إرسال البلاغ'
      : _fr
          ? 'Envoyer le signalement'
          : 'Submit report';
  String get cancel => _ar
      ? 'إلغاء'
      : _fr
          ? 'Annuler'
          : 'Cancel';
  String get confirm => _ar
      ? 'تأكيد'
      : _fr
          ? 'Confirmer'
          : 'Confirm';
  String blockConfirmBody(String name) => _ar
      ? 'هل تريد حظر $name؟ لن يتمكن من إرسال رسائل خاصة إليك.'
      : _fr
          ? 'Voulez-vous bloquer $name ? Cette personne ne pourra plus vous envoyer de messages privés.'
          : 'Do you want to block $name? They will no longer be able to send you direct messages.';
  String unblockConfirmBody(String name) => _ar
      ? 'هل تريد إلغاء حظر $name؟'
      : _fr
          ? 'Voulez-vous débloquer $name ?'
          : 'Do you want to unblock $name?';
  String get moreOptions => _ar
      ? 'خيارات إضافية'
      : _fr
          ? "Plus d'options"
          : 'More options';

  Map<String, String> get reasons => {
        'inappropriate': _ar
            ? 'محتوى غير لائق'
            : _fr
                ? 'Contenu inapproprié'
                : 'Inappropriate content',
        'harassment': _ar
            ? 'تحرش أو إزعاج'
            : _fr
                ? 'Harcèlement'
                : 'Harassment',
        'spam': _ar
            ? 'رسائل مزعجة'
            : _fr
                ? 'Spam'
                : 'Spam',
        'threat': _ar
            ? 'تهديد أو عنف'
            : _fr
                ? 'Menace ou violence'
                : 'Threat or violence',
        'other': _ar
            ? 'سبب آخر'
            : _fr
                ? 'Autre motif'
                : 'Other',
      };
}

String extractModerationError(Object error, ModerationText text) {
  if (error is DioException) {
    final data = error.response?.data;
    final detail = data is Map ? data['detail'] : null;
    if (detail is String && detail.trim().isNotEmpty) {
      return detail;
    }
    if (detail is Map && detail['message'] is String) {
      return detail['message'] as String;
    }
  }
  return text.actionFailed;
}

Future<ModerationReportInput?> showModerationReportDialog(
  BuildContext context, {
  String? targetName,
}) async {
  final text = ModerationText.of(context);
  final reasons = text.reasons;
  String selectedReason = 'inappropriate';
  final detailsCtrl = TextEditingController();

  final result = await showDialog<ModerationReportInput>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setModalState) => AlertDialog(
        title: Text(
          targetName != null && targetName.isNotEmpty
              ? '${text.reportContent} ($targetName)'
              : text.reportContent,
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(text.reasonPrompt),
              const SizedBox(height: 8),
              ...reasons.entries.map(
                (entry) {
                  final selected = entry.key == selectedReason;
                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      selected
                          ? Icons.radio_button_checked
                          : Icons.radio_button_unchecked,
                      color: selected
                          ? Theme.of(ctx).colorScheme.primary
                          : Theme.of(ctx).hintColor,
                    ),
                    title: Text(entry.value),
                    onTap: () => setModalState(() => selectedReason = entry.key),
                  );
                },
              ),
              const SizedBox(height: 8),
              TextField(
                controller: detailsCtrl,
                maxLines: 3,
                maxLength: 400,
                decoration: InputDecoration(
                  hintText: text.detailsHint,
                  border: const OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(text.cancel),
          ),
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor:
                  Theme.of(ctx).extension<AppColors>()?.dangerRed ??
                      Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () => Navigator.of(ctx).pop(
              ModerationReportInput(
                reason: selectedReason,
                details: detailsCtrl.text.trim(),
              ),
            ),
            child: Text(text.submitReport),
          ),
        ],
      ),
    ),
  );
  detailsCtrl.dispose();
  return result;
}

Future<bool> showBlockUserConfirmDialog(
  BuildContext context, {
  required String userName,
  required bool isCurrentlyBlocked,
}) async {
  final text = ModerationText.of(context);
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(isCurrentlyBlocked ? text.unblockUser : text.blockUser),
      content: Text(
        isCurrentlyBlocked
            ? text.unblockConfirmBody(userName)
            : text.blockConfirmBody(userName),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(text.cancel),
        ),
        TextButton(
          style: TextButton.styleFrom(
            foregroundColor: isCurrentlyBlocked
                ? Theme.of(ctx).colorScheme.primary
                : (Theme.of(ctx).extension<AppColors>()?.dangerRed ??
                    Theme.of(ctx).colorScheme.error),
          ),
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(text.confirm),
        ),
      ],
    ),
  );
  return confirmed == true;
}
