import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../providers/auth_provider.dart';

class SessionModel {
  final String familyId;
  final String? devicePlatform;
  final String? ipAddress;
  final String? userAgent;
  final DateTime createdAt;
  final DateTime? lastUsedAt;

  const SessionModel({
    required this.familyId,
    this.devicePlatform,
    this.ipAddress,
    this.userAgent,
    required this.createdAt,
    this.lastUsedAt,
  });

  factory SessionModel.fromJson(Map<String, dynamic> json) => SessionModel(
        familyId: json['family_id'] as String,
        devicePlatform: json['device_platform'] as String?,
        ipAddress: json['ip_address'] as String?,
        userAgent: json['user_agent'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
        lastUsedAt: json['last_used_at'] == null
            ? null
            : DateTime.parse(json['last_used_at'] as String),
      );

  String get label {
    final agent = userAgent ?? '';
    final system = agent.contains('Android')
        ? 'Android'
        : RegExp('iPhone|iPad|iOS').hasMatch(agent)
            ? 'iOS'
            : agent.contains('Windows')
                ? 'Windows'
                : agent.contains('Mac OS')
                    ? 'macOS'
                    : devicePlatform ?? '';
    final browser = agent.contains('Edg/')
        ? 'Edge'
        : agent.contains('Chrome/')
            ? 'Chrome'
            : agent.contains('Firefox/')
                ? 'Firefox'
                : RegExp('Dart|okhttp|CFNetwork').hasMatch(agent)
                    ? 'App'
                    : '';
    final name = [browser, system].where((s) => s.isNotEmpty).join(' · ');
    return name.isEmpty ? '—' : name;
  }
}

final sessionsProvider =
    FutureProvider.autoDispose<List<SessionModel>>((ref) async {
  final data = await ref.watch(authRepositoryProvider).listSessions();
  return data
      .map((e) => SessionModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

class DevicesScreen extends ConsumerWidget {
  const DevicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _DevText.of(context);
    final sessionsAsync = ref.watch(sessionsProvider);
    final format = DateFormat(
        'd MMM yyyy HH:mm', Localizations.localeOf(context).toLanguageTag());
    // Shown in school time (Algeria, UTC+1) like the rest of the app.
    String when(DateTime value) =>
        format.format(value.toUtc().add(const Duration(hours: 1)));

    Future<bool> confirm(String body) async =>
        await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            content: Text(body),
            actions: [
              TextButton(
                  onPressed: () => Navigator.of(ctx).pop(false),
                  child: Text(text.back)),
              TextButton(
                  onPressed: () => Navigator.of(ctx).pop(true),
                  child: Text(text.confirm)),
            ],
          ),
        ) ==
        true;

    return Scaffold(
      appBar: AppBar(title: Text(text.title)),
      body: sessionsAsync.when(
        loading: () => const ShimmerList(showAvatar: false),
        error: (e, _) => Center(child: Text('$e')),
        data: (sessions) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(text.copy,
                style: TextStyle(color: context.appColors.mutedText)),
            const SizedBox(height: 12),
            for (final session in sessions)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.devices_outlined),
                  title: Text(session.label),
                  subtitle: Text([
                    text.lastUsed(
                        when(session.lastUsedAt ?? session.createdAt)),
                    if (session.ipAddress != null) session.ipAddress!,
                  ].join(' · ')),
                  trailing: IconButton(
                    icon: const Icon(Icons.logout),
                    tooltip: text.revoke,
                    onPressed: () async {
                      if (!await confirm(text.revokeConfirm)) return;
                      await ref
                          .read(authRepositoryProvider)
                          .revokeSession(session.familyId);
                      ref.invalidate(sessionsProvider);
                    },
                  ),
                ),
              ),
            const SizedBox(height: 8),
            Text(text.note,
                style: TextStyle(
                    color: context.appColors.mutedText, fontSize: 12)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: const Icon(Icons.phonelink_erase_outlined),
              label: Text(text.revokeOthers),
              onPressed: sessions.length < 2
                  ? null
                  : () async {
                      if (!await confirm(text.revokeOthersConfirm)) return;
                      await ref
                          .read(authRepositoryProvider)
                          .revokeOtherSessions();
                      ref.invalidate(sessionsProvider);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(text.revokedOthers)));
                      }
                    },
            ),
          ],
        ),
      ),
    );
  }
}

class _DevText {
  final String code;
  const _DevText(this.code);

  static _DevText of(BuildContext context) =>
      _DevText(Localizations.localeOf(context).languageCode);

  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get title =>
      pick('الأجهزة المتصلة', 'Appareils connectes', 'Connected devices');
  String get copy => pick(
      'الأجهزة المتصل بها حسابك. افصل ما لا تعرفه ثم غيّر كلمة المرور.',
      "Appareils ou votre compte est connecte. Deconnectez ceux que vous ne reconnaissez pas, puis changez votre mot de passe.",
      "Devices where your account is signed in. Sign out any you don't recognise, then change your password.");
  String lastUsed(String date) => pick(
      'آخر نشاط: $date', 'Derniere activite : $date', 'Last active: $date');
  String get revoke => pick('فصل', 'Deconnecter', 'Sign out');
  String get revokeConfirm => pick(
      'فصل هذا الجهاز؟ إذا كان هذا الجهاز ستحتاج لإعادة الدخول.',
      "Deconnecter cet appareil ? S'il s'agit de celui-ci, vous devrez vous reconnecter.",
      "Sign out this device? If it's this one, you'll need to sign in again.");
  String get note => pick(
      'قد يبقى الجهاز المفصول متصلا حتى 30 دقيقة؛ أما «فصل أجهزتي الأخرى» ففوري.',
      "Un appareil deconnecte peut garder l'acces jusqu'a 30 minutes ; « Deconnecter mes autres appareils » est immediat.",
      'A signed-out device can keep access for up to 30 minutes; "Sign out my other devices" is immediate.');
  String get revokeOthers => pick('فصل أجهزتي الأخرى',
      'Deconnecter mes autres appareils', 'Sign out my other devices');
  String get revokeOthersConfirm => pick(
      'فصل كل أجهزتك الأخرى الآن؟ يبقى هذا الجهاز متصلا.',
      'Deconnecter tous vos autres appareils maintenant ? Cet appareil reste connecte.',
      'Sign out all your other devices now? This device stays signed in.');
  String get revokedOthers => pick(
      'تم فصل أجهزتك الأخرى.',
      'Vos autres appareils ont ete deconnectes.',
      'Your other devices have been signed out.');
  String get back => pick('رجوع', 'Retour', 'Back');
  String get confirm => pick('تأكيد', 'Confirmer', 'Confirm');
}
