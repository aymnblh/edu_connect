import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../features/auth/data/models/child_model.dart';
import '../../../../features/auth/presentation/providers/children_provider.dart';
import 'shimmer_loading.dart';

/// A horizontal child-switcher bar shown at the top of parent-facing screens.
///
/// Usage:
/// ```dart
/// Column(children: [
///   const ChildSwitcherBar(),
///   // rest of your screen content
/// ]);
/// ```
///
/// The selected child is available via:
/// ```dart
/// ref.watch(selectedChildProvider)
/// ```
class ChildSwitcherBar extends ConsumerWidget {
  const ChildSwitcherBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final childrenAsync = ref.watch(myChildrenProvider);

    return childrenAsync.when(
      loading: () => const _ChildSwitcherLoading(),
      error: (_, __) => const SizedBox.shrink(),
      data: (children) {
        if (children.isEmpty) return const SizedBox.shrink();

        // Auto-select first child on first load
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ref.read(selectedChildProvider.notifier).initWithChildren(children);
        });

        // Only 1 child → no need for switcher UI
        if (children.length == 1) return const SizedBox.shrink();

        final selected = ref.watch(selectedChildProvider);

        return Container(
          height: 80,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            border: Border(
              bottom:
                  BorderSide(color: Theme.of(context).dividerColor, width: 1),
            ),
          ),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: children.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final child = children[index];
              final isSelected = selected?.id == child.id;

              return _ChildChip(
                child: child,
                isSelected: isSelected,
                onTap: () =>
                    ref.read(selectedChildProvider.notifier).select(child),
              ).animate(key: ValueKey(child.id)).fadeIn(delay: (50 * index).ms);
            },
          ),
        );
      },
    );
  }
}

class _ChildSwitcherLoading extends StatelessWidget {
  const _ChildSwitcherLoading();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 80,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        itemCount: 3,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, __) => const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ShimmerAvatar(size: 28),
            SizedBox(width: 8),
            ShimmerBox(width: 72, height: 16, borderRadius: 8),
          ],
        ),
      ),
    );
  }
}

class _ChildChip extends StatelessWidget {
  final ChildModel child;
  final bool isSelected;
  final VoidCallback onTap;

  const _ChildChip({
    required this.child,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOutCubic,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(40),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? colorScheme.primary
                : colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(40),
            border: Border.all(
              color:
                  isSelected ? colorScheme.primary : colorScheme.outlineVariant,
              width: 1.5,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: colorScheme.primary.withValues(alpha: 0.25),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: isSelected
                    ? colorScheme.onPrimary.withValues(alpha: 0.25)
                    : colorScheme.primary.withValues(alpha: 0.12),
                child: Text(
                  child.initials,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: isSelected
                        ? colorScheme.onPrimary
                        : colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                child.fullName.split(' ').first, // show first name only
                style: TextStyle(
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  fontSize: 14,
                  color: isSelected
                      ? colorScheme.onPrimary
                      : colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
