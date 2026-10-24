import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'director_repository.dart';

/// "Get your school started" on the director's phone: progress and what is left.
class SetupChecklistCard extends ConsumerWidget {
  const SetupChecklistCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(setupStatusProvider).valueOrNull;
    if (status == null || !status.visible) return const SizedBox.shrink();
    final code = Localizations.localeOf(context).languageCode;
    String pick(String ar, String fr, String en) =>
        code == 'ar' ? ar : (code == 'fr' ? fr : en);
    String label(String key) => switch (key) {
          'logo' => pick('شعار المدرسة', "Logo de l'ecole", 'School logo'),
          'trimesters' => pick('الفصول', 'Trimestres', 'Trimesters'),
          'classes' => pick('الأقسام', 'Classes', 'Classes'),
          'subjects' => pick('المواد', 'Matieres', 'Subjects'),
          'students' => pick('التلاميذ في أقسامهم', 'Eleves places en classe',
              'Students in classes'),
          'teachers' => pick('الأساتذة', 'Enseignants', 'Teachers'),
          'assignments' =>
            pick('إسناد المواد', 'Matieres attribuees', 'Subjects assigned'),
          'parents' =>
            pick('الأولياء المتصلون', 'Parents connectes', 'Parents connected'),
          _ => key,
        };
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
                pick('انطلاق مدرستك', 'Demarrer votre ecole',
                    'Get your school started'),
                style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            LinearProgressIndicator(
                value: status.total == 0 ? 0 : status.completed / status.total,
                minHeight: 8,
                borderRadius: BorderRadius.circular(4)),
            const SizedBox(height: 8),
            for (final step in status.steps)
              Row(children: [
                Icon(
                    step.done
                        ? Icons.check_circle_outline
                        : Icons.radio_button_unchecked,
                    size: 18,
                    color: step.done ? theme.colorScheme.primary : null),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(step.total == null
                        ? label(step.key)
                        : '${label(step.key)} (${step.count}/${step.total})')),
              ]),
            const SizedBox(height: 8),
            Text(
                pick(
                    'أكمل هذه الخطوات من نسخة الويب (الاستيراد، الطباعة).',
                    'Terminez ces etapes depuis la version web (import, impression).',
                    'Finish these steps on the web (import, printing).'),
                style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
