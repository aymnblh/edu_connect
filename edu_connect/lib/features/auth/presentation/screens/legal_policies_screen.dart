import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';

class LegalPoliciesScreen extends StatelessWidget {
  const LegalPoliciesScreen({super.key});

  static const _contactEmail = 'privacy@educonnect.dz';
  static const _policyUrl = 'https://app.educonnect.dz/policies';
  static final _updatedAt = DateTime(2026, 5, 13);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = _LegalText.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(text.appBarTitle),
        leading: IconButton(
          icon: Icon(Icons.adaptive.arrow_back),
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/login');
            }
          },
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 18, 20, 32),
          children: [
            const _Header(),
            const SizedBox(height: 16),
            const _Notice(),
            const SizedBox(height: 16),
            ..._sectionConfigs.map(
              (section) => _PolicySection(
                icon: section.icon,
                title: text.sectionTitle(section.id),
                body: text.sectionBody(section.id),
              ),
            ),
            const _ContactCard(),
          ],
        ),
      ),
    );
  }
}

const _sectionConfigs = [
  _PolicySectionConfig('legalFrame', Icons.account_balance_outlined),
  _PolicySectionConfig('schoolData', Icons.school_outlined),
  _PolicySectionConfig('minors', Icons.child_care_outlined),
  _PolicySectionConfig('security', Icons.lock_outline),
  _PolicySectionConfig('rights', Icons.verified_user_outlined),
  _PolicySectionConfig('deletion', Icons.delete_outline),
  _PolicySectionConfig('terms', Icons.rule_outlined),
];

class _PolicySectionConfig {
  final String id;
  final IconData icon;

  const _PolicySectionConfig(this.id, this.icon);
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    final text = _LegalText.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          label: text.privacyIconLabel,
          child: Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: colors.tealDark,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              Icons.privacy_tip_outlined,
              color: theme.colorScheme.onPrimary,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          text.title,
          style: TextStyle(
            fontSize: 28,
            height: 1.12,
            fontWeight: FontWeight.w800,
            color: theme.colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          text.lastUpdated(
            DateFormat.yMMMMd(Localizations.localeOf(context).toLanguageTag())
                .format(LegalPoliciesScreen._updatedAt),
          ),
          style: TextStyle(color: colors.subtitleText, height: 1.45),
        ),
      ],
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice();

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.warningAmber.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.warningAmber.withValues(alpha: 0.7)),
      ),
      child: Text(
        _LegalText.of(context).notice,
        style: TextStyle(
          color: colors.warningAmber,
          height: 1.5,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _PolicySection extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;

  const _PolicySection({
    required this.icon,
    required this.title,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: colors.tealDark),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            body,
            style: TextStyle(
              color: colors.subtitleText,
              height: 1.55,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    final text = _LegalText.of(context);

    return Container(
      margin: const EdgeInsets.only(top: 2),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.tealDark.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.tealDark.withValues(alpha: 0.24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            text.contactTitle,
            style: TextStyle(
              color: theme.colorScheme.onSurface,
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          SelectableText(
            LegalPoliciesScreen._contactEmail,
            style:
                TextStyle(color: colors.tealDark, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          SelectableText(
            LegalPoliciesScreen._policyUrl,
            style:
                TextStyle(color: colors.tealDark, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _LegalText {
  final String languageCode;

  const _LegalText(this.languageCode);

  static _LegalText of(BuildContext context) =>
      _LegalText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get appBarTitle => _ar
      ? 'الخصوصية'
      : _fr
          ? 'Confidentialité'
          : 'Privacy';
  String get title => _ar
      ? 'سياسة الخصوصية والشروط'
      : _fr
          ? 'Politique de confidentialité et conditions'
          : 'Privacy policy and terms';
  String lastUpdated(String date) => _ar
      ? 'آخر تحديث: $date'
      : _fr
          ? 'Dernière mise à jour : $date'
          : 'Last updated: $date';
  String get privacyIconLabel => _ar
      ? 'أيقونة الخصوصية'
      : _fr
          ? 'Icône de confidentialité'
          : 'Privacy icon';
  String get notice => _ar
      ? 'هذا النص نموذج تشغيلي لـ Wasel Edu. قبل النشر الرسمي، استبدلوا جهات الاتصال والعنوان والمضيف ومدد الاحتفاظ بمعلوماتكم النهائية، ثم اعرضوا الوثيقة على مستشار قانوني.'
      : _fr
          ? 'Ce texte est un modèle opérationnel pour Wasel Edu. Avant publication officielle, remplacez les contacts, l’adresse, l’hébergeur et les durées de conservation par vos informations finales, puis faites relire le document par un conseil juridique.'
          : 'This text is an operational template for Wasel Edu. Before official publication, replace contacts, address, host, and retention periods with your final information, then have the document reviewed by legal counsel.';
  String get contactTitle => _ar
      ? 'التواصل والنسخة الويب'
      : _fr
          ? 'Contact et version web'
          : 'Contact and web version';

  String sectionTitle(String id) {
    switch (id) {
      case 'legalFrame':
        return _ar
            ? 'الإطار الجزائري'
            : _fr
                ? 'Cadre algérien'
                : 'Algerian legal framework';
      case 'schoolData':
        return _ar
            ? 'البيانات المدرسية المعالجة'
            : _fr
                ? 'Données scolaires traitées'
                : 'Processed school data';
      case 'minors':
        return _ar
            ? 'بيانات القاصرين'
            : _fr
                ? 'Données des mineurs'
                : 'Data about minors';
      case 'security':
        return _ar
            ? 'الأمان'
            : _fr
                ? 'Sécurité'
                : 'Security';
      case 'rights':
        return _ar
            ? 'حقوق المستخدمين'
            : _fr
                ? 'Droits des utilisateurs'
                : 'User rights';
      case 'deletion':
        return _ar
            ? 'حذف الحساب'
            : _fr
                ? 'Suppression du compte'
                : 'Account deletion';
      case 'terms':
        return _ar
            ? 'شروط الاستخدام'
            : _fr
                ? 'Conditions d’utilisation'
                : 'Terms of use';
      default:
        return id;
    }
  }

  String sectionBody(String id) {
    switch (id) {
      case 'legalFrame':
        return _ar
            ? 'يعالج Wasel Edu البيانات الشخصية وفقا للقانون الجزائري رقم 18-07 المؤرخ في 10 يونيو 2018 المتعلق بحماية الأشخاص الطبيعيين في معالجة البيانات ذات الطابع الشخصي، كما عُدل وتمم بالقانون رقم 25-11 المؤرخ في 24 يوليو 2025.'
            : _fr
                ? 'Wasel Edu traite les données personnelles conformément à la loi algérienne n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, modifiée et complétée par la loi n° 25-11 du 24 juillet 2025.'
                : 'Wasel Edu processes personal data in accordance with Algerian Law No. 18-07 of June 10, 2018 on the protection of individuals in personal data processing, as amended and supplemented by Law No. 25-11 of July 24, 2025.';
      case 'schoolData':
        return _ar
            ? 'يمكن للمنصة معالجة الهوية والأدوار والبريد الإلكتروني والأقسام وروابط ولي الأمر بالطالب والحضور والدرجات والواجبات والملاحظات والرسائل والإشعارات والاشتراكات وسجلات الأمان والمعرفات التقنية اللازمة للخدمة المدرسية.'
            : _fr
                ? 'La plateforme peut traiter les identités, rôles, emails, classes, liens parent-élève, présences, notes, devoirs, remarques, messages, notifications, abonnements, journaux de sécurité et identifiants techniques strictement nécessaires au service scolaire.'
                : 'The platform may process identities, roles, emails, classes, parent-student links, attendance, grades, homework, remarks, messages, notifications, subscriptions, security logs, and technical identifiers strictly needed for school service.';
      case 'minors':
        return _ar
            ? 'تقتصر بيانات الطلاب القاصرين على الأغراض المدرسية. لا تُباع هذه البيانات ولا تُستخدم للإعلانات السلوكية أو التنميط التجاري.'
            : _fr
                ? 'Les données des élèves mineurs sont limitées aux finalités scolaires. Elles ne sont pas revendues, ni utilisées pour de la publicité comportementale ou du profilage commercial.'
                : 'Data about minor students is limited to school purposes. It is not resold and is not used for behavioral advertising or commercial profiling.';
      case 'security':
        return _ar
            ? 'يستخدم Wasel Edu تشفير TLS وكلمات مرور مجزأة ورموز جلسة وعزلا حسب المؤسسة وضوابط أدوار وسجلات تدقيق. يجب استضافة بيانات الإنتاج في بيئة مضبوطة داخل الجزائر، إلا إذا وُجد أساس قانوني أو ترخيص قابل للتطبيق.'
            : _fr
                ? 'Wasel Edu utilise le chiffrement TLS, des mots de passe hachés, des jetons de session, une isolation par établissement, des contrôles de rôles et des journaux d’audit. Les données de production doivent être hébergées dans un environnement contrôlé situé en Algérie, sauf base légale ou autorisation applicable.'
                : 'Wasel Edu uses TLS encryption, hashed passwords, session tokens, school-level isolation, role controls, and audit logs. Production data should be hosted in a controlled environment located in Algeria, unless a legal basis or authorization applies.';
      case 'rights':
        return _ar
            ? 'يمكن للأشخاص المعنيين طلب المعلومات والوصول والتصحيح والاعتراض لسبب مشروع، وعندما يكون ذلك متوافقا مع الالتزامات المدرسية أو القانونية، حذف بعض البيانات أو تقييدها.'
            : _fr
                ? 'Les personnes concernées peuvent demander l’information, l’accès, la rectification, l’opposition pour motif légitime et, lorsque cela est compatible avec les obligations scolaires ou légales, la suppression ou la limitation de certaines données.'
                : 'Data subjects may request information, access, correction, objection on legitimate grounds, and, where compatible with school or legal obligations, deletion or restriction of certain data.';
      case 'deletion':
        return _ar
            ? 'لطلب حذف حساب أو بيانات شخصية، تواصلوا مع privacy@educonnect.dz أو إدارة مؤسستكم. قد يُطلب التحقق من الهوية قبل أي إجراء.'
            : _fr
                ? 'Pour demander la suppression d’un compte ou de données personnelles, contactez privacy@educonnect.dz ou l’administration de votre établissement. Une vérification d’identité peut être demandée avant toute action.'
                : 'To request deletion of an account or personal data, contact privacy@educonnect.dz or your school administration. Identity verification may be required before any action.';
      case 'terms':
        return _ar
            ? 'يقتصر الوصول على المستخدمين المصرح لهم من طرف مؤسسة أو مدير المنصة. يجب استخدام الخدمة فقط لأغراض تعليمية مشروعة. قد يؤدي أي محتوى غير قانوني أو مسيء أو تمييزي أو غير مرتبط بالدراسة إلى التعليق.'
            : _fr
                ? 'L’accès est réservé aux utilisateurs autorisés par un établissement ou par l’administrateur de la plateforme. Le service doit être utilisé uniquement pour des finalités éducatives légitimes. Tout contenu illicite, injurieux, discriminatoire ou sans lien avec la scolarité peut entraîner une suspension.'
                : 'Access is limited to users authorized by a school or platform administrator. The service must be used only for legitimate educational purposes. Unlawful, abusive, discriminatory, or non-school-related content may lead to suspension.';
      default:
        return id;
    }
  }
}
