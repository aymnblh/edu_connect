import { Link } from 'react-router-dom';
import { type Locale, useLocale } from '../lib/i18n';

const supportEmail = 'privacy@waseledu.dz';
const legalEntity = 'Wasel Edu';
const lastUpdatedAt = new Date(2026, 4, 25);
const locales: Locale[] = ['fr', 'ar', 'en'];

type PolicySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type PolicyCopy = {
  back: string;
  title: string;
  intro: string;
  lastUpdatedLabel: string;
  hostingLabel: string;
  contactLabel: string;
  hostingLocation: string;
  notice: string;
  sections: PolicySection[];
  referencesTitle: string;
  referencesIntro: string;
  references: Array<{ label: string; href: string }>;
};

const references = {
  law18: 'https://droit.mjustice.gov.dz/sites/default/files/loi_18-07_fr.pdf',
  law25: 'https://droit.mjustice.gov.dz/sites/default/files/loi_25-11-fr.pdf',
  lawPortal:
    'https://droit.mjustice.gov.dz/fr/content/protection-des-personnes-physiques-dans-le-traitement-des-donn%C3%A9es-%C3%A0-caract%C3%A8re-personnel',
  anpdp: 'https://portail.anpdp.dz/',
  notice: 'https://plaintes.anpdp.dz/notice.php',
};

const policyCopy: Record<Locale, PolicyCopy> = {
  fr: {
    back: 'Retour',
    title: "Politique de confidentialité, protection des données et conditions d'utilisation",
    intro:
      "Cette page décrit la manière dont Wasel Edu collecte, utilise, protège, conserve et partage les données personnelles traitées dans un contexte scolaire. Elle s'adresse aux établissements, directions, enseignants, parents, élèves et administrateurs autorisés.",
    lastUpdatedLabel: 'Dernière mise à jour',
    hostingLabel: 'Hébergement visé',
    contactLabel: 'Contact confidentialité',
    hostingLocation: 'Algérie',
    notice:
      "Ce document est un modèle opérationnel destiné à présenter les règles de confidentialité de la plateforme. Il doit être relu et adapté par un conseil juridique avant publication officielle, notamment pour confirmer l'identité du responsable du traitement, l'adresse de contact, l'hébergeur, les durées de conservation et les obligations propres à chaque établissement.",
    sections: [
      {
        id: 'responsibilities',
        title: '1. Identité du service et responsabilités',
        paragraphs: [
          "Wasel Edu fournit une plateforme de communication et de suivi scolaire permettant aux écoles de gérer des comptes, des classes, des messages, des absences, des notes, des notifications et des documents pédagogiques.",
          "Lorsqu'un établissement utilise Wasel Edu pour ses propres élèves, parents et équipes pédagogiques, l'établissement reste responsable de l'exactitude des données qu'il importe, valide ou modifie. Wasel Edu agit comme fournisseur technique pour exécuter les instructions de l'établissement, sauf lorsqu'il traite certaines données pour la sécurité, la facturation, l'administration de la plateforme ou le respect d'obligations légales.",
          "L'accès à la plateforme est réservé aux utilisateurs autorisés. Un compte parent, enseignant, élève ou personnel administratif ne doit pas être créé librement par le public sans validation de l'établissement concerné.",
        ],
      },
      {
        id: 'algeria',
        title: '2. Adaptation au marché algérien',
        paragraphs: [
          "Wasel Edu est conçu en priorité pour les établissements opérant en Algérie. L'interface, les notifications et les documents destinés aux familles doivent rester compréhensibles en français et en arabe, avec une attention particulière aux habitudes locales des écoles privées et publiques.",
          "Les paramètres commerciaux et administratifs de la plateforme doivent utiliser le dinar algérien pour les montants, les abonnements et les reçus. Les informations de facturation doivent pouvoir être adaptées aux données de l'établissement ou de l'entité exploitante, notamment la dénomination, l'adresse, le NIF, le NIS, le registre de commerce lorsque cela est applicable, et les coordonnées de contact.",
          "La conformité visée est le droit algérien applicable aux données personnelles, notamment la loi n° 18-07 du 10 juin 2018, modifiée et complétée par la loi n° 25-11 du 24 juillet 2025, ainsi que les instructions et espaces de l'Autorité Nationale de Protection des Données à caractère Personnel (ANPDP).",
          "Pour le marché algérien, Wasel Edu privilégie un hébergement et des sauvegardes situés en Algérie lorsque cela est disponible et contractuellement retenu. Tout transfert ou accès technique depuis l'étranger doit être identifié, documenté, limité et encadré selon les exigences applicables.",
        ],
        bullets: [
          "Registre des traitements : tenir une cartographie des traitements scolaires, des catégories de données, des destinataires, des durées de conservation et des mesures de sécurité.",
          "Référent ou délégué à la protection des données : désigner une personne joignable pour les questions de confidentialité, les demandes d'exercice de droits et les incidents.",
          "ANPDP : vérifier si une déclaration, une formalité, une autorisation ou une mise à jour est requise avant le lancement ou lors d'un changement majeur.",
          "Contrats école-plateforme : préciser les responsabilités de l'établissement, de Wasel Edu et des éventuels sous-traitants techniques.",
        ],
      },
      {
        id: 'data',
        title: '3. Données personnelles traitées',
        paragraphs: [
          "Wasel Edu limite la collecte aux données nécessaires au fonctionnement scolaire et à la sécurité du service. Les données peuvent varier selon les modules activés par l'établissement.",
        ],
        bullets: [
          "Identité et compte : nom, prénom, email, identifiant interne, langue préférée, photo de profil, rôle actif, statut du compte et informations de connexion.",
          'Relations scolaires : établissement, classes, matières, enseignants assignés, élèves inscrits, liens parent-enfant et périodes de validité de ces relations.',
          'Données pédagogiques : notes, évaluations, bulletins, appréciations, devoirs, pièces jointes pédagogiques, remarques et historique de modification.',
          'Vie scolaire : présences, absences, retards, justificatifs, notifications associées et décisions de validation ou de correction.',
          'Communication : messages directs, annonces, destinataires, dates, accusés de réception, fichiers joints, signalements et informations nécessaires à la modération autorisée.',
          'Données techniques : journaux de connexion, appareil, adresse IP, navigateur, événements de sécurité, erreurs applicatives, horodatages et traces d’audit.',
          'Données administratives : statut d’abonnement, paiements, factures, écoles clientes et contacts administratifs.',
        ],
      },
      {
        id: 'children',
        title: '4. Données des élèves mineurs et liens familiaux',
        paragraphs: [
          "Les données des élèves mineurs sont traitées uniquement pour des finalités scolaires attendues : suivi pédagogique, communication école-famille, présence, devoirs, documents et sécurité du compte.",
          "Un parent ne peut consulter que les informations des enfants qui lui sont liés par l'établissement. Si un lien parent-enfant est supprimé ou expire, l'accès du parent aux données de l'élève doit être retiré sans supprimer automatiquement les archives scolaires que l'établissement doit conserver.",
          "L'établissement doit vérifier l'autorité parentale, les droits de consultation et les situations particulières avant d'accorder ou de retirer un accès.",
        ],
      },
      {
        id: 'purposes',
        title: '5. Finalités et bases de traitement',
        paragraphs: [
          "Les données sont utilisées pour authentifier les utilisateurs, fournir les services scolaires, permettre la communication entre l'école et les familles, gérer les classes, produire des bulletins, suivre les absences, sécuriser la plateforme, assurer l'assistance technique, gérer les abonnements et respecter les obligations légales ou contractuelles applicables.",
          "Selon le contexte, les traitements peuvent reposer sur l'exécution du service demandé par l'établissement, l'intérêt légitime de sécurité et de continuité pédagogique, le respect d'obligations légales, ou le consentement lorsqu'il est requis par la loi ou la politique interne de l'établissement.",
          "Wasel Edu ne vend pas les données personnelles, n'utilise pas les données des élèves pour de la publicité comportementale et ne crée pas de profils commerciaux à partir des informations scolaires.",
        ],
      },
      {
        id: 'access',
        title: '6. Confidentialité, accès et séparation des profils',
        paragraphs: [
          "Les accès sont fondés sur les relations réelles dans la base de données : un enseignant voit les classes qu'il enseigne, un parent voit ses enfants liés, un élève voit ses propres informations, et l'administration agit dans le périmètre de son établissement.",
          "Les messages directs sont visibles uniquement par l'expéditeur et les destinataires désignés. Un autre parent ne doit pas pouvoir lire une conversation parent-enseignant. L'administration ne consulte pas un message privé sauf si elle fait partie des destinataires ou si une procédure exceptionnelle, documentée et autorisée par l'établissement le permet.",
          "Lorsqu'un utilisateur possède plusieurs profils, par exemple enseignant et parent dans le même établissement, l'interface doit imposer un espace actif pour éviter le mélange des contextes. Les droits serveur restent appliqués indépendamment du choix affiché dans l'interface.",
        ],
      },
      {
        id: 'sharing',
        title: '7. Destinataires et partage des données',
        paragraphs: [
          "Les données sont accessibles uniquement aux personnes et services qui en ont besoin pour une finalité scolaire, administrative, technique ou légale. Chaque accès doit rester proportionné au rôle de la personne et au contexte de l'établissement.",
        ],
        bullets: [
          "Établissements scolaires : direction, enseignants, administration, élèves et parents selon leurs relations autorisées.",
          'Prestataires techniques : hébergement, sauvegarde, envoi de notifications, journalisation, support et maintenance, avec accès limité aux besoins du service.',
          'Autorités compétentes : uniquement lorsque la loi, une décision officielle ou une demande juridiquement valable l’exige.',
          'Exports : les exports de données doivent être limités, tracés et remis uniquement aux personnes habilitées.',
        ],
      },
      {
        id: 'security',
        title: '8. Sécurité, audit et contrôle',
        paragraphs: [
          "Wasel Edu applique des mesures de protection adaptées aux données scolaires : chiffrement des échanges, mots de passe hachés, jetons d'authentification, séparation par établissement, contrôle d'accès basé sur les relations, limitation des privilèges, sauvegardes et surveillance des erreurs.",
          "Les actions sensibles doivent être auditées : création ou modification d'une note, correction d'une absence, consultation administrative exceptionnelle, changement de rôle, liaison ou suppression d'un parent, export, suppression, connexion suspecte et modification d'un paramètre de sécurité.",
          "Les journaux d'audit doivent indiquer au minimum l'utilisateur, l'établissement, l'action, la date, l'objet concerné, le résultat et, lorsque c'est pertinent, l'adresse IP ou l'appareil. Ces journaux servent à la sécurité, aux enquêtes internes, à la preuve de conformité et à la détection d'abus.",
        ],
      },
      {
        id: 'retention',
        title: '9. Conservation, suppression et archivage',
        paragraphs: [
          "Les données sont conservées pendant la durée nécessaire au service scolaire, à la sécurité, aux obligations administratives, comptables ou légales, puis supprimées, archivées ou anonymisées selon une procédure contrôlée.",
          "Lorsqu'un élève quitte un établissement, l'accès courant des parents, enseignants et élèves peut être désactivé, mais certains dossiers scolaires peuvent devoir rester archivés par l'établissement. Lorsqu'un parent est délié d'un élève, son accès doit être retiré, sans effacer les traces nécessaires à l'audit.",
          "Les demandes de suppression sont étudiées au cas par cas. Une suppression ne doit pas compromettre les obligations de l'établissement, la sécurité, les droits d'autres personnes ou la conservation légale de documents scolaires.",
        ],
      },
      {
        id: 'rights',
        title: '10. Droits des personnes concernées',
        paragraphs: [
          "Conformément à la loi algérienne n° 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, telle que modifiée et complétée, les personnes concernées peuvent demander des informations sur les traitements, l'accès à leurs données, la rectification des informations inexactes ou incomplètes, et l'opposition lorsque la loi le permet.",
          "Les demandes peuvent être adressées à l'établissement concerné ou à Wasel Edu via l'adresse de contact indiquée sur cette page. Une vérification d'identité peut être demandée avant toute communication, export, rectification ou suppression.",
          "Pour les données scolaires d'un mineur, Wasel Edu peut rediriger la demande vers l'établissement afin de vérifier le droit d'accès du parent ou du représentant légal.",
        ],
      },
      {
        id: 'notifications',
        title: '11. Notifications et préférences',
        paragraphs: [
          "Les notifications sont utilisées pour informer les utilisateurs d'événements scolaires importants : absence, retard, message, annonce, devoir, note, document ou alerte administrative.",
          "Les utilisateurs peuvent disposer de préférences de notification selon les réglages proposés par l'application. Certaines notifications strictement nécessaires au fonctionnement scolaire, à la sécurité ou à l'administration du compte peuvent rester actives même si les notifications non essentielles sont désactivées.",
          "Un enseignant ou un administrateur ne doit pas utiliser les notifications pour envoyer du contenu publicitaire, politique, discriminatoire ou sans lien avec la scolarité.",
        ],
      },
      {
        id: 'terms',
        title: "12. Conditions d'utilisation",
        paragraphs: [
          "Chaque utilisateur doit protéger ses identifiants, ne pas partager son compte, utiliser la plateforme uniquement pour des finalités scolaires légitimes et signaler toute erreur d'accès, message abusif, usurpation ou suspicion de fuite de données.",
          "Il est interdit de publier ou transmettre du contenu illicite, injurieux, discriminatoire, menaçant, contraire à l'ordre public, portant atteinte à la vie privée, ou sans lien avec la mission éducative.",
          "Wasel Edu ou l'établissement peut suspendre un compte, limiter une fonctionnalité ou supprimer un contenu lorsqu'il existe un risque de sécurité, une violation des règles, une demande officielle, une erreur de rattachement ou une utilisation abusive.",
        ],
      },
      {
        id: 'changes',
        title: '13. Modifications et contact',
        paragraphs: [
          "Cette politique peut être mise à jour pour refléter une évolution du service, une exigence légale, une demande d'établissement ou une amélioration de sécurité. La date de mise à jour indique la dernière version publiée.",
          "Pour toute question relative à la confidentialité, à la sécurité, aux droits des personnes ou à l'exercice d'une demande, contactez Wasel Edu à l'adresse indiquée en haut de cette page.",
        ],
      },
    ],
    referencesTitle: 'Références légales',
    referencesIntro:
      "Cette politique s'appuie notamment sur les informations publiques relatives à la loi algérienne n° 18-07 et sur les ressources de l'Autorité Nationale de Protection des Données à caractère Personnel.",
    references: [
      { label: 'Journal Officiel - loi 18-07', href: references.law18 },
      { label: 'Journal Officiel - loi 25-11', href: references.law25 },
      { label: 'Portail du Droit Algérien - loi 18-07', href: references.lawPortal },
      { label: 'ANPDP - portail officiel', href: references.anpdp },
      { label: 'ANPDP - notice et plaintes', href: references.notice },
    ],
  },
  ar: {
    back: 'رجوع',
    title: 'سياسة الخصوصية وحماية البيانات وشروط الاستخدام',
    intro:
      'توضح هذه الصفحة كيف تقوم Wasel Edu بجمع البيانات الشخصية واستخدامها وحمايتها والاحتفاظ بها ومشاركتها في سياق مدرسي. وهي موجهة للمؤسسات التعليمية والإدارة والمعلمين وأولياء الأمور والطلاب والمستخدمين المصرح لهم.',
    lastUpdatedLabel: 'آخر تحديث',
    hostingLabel: 'موقع الاستضافة المستهدف',
    contactLabel: 'التواصل بخصوص الخصوصية',
    hostingLocation: 'الجزائر',
    notice:
      'هذه الوثيقة نموذج عملي لشرح قواعد الخصوصية داخل المنصة. يجب مراجعتها وتكييفها من طرف مستشار قانوني قبل النشر الرسمي، خصوصا لتأكيد هوية مسؤول المعالجة، عنوان التواصل، مزود الاستضافة، مدد الاحتفاظ، والالتزامات الخاصة بكل مؤسسة.',
    sections: [
      {
        id: 'responsibilities',
        title: '1. هوية الخدمة والمسؤوليات',
        paragraphs: [
          'توفر Wasel Edu منصة للتواصل والمتابعة المدرسية، تشمل الحسابات والأقسام والرسائل والغيابات والدرجات والإشعارات والوثائق التربوية.',
          'عندما تستخدم مؤسسة تعليمية المنصة لإدارة بيانات طلابها وأولياء الأمور والطاقم التربوي، تبقى المؤسسة مسؤولة عن دقة البيانات التي تدخلها أو تعدلها أو تعتمدها. تعمل Wasel Edu كمزود تقني لتنفيذ تعليمات المؤسسة، إلا في بعض المعالجات المتعلقة بالأمن أو الفوترة أو إدارة المنصة أو الالتزامات القانونية.',
          'الوصول إلى المنصة مخصص للمستخدمين المصرح لهم فقط. لا ينبغي إنشاء حساب ولي أمر أو معلم أو طالب أو إداري دون تحقق من المؤسسة المعنية.',
        ],
      },
      {
        id: 'algeria',
        title: '2. تكييف المنصة مع السوق الجزائري',
        paragraphs: [
          'صممت Wasel Edu أساسا للمؤسسات التعليمية العاملة في الجزائر. يجب أن تبقى الواجهة والإشعارات والوثائق الموجهة للعائلات مفهومة بالعربية والفرنسية، مع مراعاة عادات المدارس الخاصة والعمومية محليا.',
          'يجب أن تستعمل الإعدادات التجارية والإدارية الدينار الجزائري للمبالغ والاشتراكات والوصولات. كما يجب أن تكون معلومات الفوترة قابلة للتكييف مع بيانات المؤسسة أو الكيان المشغل، مثل التسمية، العنوان، رقم التعريف الجبائي، رقم التعريف الإحصائي، السجل التجاري عند الاقتضاء، وبيانات التواصل.',
          'الإطار القانوني المستهدف هو القانون الجزائري المتعلق بحماية المعطيات الشخصية، ولا سيما القانون رقم 18-07 المؤرخ في 10 جوان 2018، المعدل والمتمم بالقانون رقم 25-11 المؤرخ في 24 جويلية 2025، إضافة إلى تعليمات وفضاءات السلطة الوطنية لحماية المعطيات ذات الطابع الشخصي.',
          'بالنسبة للسوق الجزائري، تفضل Wasel Edu الاستضافة والنسخ الاحتياطي داخل الجزائر عندما يكون ذلك متاحا ومثبتا تعاقديا. أي نقل أو وصول تقني من خارج الجزائر يجب أن يكون محددا وموثقا ومحدودا ومؤطرا حسب المتطلبات المطبقة.',
        ],
        bullets: [
          'سجل المعالجات: إعداد خريطة للمعالجات المدرسية، فئات البيانات، المستلمين، مدد الاحتفاظ وتدابير الأمن.',
          'مكلف أو ممثل لحماية المعطيات: تعيين شخص يمكن التواصل معه بخصوص الخصوصية وطلبات ممارسة الحقوق والحوادث.',
          'السلطة الوطنية لحماية المعطيات: التحقق مما إذا كان التصريح أو الإجراء أو الترخيص أو التحديث مطلوبا قبل الإطلاق أو عند أي تغيير مهم.',
          'العقود مع المدارس: توضيح مسؤوليات المؤسسة و Wasel Edu وأي معالج تقني من الباطن.',
        ],
      },
      {
        id: 'data',
        title: '3. البيانات الشخصية المعالجة',
        paragraphs: [
          'تقتصر Wasel Edu على البيانات الضرورية لتشغيل الخدمة المدرسية وحماية الحسابات. قد تختلف البيانات حسب الوحدات التي تفعلها المؤسسة.',
        ],
        bullets: [
          'الهوية والحساب: الاسم، البريد الإلكتروني، المعرف الداخلي، اللغة، صورة الملف الشخصي، الدور النشط، حالة الحساب ومعلومات الدخول.',
          'العلاقات المدرسية: المؤسسة، الأقسام، المواد، المعلمون، الطلاب، روابط ولي الأمر بالطالب ومدة صلاحية هذه الروابط.',
          'البيانات التربوية: الدرجات، التقييمات، الكشوف، الملاحظات، الواجبات، الملفات المرفقة وسجل التعديلات.',
          'الحياة المدرسية: الحضور، الغياب، التأخر، التبريرات، الإشعارات وقرارات التصحيح أو القبول.',
          'التواصل: الرسائل، الإعلانات، المستلمون، التواريخ، الملفات المرفقة، البلاغات ومعلومات الإشراف المصرح به.',
          'البيانات التقنية: سجلات الدخول، الجهاز، عنوان IP، المتصفح، أحداث الأمان، الأخطاء، الطوابع الزمنية وآثار التدقيق.',
        ],
      },
      {
        id: 'children',
        title: '4. بيانات الطلاب القصر والروابط العائلية',
        paragraphs: [
          'تعالج بيانات الطلاب القصر فقط لأغراض مدرسية متوقعة مثل المتابعة التربوية، التواصل بين المدرسة والعائلة، الحضور، الواجبات، الوثائق وأمان الحساب.',
          'لا يمكن لولي الأمر الاطلاع إلا على بيانات الأطفال المرتبطين به من طرف المؤسسة. عند حذف الرابط أو انتهاء صلاحيته، يجب إيقاف الوصول دون حذف الأرشيف المدرسي الذي قد تحتاج المؤسسة إلى الاحتفاظ به.',
          'على المؤسسة التحقق من السلطة الأبوية وحقوق الاطلاع والحالات الخاصة قبل منح أو سحب الوصول.',
        ],
      },
      {
        id: 'purposes',
        title: '5. أغراض المعالجة وأساسها',
        paragraphs: [
          'تستخدم البيانات للمصادقة، تقديم الخدمات المدرسية، إدارة الأقسام، التواصل، إعداد الكشوف، متابعة الغياب، حماية المنصة، الدعم التقني، إدارة الاشتراكات، والوفاء بالالتزامات القانونية أو التعاقدية.',
          'حسب الحالة، يمكن أن تستند المعالجة إلى تنفيذ الخدمة المطلوبة من المؤسسة، المصلحة المشروعة في الأمن واستمرارية الخدمة، الالتزام القانوني، أو الموافقة عندما تكون مطلوبة.',
          'لا تبيع Wasel Edu البيانات الشخصية، ولا تستخدم بيانات الطلاب للإعلانات السلوكية أو لإنشاء ملفات تجارية.',
        ],
      },
      {
        id: 'access',
        title: '6. السرية والوصول وفصل الملفات',
        paragraphs: [
          'تعتمد الصلاحيات على العلاقات الحقيقية في قاعدة البيانات: يرى المعلم الأقسام التي يدرسها، ويرى ولي الأمر أطفاله المرتبطين، ويرى الطالب معلوماته الخاصة، وتعمل الإدارة داخل نطاق مؤسستها.',
          'الرسائل المباشرة مرئية فقط للمرسل والمستلمين المحددين. يجب ألا يتمكن ولي أمر آخر من قراءة محادثة بين ولي أمر ومعلم. لا تطلع الإدارة على رسالة خاصة إلا إذا كانت ضمن المستلمين أو وفق إجراء استثنائي موثق ومصرح به من المؤسسة.',
          'إذا كان للمستخدم أكثر من صفة، مثل معلم وولي أمر، يجب أن تفرض الواجهة مساحة نشطة لمنع اختلاط السياقات، مع استمرار تطبيق الصلاحيات على مستوى الخادم.',
        ],
      },
      {
        id: 'sharing',
        title: '7. المستلمون ومشاركة البيانات',
        paragraphs: [
          'لا تكون البيانات متاحة إلا للأشخاص أو الخدمات التي تحتاج إليها لغرض مدرسي أو إداري أو تقني أو قانوني، وبقدر يتناسب مع الدور والسياق.',
        ],
        bullets: [
          'المؤسسة التعليمية: الإدارة، المعلمون، الموظفون، الطلاب وأولياء الأمور حسب الصلاحيات.',
          'المزودون التقنيون: الاستضافة، النسخ الاحتياطي، الإشعارات، السجلات، الدعم والصيانة مع تقييد الوصول.',
          'السلطات المختصة: فقط عند وجود التزام قانوني أو طلب رسمي صالح.',
          'التصدير: يجب أن يكون محدودا، موثقا، وموجها للأشخاص المخولين فقط.',
        ],
      },
      {
        id: 'security',
        title: '8. الأمن والتدقيق والرقابة',
        paragraphs: [
          'تطبق Wasel Edu تدابير حماية مناسبة للبيانات المدرسية، مثل تشفير الاتصالات، تجزئة كلمات المرور، رموز المصادقة، العزل حسب المؤسسة، التحكم في الوصول، الحد من الصلاحيات، النسخ الاحتياطي ومراقبة الأخطاء.',
          'يجب تدقيق العمليات الحساسة مثل تعديل درجة، تصحيح غياب، تغيير دور، ربط أو حذف ولي أمر، تصدير بيانات، حذف سجل، دخول مشبوه، أو تغيير إعداد أمني.',
          'يجب أن تتضمن سجلات التدقيق المستخدم، المؤسسة، العملية، التاريخ، الكائن المتأثر، النتيجة، وعند الحاجة عنوان IP أو الجهاز.',
        ],
      },
      {
        id: 'retention',
        title: '9. الاحتفاظ والحذف والأرشفة',
        paragraphs: [
          'تحتفظ المنصة بالبيانات طوال المدة اللازمة للخدمة المدرسية أو الأمن أو الالتزامات الإدارية أو المحاسبية أو القانونية، ثم يتم حذفها أو أرشفتها أو إخفاء هويتها وفق إجراء مضبوط.',
          'عند انتقال طالب أو مغادرته، يمكن تعطيل الوصول الحالي، لكن قد تبقى بعض الملفات المدرسية مؤرشفة لدى المؤسسة. وعند فك ربط ولي أمر، يسحب الوصول دون حذف الآثار الضرورية للتدقيق.',
          'تدرس طلبات الحذف حسب الحالة، ولا يجب أن تمس بالتزامات المؤسسة أو الأمن أو حقوق الآخرين أو متطلبات الحفظ القانونية.',
        ],
      },
      {
        id: 'rights',
        title: '10. حقوق الأشخاص المعنيين',
        paragraphs: [
          'وفقا للقانون الجزائري رقم 18-07 المتعلق بحماية الأشخاص الطبيعيين في معالجة البيانات ذات الطابع الشخصي، كما عُدل وتمم، يمكن للأشخاص المعنيين طلب معلومات حول المعالجة، الوصول إلى بياناتهم، تصحيح البيانات غير الدقيقة أو غير المكتملة، والاعتراض عندما يسمح القانون بذلك.',
          'يمكن إرسال الطلبات إلى المؤسسة المعنية أو إلى Wasel Edu عبر عنوان التواصل في هذه الصفحة. قد يطلب التحقق من الهوية قبل أي اطلاع أو تصدير أو تصحيح أو حذف.',
          'بالنسبة لبيانات طالب قاصر، يمكن لـ Wasel Edu تحويل الطلب إلى المؤسسة للتحقق من حق ولي الأمر أو الممثل القانوني.',
        ],
      },
      {
        id: 'notifications',
        title: '11. الإشعارات والتفضيلات',
        paragraphs: [
          'تستخدم الإشعارات لإبلاغ المستخدمين بأحداث مدرسية مهمة مثل الغياب، التأخر، الرسائل، الإعلانات، الواجبات، الدرجات، الوثائق أو التنبيهات الإدارية.',
          'يمكن للمستخدمين ضبط بعض تفضيلات الإشعارات حسب ما توفره المنصة. وقد تبقى الإشعارات الضرورية للحساب أو الأمن أو الخدمة المدرسية مفعلة.',
          'لا يجوز استخدام الإشعارات لمحتوى إعلاني أو سياسي أو تمييزي أو غير مرتبط بالتمدرس.',
        ],
      },
      {
        id: 'terms',
        title: '12. شروط الاستخدام',
        paragraphs: [
          'يجب على كل مستخدم حماية بيانات الدخول، عدم مشاركة الحساب، استخدام المنصة لأغراض مدرسية مشروعة فقط، والإبلاغ عن أي خطأ وصول أو إساءة أو انتحال أو تسريب محتمل.',
          'يحظر نشر أو إرسال محتوى غير قانوني أو مسيء أو تمييزي أو مهدد أو مخالف للنظام العام أو ماس بالخصوصية أو غير مرتبط بالمهمة التعليمية.',
          'يمكن لـ Wasel Edu أو المؤسسة تعليق حساب أو تقييد ميزة أو حذف محتوى عند وجود خطر أمني أو مخالفة أو طلب رسمي أو خطأ ربط أو استخدام تعسفي.',
        ],
      },
      {
        id: 'changes',
        title: '13. التعديلات والتواصل',
        paragraphs: [
          'يمكن تحديث هذه السياسة لتعكس تطور الخدمة أو متطلبا قانونيا أو طلب مؤسسة أو تحسينات أمنية. يشير تاريخ التحديث إلى آخر نسخة منشورة.',
          'لأي سؤال حول الخصوصية أو الأمن أو حقوق الأشخاص أو ممارسة طلب، يرجى التواصل مع Wasel Edu عبر العنوان المذكور أعلى الصفحة.',
        ],
      },
    ],
    referencesTitle: 'مراجع قانونية',
    referencesIntro:
      'تعتمد هذه السياسة خصوصا على المعلومات العامة المتعلقة بالقانون الجزائري رقم 18-07 وموارد السلطة الوطنية لحماية المعطيات ذات الطابع الشخصي.',
    references: [
      { label: 'الجريدة الرسمية - القانون 18-07', href: references.law18 },
      { label: 'الجريدة الرسمية - القانون 25-11', href: references.law25 },
      { label: 'بوابة القانون الجزائري - القانون 18-07', href: references.lawPortal },
      { label: 'السلطة الوطنية لحماية المعطيات - البوابة الرسمية', href: references.anpdp },
      { label: 'السلطة الوطنية لحماية المعطيات - الإشعار والشكاوى', href: references.notice },
    ],
  },
  en: {
    back: 'Back',
    title: 'Privacy policy, data protection and terms of use',
    intro:
      'This page explains how Wasel Edu collects, uses, protects, retains and shares personal data processed in a school environment. It is intended for schools, administrators, teachers, parents, students and authorized platform users.',
    lastUpdatedLabel: 'Last updated',
    hostingLabel: 'Target hosting location',
    contactLabel: 'Privacy contact',
    hostingLocation: 'Algeria',
    notice:
      'This document is an operational template for explaining the platform privacy rules. It must be reviewed and adapted by legal counsel before official publication, especially to confirm the data controller identity, contact address, hosting provider, retention periods and obligations specific to each school.',
    sections: [
      {
        id: 'responsibilities',
        title: '1. Service identity and responsibilities',
        paragraphs: [
          'Wasel Edu provides a school communication and student monitoring platform for accounts, classes, messages, attendance, grades, notifications and educational documents.',
          'When a school uses Wasel Edu for its students, families and staff, the school remains responsible for the accuracy of the data it imports, validates or changes. Wasel Edu acts as a technical provider following the school’s instructions, except where it processes data for security, billing, platform administration or legal compliance.',
          'Platform access is limited to authorized users. Parent, teacher, student and staff accounts should not be freely created by the public without validation by the relevant school.',
        ],
      },
      {
        id: 'algeria',
        title: '2. Algerian market adaptation',
        paragraphs: [
          'Wasel Edu is designed first for schools operating in Algeria. The interface, notifications and family-facing documents should remain understandable in Arabic and French, with attention to local operating habits in private and public schools.',
          'Commercial and administrative settings should use Algerian dinars for amounts, subscriptions and receipts. Billing information should be adaptable to the school or operating entity, including legal name, address, tax identification, statistical identification, commercial register information where applicable, and contact details.',
          'The target compliance framework is Algerian personal data law, including Law No. 18-07 of June 10, 2018, as amended and supplemented by Law No. 25-11 of July 24, 2025, together with the guidance and portals of the National Personal Data Protection Authority.',
          'For the Algerian market, Wasel Edu prioritizes hosting and backups located in Algeria where available and contractually selected. Any transfer or technical access from outside Algeria should be identified, documented, limited and governed under applicable requirements.',
        ],
        bullets: [
          'Processing register: maintain a map of school processing activities, data categories, recipients, retention periods and security measures.',
          'Privacy representative or data protection officer: designate a reachable person for privacy questions, rights requests and incidents.',
          'ANPDP: verify whether a declaration, formality, authorization or update is required before launch or after a major change.',
          'School-platform contracts: define the responsibilities of the school, Wasel Edu and any technical processors.',
        ],
      },
      {
        id: 'data',
        title: '3. Personal data processed',
        paragraphs: [
          'Wasel Edu limits collection to data needed for school operations and service security. The exact data depends on the modules enabled by each school.',
        ],
        bullets: [
          'Identity and account data: name, email, internal identifier, preferred language, profile picture, active role, account status and sign-in information.',
          'School relationships: school, classes, subjects, assigned teachers, enrolled students, parent-child links and relationship validity periods.',
          'Academic data: grades, evaluations, report cards, comments, homework, educational attachments and change history.',
          'Attendance data: presence, absences, lateness, justifications, related notifications and correction or approval decisions.',
          'Communication data: messages, announcements, recipients, dates, delivery/read information, attachments, reports and information needed for authorized moderation.',
          'Technical data: login logs, device, IP address, browser, security events, application errors, timestamps and audit records.',
          'Administrative data: subscription status, payments, invoices, customer schools and administrative contacts.',
        ],
      },
      {
        id: 'children',
        title: '4. Children’s data and family links',
        paragraphs: [
          'Data about minor students is processed only for expected school purposes: academic monitoring, school-family communication, attendance, homework, documents and account security.',
          'A parent can view only the children linked to that parent by the school. If a parent-child link is removed or expires, the parent’s access must be withdrawn without automatically deleting school records that the school may need to keep.',
          'The school must verify parental authority, access rights and special family situations before granting or removing access.',
        ],
      },
      {
        id: 'purposes',
        title: '5. Purposes and lawful basis',
        paragraphs: [
          'Data is used to authenticate users, provide school services, enable school-family communication, manage classes, produce reports, track attendance, secure the platform, provide support, manage subscriptions and meet applicable legal or contractual obligations.',
          'Depending on the context, processing may rely on performance of the school service, legitimate security and educational continuity interests, legal obligations, or consent where required by law or school policy.',
          'Wasel Edu does not sell personal data, use student data for behavioral advertising, or build commercial profiles from school information.',
        ],
      },
      {
        id: 'access',
        title: '6. Confidentiality, access and profile separation',
        paragraphs: [
          'Access is based on real database relationships: teachers see the classes they teach, parents see their linked children, students see their own information, and administrators act within their school scope.',
          'Direct messages are visible only to the sender and designated recipients. Another parent must not be able to read a parent-teacher conversation. Administration does not read a private message unless it is a recipient or an exceptional, documented school-authorized process applies.',
          'When a user has multiple profiles, such as teacher and parent, the interface must require an active workspace to prevent context mixing. Server-side permissions remain enforced regardless of the displayed workspace.',
        ],
      },
      {
        id: 'sharing',
        title: '7. Recipients and data sharing',
        paragraphs: [
          'Data is available only to people and services that need it for a school, administrative, technical or legal purpose. Access must remain proportionate to the person’s role and school context.',
        ],
        bullets: [
          'Schools: directors, teachers, administration, students and parents according to authorized relationships.',
          'Technical providers: hosting, backup, notifications, logging, support and maintenance with access limited to service needs.',
          'Competent authorities: only where required by law, official decision or legally valid request.',
          'Exports: exports must be limited, logged and provided only to authorized people.',
        ],
      },
      {
        id: 'security',
        title: '8. Security, audit and control',
        paragraphs: [
          'Wasel Edu applies safeguards suitable for school data: encrypted transport, hashed passwords, authentication tokens, tenant isolation by school, relationship-based access control, least privilege, backups and error monitoring.',
          'Sensitive actions should be audited, including grade creation or changes, attendance corrections, exceptional administrative access, role changes, parent linking or removal, exports, deletion, suspicious login and security setting changes.',
          'Audit logs should include at least the user, school, action, date, affected object, result and, where relevant, IP address or device. These logs support security, internal investigations, compliance evidence and abuse detection.',
        ],
      },
      {
        id: 'retention',
        title: '9. Retention, deletion and archiving',
        paragraphs: [
          'Data is retained for as long as needed for school service, security, administrative, accounting or legal obligations, then deleted, archived or anonymized through a controlled procedure.',
          'When a student leaves a school, current access may be disabled while some school records remain archived by the school. When a parent is unlinked from a student, access must be removed without erasing audit records required for accountability.',
          'Deletion requests are reviewed case by case. Deletion must not undermine school obligations, security, other people’s rights or legal retention requirements.',
        ],
      },
      {
        id: 'rights',
        title: '10. Data subject rights',
        paragraphs: [
          'Under Algerian Law No. 18-07 on the protection of individuals in personal data processing, as amended and supplemented, data subjects may request information about processing, access to their data, correction of inaccurate or incomplete data, and objection where the law allows.',
          'Requests can be sent to the relevant school or to Wasel Edu using the contact address on this page. Identity verification may be required before disclosure, export, correction or deletion.',
          'For school data concerning a minor, Wasel Edu may redirect the request to the school so it can verify the parent or legal representative’s access rights.',
        ],
      },
      {
        id: 'notifications',
        title: '11. Notifications and preferences',
        paragraphs: [
          'Notifications are used to inform users about important school events: absence, lateness, message, announcement, homework, grade, document or administrative alert.',
          'Users may have notification preferences depending on the settings provided by the application. Notifications strictly required for account administration, security or school service may remain active even if non-essential notifications are disabled.',
          'Teachers and administrators must not use notifications for advertising, political, discriminatory or non-school-related content.',
        ],
      },
      {
        id: 'terms',
        title: '12. Terms of use',
        paragraphs: [
          'Each user must protect credentials, avoid account sharing, use the platform only for legitimate school purposes and report access mistakes, abusive messages, impersonation or suspected data leaks.',
          'It is prohibited to publish or transmit unlawful, abusive, discriminatory, threatening, public-order violating, privacy-infringing or non-educational content.',
          'Wasel Edu or the school may suspend an account, limit a feature or remove content when there is a security risk, rule violation, official request, relationship error or abusive use.',
        ],
      },
      {
        id: 'changes',
        title: '13. Changes and contact',
        paragraphs: [
          'This policy may be updated to reflect service changes, legal requirements, school requests or security improvements. The update date shows the latest published version.',
          'For privacy, security, rights or request questions, contact Wasel Edu using the address shown at the top of this page.',
        ],
      },
    ],
    referencesTitle: 'Legal references',
    referencesIntro:
      'This policy is based in particular on public information about Algerian Law No. 18-07 and resources from the National Personal Data Protection Authority.',
    references: [
      { label: 'Official Gazette - Law 18-07', href: references.law18 },
      { label: 'Official Gazette - Law 25-11', href: references.law25 },
      { label: 'Algerian Law Portal - Law 18-07', href: references.lawPortal },
      { label: 'ANPDP - official portal', href: references.anpdp },
      { label: 'ANPDP - notice and complaints', href: references.notice },
    ],
  },
};

export default function LegalPolicies() {
  const { locale, setLocale, t } = useLocale();
  const content = policyCopy[locale] ?? policyCopy.fr;
  const lastUpdated = lastUpdatedAt.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="policy-page">
      <div className="policy-shell">
        <div className="policy-topbar">
          <Link to="/login" className="policy-back">
            {content.back}
          </Link>
          <label className="policy-language">
            <span>{t('language.label')}</span>
            <select
              value={locale}
              aria-label={t('language.label')}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              {locales.map((localeOption) => (
                <option key={localeOption} value={localeOption}>
                  {t(`language.${localeOption}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <article className="policy-document" aria-labelledby="policy-title">
          <header className="policy-document-header">
            <p className="policy-kicker">{legalEntity}</p>
            <h1 id="policy-title">{content.title}</h1>
            <p>{content.intro}</p>
            <dl className="policy-meta-list">
              <div>
                <dt>{content.lastUpdatedLabel}</dt>
                <dd>{lastUpdated}</dd>
              </div>
              <div>
                <dt>{content.hostingLabel}</dt>
                <dd>{content.hostingLocation}</dd>
              </div>
              <div>
                <dt>{content.contactLabel}</dt>
                <dd>
                  <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
                </dd>
              </div>
            </dl>
          </header>

          <section className="policy-notice" aria-label={t('common.important')}>
            <p>{content.notice}</p>
          </section>

          {content.sections.map((section) => (
            <section className="policy-section" key={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="policy-text-list">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <section className="policy-section">
            <h2>{content.referencesTitle}</h2>
            <p>{content.referencesIntro}</p>
            <ul className="policy-links">
              {content.references.map((reference) => (
                <li key={reference.href}>
                  <a href={reference.href} target="_blank" rel="noreferrer">
                    {reference.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
