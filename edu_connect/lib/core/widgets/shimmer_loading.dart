import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_theme.dart';

/// A single shimmer rectangle with configurable width/height/borderRadius.
class ShimmerBox extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 8,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Shimmer.fromColors(
      baseColor: colors.shimmerBase,
      highlightColor: colors.shimmerHighlight,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: colors.shimmerBase,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

/// A theme-aware circular avatar placeholder.
class ShimmerAvatar extends StatelessWidget {
  final double size;
  final double borderRadius;

  const ShimmerAvatar({
    super.key,
    this.size = 44,
    this.borderRadius = 999,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Shimmer.fromColors(
      baseColor: colors.shimmerBase,
      highlightColor: colors.shimmerHighlight,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: colors.shimmerBase,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

/// A card-shaped shimmer placeholder.
class ShimmerCard extends StatelessWidget {
  final double height;

  const ShimmerCard({super.key, this.height = 100});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Shimmer.fromColors(
      baseColor: colors.shimmerBase,
      highlightColor: colors.shimmerHighlight,
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: colors.shimmerBase,
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

/// A list tile shimmer with avatar circle + text lines.
class ShimmerListTile extends StatelessWidget {
  final bool showAvatar;
  final double avatarSize;
  final EdgeInsetsGeometry padding;

  const ShimmerListTile({
    super.key,
    this.showAvatar = true,
    this.avatarSize = 44,
    this.padding = const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Shimmer.fromColors(
      baseColor: colors.shimmerBase,
      highlightColor: colors.shimmerHighlight,
      child: Padding(
        padding: padding,
        child: Row(
          children: [
            if (showAvatar) ...[
              Container(
                width: avatarSize,
                height: avatarSize,
                decoration: BoxDecoration(
                  color: colors.shimmerBase,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 14,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: colors.shimmerBase,
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 12,
                    width: 140,
                    decoration: BoxDecoration(
                      color: colors.shimmerBase,
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A configurable vertical list skeleton for list-heavy screens.
class ShimmerList extends StatelessWidget {
  final int itemCount;
  final EdgeInsetsGeometry padding;
  final bool showAvatar;
  final bool shrinkWrap;
  final ScrollPhysics? physics;

  const ShimmerList({
    super.key,
    this.itemCount = 6,
    this.padding = const EdgeInsets.all(16),
    this.showAvatar = true,
    this.shrinkWrap = false,
    this.physics,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: padding,
      shrinkWrap: shrinkWrap,
      physics: physics,
      itemCount: itemCount,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, __) => ShimmerListTile(showAvatar: showAvatar),
    );
  }
}

/// Chat/message loading skeleton with alternating bubble widths.
class ShimmerMessageList extends StatelessWidget {
  final int itemCount;

  const ShimmerMessageList({super.key, this.itemCount = 8});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Shimmer.fromColors(
      baseColor: colors.shimmerBase,
      highlightColor: colors.shimmerHighlight,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        itemCount: itemCount,
        itemBuilder: (context, index) {
          final isMe = index.isOdd;
          final widthFactor = isMe ? 0.58 : 0.72;
          return Align(
            alignment: isMe
                ? AlignmentDirectional.centerEnd
                : AlignmentDirectional.centerStart,
            child: Container(
              width: MediaQuery.sizeOf(context).width * widthFactor,
              height: index % 3 == 0 ? 64 : 44,
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: colors.shimmerBase,
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// A full dashboard loading skeleton (3 KPI cards + list items).
class ShimmerDashboard extends StatelessWidget {
  const ShimmerDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Shimmer.fromColors(
      baseColor: colors.shimmerBase,
      highlightColor: colors.shimmerHighlight,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header shimmer
            Container(
              height: 70,
              decoration: BoxDecoration(
                color: colors.shimmerBase,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            const SizedBox(height: 16),
            // 3 KPI cards
            Row(
              children: List.generate(
                3,
                (index) => Expanded(
                  child: Container(
                    margin: EdgeInsetsDirectional.only(
                      end: index < 2 ? 8 : 0,
                    ),
                    height: 80,
                    decoration: BoxDecoration(
                      color: colors.shimmerBase,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // Chart placeholder
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: colors.shimmerBase,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            const SizedBox(height: 20),
            // List items
            ...List.generate(
              4,
              (index) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: colors.shimmerBase,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            height: 14,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: colors.shimmerBase,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 12,
                            width: 100,
                            decoration: BoxDecoration(
                              color: colors.shimmerBase,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
