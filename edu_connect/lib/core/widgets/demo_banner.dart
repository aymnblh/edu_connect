import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/providers/auth_provider.dart';

/// A strip above every screen of the public demo: what it is, and the way out.
class DemoBanner extends ConsumerWidget {
  final Widget child;

  const DemoBanner({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).valueOrNull;
    if (user == null || !user.isDemo) return child;
    final code = Localizations.localeOf(context).languageCode;
    String pick(String ar, String fr, String en) =>
        code == 'ar' ? ar : (code == 'fr' ? fr : en);
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Material(
          color: scheme.primaryContainer,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 4, 6),
              child: Row(
                children: [
                  Icon(Icons.visibility_outlined,
                      size: 18, color: scheme.onPrimaryContainer),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      pick(
                          'عرض تجريبي: مدرسة وهمية، لا يُحفظ أي شيء.',
                          'Demo : ecole fictive, rien n\'est enregistre.',
                          'Demo: a sample school, nothing is saved.'),
                      style: TextStyle(
                          color: scheme.onPrimaryContainer, fontSize: 13),
                    ),
                  ),
                  TextButton(
                    onPressed: () =>
                        ref.read(authNotifierProvider.notifier).signOut(),
                    child: Text(pick('خروج', 'Quitter', 'Leave')),
                  ),
                ],
              ),
            ),
          ),
        ),
        // The banner already covers the top inset.
        Expanded(
          child: MediaQuery.removePadding(
              context: context, removeTop: true, child: child),
        ),
      ],
    );
  }
}
