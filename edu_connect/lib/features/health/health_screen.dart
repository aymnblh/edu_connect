import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/child_switcher_bar.dart';
import '../../core/widgets/shimmer_loading.dart';
import '../auth/presentation/providers/children_provider.dart';
import 'health_repository.dart';

const _bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

String _message(Object error) {
  if (error is DioException && error.response?.data is Map) {
    final detail = (error.response!.data as Map)['detail'];
    if (detail is String) return detail;
    if (detail is List && detail.isNotEmpty && detail.first is Map) {
      final msg = (detail.first as Map)['msg'];
      if (msg is String) return msg.replaceFirst('Value error, ', '');
    }
  }
  return '$error';
}

/// Parent screen: the selected child's health and emergency sheet.
class HealthScreen extends ConsumerWidget {
  const HealthScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _HText.of(context);
    final child = ref.watch(selectedChildProvider);
    return Scaffold(
      appBar: AppBar(title: Text(text.title)),
      body: Column(
        children: [
          const ChildSwitcherBar(),
          Expanded(
            child: child == null
                ? const ShimmerList(showAvatar: false)
                : ref.watch(healthRecordProvider(child.id)).when(
                      loading: () => const ShimmerList(showAvatar: false),
                      error: (e, _) => Center(child: Text(_message(e))),
                      data: (record) => _HealthForm(
                        // Rebuilt from the server copy after each save.
                        key: ValueKey(
                            '${child.id}-${record.exists}-${record.consentGivenAt}'),
                        studentId: child.id,
                        record: record,
                      ),
                    ),
          ),
        ],
      ),
    );
  }
}

class _HealthForm extends ConsumerStatefulWidget {
  final String studentId;
  final HealthRecord record;

  const _HealthForm({super.key, required this.studentId, required this.record});

  @override
  ConsumerState<_HealthForm> createState() => _HealthFormState();
}

class _HealthFormState extends ConsumerState<_HealthForm> {
  final _formKey = GlobalKey<FormState>();
  late final List<EmergencyContact> _contacts = widget.record.contacts.isEmpty
      ? [EmergencyContact()]
      : [...widget.record.contacts];
  late final _allergies = TextEditingController(text: widget.record.allergies);
  late final _conditions =
      TextEditingController(text: widget.record.conditions);
  late final _medications =
      TextEditingController(text: widget.record.medications);
  late final _doctor = TextEditingController(text: widget.record.doctorName);
  late final _doctorPhone =
      TextEditingController(text: widget.record.doctorPhone);
  late final _instructions =
      TextEditingController(text: widget.record.instructions);
  late final _alert = TextEditingController(text: widget.record.teacherAlert);
  late String? _bloodGroup = widget.record.bloodGroup;
  bool _consent = false;
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [
      _allergies,
      _conditions,
      _medications,
      _doctor,
      _doctorPhone,
      _instructions,
      _alert
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _orNull(TextEditingController c) =>
      c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _save() async {
    final text = _HText.of(context);
    if (!_formKey.currentState!.validate()) return;
    if (!widget.record.exists && !_consent) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(text.consentRequired)));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(healthRepositoryProvider).save(widget.studentId, {
        'emergency_contacts':
            _contacts.where((c) => !c.isEmpty).map((c) => c.toJson()).toList(),
        'allergies': _orNull(_allergies),
        'conditions': _orNull(_conditions),
        'medications': _orNull(_medications),
        'blood_group': _bloodGroup,
        'doctor_name': _orNull(_doctor),
        'doctor_phone': _orNull(_doctorPhone),
        'emergency_instructions': _orNull(_instructions),
        'teacher_alert': _orNull(_alert),
        'consent': _consent,
      });
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(text.saved)));
      }
      ref.invalidate(healthRecordProvider(widget.studentId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(_message(e))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _withdraw() async {
    final text = _HText.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(text.withdrawConfirm),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(text.back)),
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text(text.withdraw)),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(healthRepositoryProvider).delete(widget.studentId);
      ref.invalidate(healthRecordProvider(widget.studentId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(_message(e))));
      }
    }
  }

  Widget _field(TextEditingController c, String label,
          {String? hint, int lines = 2, int max = 2000}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextFormField(
          controller: c,
          minLines: 1,
          maxLines: lines,
          maxLength: max,
          decoration: InputDecoration(
              labelText: label, hintText: hint, counterText: ''),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final text = _HText.of(context);
    final muted = TextStyle(color: context.appColors.mutedText, fontSize: 12);
    final phoneRule = RegExp(r'^\+?[0-9][0-9 .-]{5,24}$');
    String? phoneValidator(String? v) =>
        (v == null || v.trim().isEmpty || phoneRule.hasMatch(v.trim()))
            ? null
            : text.badPhone;

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(text.intro, style: muted),
          if (widget.record.exists && widget.record.consentGivenAt != null) ...[
            const SizedBox(height: 6),
            Text(
                text.consentOn(DateFormat('dd/MM/yyyy')
                    .format(widget.record.consentGivenAt!)),
                style: muted),
          ],
          const SizedBox(height: 16),
          Text(text.contacts,
              style: const TextStyle(fontWeight: FontWeight.w800)),
          for (var i = 0; i < _contacts.length; i++)
            Card(
              key: ObjectKey(_contacts[i]),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 4, 8),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            initialValue: _contacts[i].name,
                            maxLength: 120,
                            decoration: InputDecoration(
                                labelText: text.contactName, counterText: ''),
                            onChanged: (v) => _contacts[i].name = v,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline),
                          tooltip: text.remove,
                          onPressed: () =>
                              setState(() => _contacts.removeAt(i)),
                        ),
                      ],
                    ),
                    TextFormField(
                      initialValue: _contacts[i].relationship,
                      maxLength: 60,
                      decoration: InputDecoration(
                          labelText: text.relationship, counterText: ''),
                      onChanged: (v) => _contacts[i].relationship = v,
                    ),
                    TextFormField(
                      initialValue: _contacts[i].phone,
                      keyboardType: TextInputType.phone,
                      maxLength: 25,
                      validator: phoneValidator,
                      decoration: InputDecoration(
                          labelText: text.phone, counterText: ''),
                      onChanged: (v) => _contacts[i].phone = v,
                    ),
                  ],
                ),
              ),
            ),
          if (_contacts.length < 4)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(Icons.add),
                label: Text(text.addContact),
                onPressed: () =>
                    setState(() => _contacts.add(EmergencyContact())),
              ),
            ),
          const SizedBox(height: 8),
          _field(_allergies, text.allergies, hint: text.allergiesHint),
          _field(_conditions, text.conditions, hint: text.conditionsHint),
          _field(_medications, text.medications),
          DropdownButtonFormField<String?>(
            initialValue: _bloodGroup,
            decoration: InputDecoration(labelText: text.bloodGroup),
            items: [
              const DropdownMenuItem<String?>(value: null, child: Text('—')),
              for (final g in _bloodGroups)
                DropdownMenuItem<String?>(value: g, child: Text(g)),
            ],
            onChanged: (v) => setState(() => _bloodGroup = v),
          ),
          const SizedBox(height: 12),
          _field(_doctor, text.doctor, lines: 1, max: 120),
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: TextFormField(
              controller: _doctorPhone,
              keyboardType: TextInputType.phone,
              validator: phoneValidator,
              decoration: InputDecoration(labelText: text.doctorPhone),
            ),
          ),
          _field(_instructions, text.instructions,
              hint: text.instructionsHint, lines: 4),
          _field(_alert, text.teacherAlert,
              hint: text.teacherAlertHint, lines: 1, max: 200),
          Text(text.teacherAlertNote, style: muted),
          if (!widget.record.exists)
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _consent,
              onChanged: (v) => setState(() => _consent = v ?? false),
              title: Text(text.consent, style: const TextStyle(fontSize: 14)),
              controlAffinity: ListTileControlAffinity.leading,
            ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _saving ? null : _save,
            icon: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.favorite_outline),
            label: Text(text.save),
          ),
          if (widget.record.exists)
            TextButton(
              onPressed: _withdraw,
              style: TextButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.error),
              child: Text(text.withdraw),
            ),
        ],
      ),
    );
  }
}

/// Teacher banner: short health alerts of the class (never the full record).
class ClassHealthAlertsBanner extends ConsumerWidget {
  final String classId;
  const ClassHealthAlertsBanner({super.key, required this.classId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alerts = ref.watch(classHealthAlertsProvider(classId)).valueOrNull ??
        const <HealthAlert>[];
    if (alerts.isEmpty) return const SizedBox.shrink();
    final text = _HText.of(context);
    final warning = context.appColors.warningAmber;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: warning.withValues(alpha: 0.08),
        border: Border.all(color: warning.withValues(alpha: 0.4)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.warning_amber_rounded, color: warning, size: 18),
            const SizedBox(width: 6),
            Text(text.classAlerts,
                style: const TextStyle(fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 6),
          for (final a in alerts)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text.rich(TextSpan(children: [
                TextSpan(
                    text: a.studentName,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                TextSpan(text: ' — ${a.alert}'),
              ])),
            ),
        ],
      ),
    );
  }
}

class _HText {
  final String code;
  const _HText(this.code);

  static _HText of(BuildContext context) =>
      _HText(Localizations.localeOf(context).languageCode);

  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get title => pick('البطاقة الصحية', 'Fiche sante', 'Health sheet');
  String get intro => pick(
      'تساعد هذه المعلومات المؤسسة على التصرف في حالة الطوارئ. لا يراها إلا الإدارة وأنتم؛ يرى الأساتذة التنبيه القصير فقط. أدخلوا الضروري فقط.',
      "Ces informations aident l'ecole a reagir en cas d'urgence. Seuls la direction et vous les voyez ; les enseignants voient seulement l'alerte courte. Ne renseignez que le necessaire.",
      'This helps the school act in an emergency. Only the administration and you can see it; teachers only see the short alert. Enter only what is needed.');
  String consentOn(String date) => pick('الموافقة مسجلة في $date',
      'Consentement enregistre le $date', 'Consent recorded on $date');
  String get contacts => pick(
      'جهات الاتصال في الطوارئ (حسب الترتيب)',
      "Contacts d'urgence (dans l'ordre d'appel)",
      'Emergency contacts (in calling order)');
  String get contactName => pick('الاسم', 'Nom', 'Name');
  String get relationship =>
      pick('القرابة', 'Lien (mere, oncle...)', 'Relationship');
  String get phone => pick('الهاتف', 'Telephone', 'Phone');
  String get badPhone => pick('رقم هاتف غير صالح',
      'Numero de telephone invalide', 'Invalid phone number');
  String get remove => pick('حذف', 'Retirer', 'Remove');
  String get addContact =>
      pick('إضافة جهة اتصال', 'Ajouter un contact', 'Add a contact');
  String get allergies => pick('الحساسية', 'Allergies', 'Allergies');
  String get allergiesHint => pick('مثال: الفول السوداني، البنسلين',
      'ex. arachides, penicilline', 'e.g. peanuts, penicillin');
  String get conditions =>
      pick('الأمراض أو الحالات', 'Maladies ou conditions', 'Conditions');
  String get conditionsHint => pick(
      'مثال: الربو، السكري', 'ex. asthme, diabete', 'e.g. asthma, diabetes');
  String get medications => pick(
      'العلاج / الأدوية', 'Traitement / medicaments', 'Treatment / medication');
  String get bloodGroup => pick('فصيلة الدم', 'Groupe sanguin', 'Blood group');
  String get doctor => pick('الطبيب المعالج', 'Medecin traitant', 'Doctor');
  String get doctorPhone =>
      pick('هاتف الطبيب', 'Telephone du medecin', "Doctor's phone");
  String get instructions => pick('ما العمل في حالة الطوارئ',
      "Que faire en cas d'urgence", 'What to do in an emergency');
  String get instructionsHint => pick('مثال: البخاخ في المحفظة',
      'ex. inhalateur dans le cartable', 'e.g. inhaler in the schoolbag');
  String get teacherAlert => pick('تنبيه قصير للأساتذة',
      'Alerte courte pour les enseignants', 'Short alert for teachers');
  String get teacherAlertHint => pick('مثال: حساسية الفول السوداني',
      'ex. Allergie arachides', 'e.g. Peanut allergy');
  String get teacherAlertNote => pick(
      'هذا السطر فقط مرئي لأساتذة القسم.',
      'Seule cette ligne est visible par les enseignants de la classe.',
      "Only this line is visible to the class's teachers.");
  String get consent => pick(
      'أوافق على احتفاظ المؤسسة بهذه المعلومات الصحية لحماية طفلي. يمكنني سحبها في أي وقت.',
      "J'accepte que l'ecole conserve ces informations de sante pour proteger mon enfant. Je peux les retirer a tout moment.",
      'I agree that the school keeps this health information to protect my child. I can withdraw it at any time.');
  String get consentRequired => pick('الموافقة مطلوبة.',
      'Le consentement est requis.', 'Consent is required.');
  String get save =>
      pick('حفظ البطاقة', 'Enregistrer la fiche', 'Save the sheet');
  String get saved =>
      pick('تم حفظ البطاقة.', 'Fiche enregistree.', 'Sheet saved.');
  String get withdraw =>
      pick('سحب موافقتي', 'Retirer mon consentement', 'Withdraw my consent');
  String get withdrawConfirm => pick(
      'سحب الموافقة يمحو البطاقة الصحية لطفلكم نهائيا. متابعة؟',
      "Retirer votre consentement efface definitivement la fiche sante de votre enfant. Continuer ?",
      "Withdrawing consent permanently erases your child's health sheet. Continue?");
  String get back => pick('رجوع', 'Retour', 'Back');
  String get classAlerts => pick('تنبيهات صحية للقسم',
      'Alertes sante de la classe', 'Class health alerts');
}
