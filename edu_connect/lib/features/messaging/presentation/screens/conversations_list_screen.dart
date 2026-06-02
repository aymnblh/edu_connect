import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:ui';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../providers/dm_provider.dart';
import '../../data/models/conversation_model.dart';
import '../../data/repositories/dm_repository.dart';

class ConversationsListScreen extends ConsumerWidget {
  const ConversationsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(conversationsProvider);
    final authUser = ref.watch(authNotifierProvider).valueOrNull;
    final text = _MessagingText.of(context);
    final currentUserId = authUser?.id ?? '';
    final roleString = authUser?.role.name ?? '';
    final colors = Theme.of(context).extension<AppColors>()!;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      floatingActionButton: _buildFab(context, ref, roleString, colors),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          _buildAppBar(context, ref, text, colors),
          SliverFillRemaining(
            child: _buildBody(context, ref, state, currentUserId, colors),
          ),
        ],
      ),
    );
  }

  SliverAppBar _buildAppBar(BuildContext context, WidgetRef ref,
      _MessagingText text, AppColors colors) {
    final theme = Theme.of(context);
    return SliverAppBar(
      backgroundColor: theme.scaffoldBackgroundColor,
      surfaceTintColor: theme.colorScheme.surface.withValues(alpha: 0),
      elevation: 0,
      pinned: true,
      centerTitle: false,
      scrolledUnderElevation: 0,
      title: Text(
        text.title,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSurface,
          fontWeight: FontWeight.w800,
          fontSize: 26,
        ),
      ).animate().fadeIn(duration: 400.ms).slideX(begin: -0.1),
      actions: [
        Padding(
          padding: const EdgeInsetsDirectional.only(end: 8),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colors.cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colors.cardBorder),
            ),
            child: IconButton(
              icon: Icon(Icons.refresh_rounded, color: colors.tealDark),
              tooltip: text.title,
              onPressed: () => ref.read(conversationsProvider.notifier).load(),
            ),
          ),
        ).animate().fadeIn(delay: 200.ms),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    ConversationsState state,
    String currentUserId,
    AppColors colors,
  ) {
    if (state.isLoading) {
      return const ShimmerList(
        itemCount: 7,
        padding: EdgeInsets.fromLTRB(16, 8, 16, 100),
      );
    }

    if (state.error != null) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: colors.dangerRed.withValues(alpha: 0.10),
                shape: BoxShape.circle,
              ),
              child:
                  Icon(Icons.error_outline, color: colors.dangerRed, size: 48),
            ).animate().scale(delay: 100.ms, curve: Curves.easeOutBack),
            const SizedBox(height: 24),
            Text(
              state.error!,
              textAlign: TextAlign.center,
              style: TextStyle(color: colors.mutedText, fontSize: 16),
            ).animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => ref.read(conversationsProvider.notifier).load(),
              child: Text(_MessagingText.of(context).retry),
            ).animate().fadeIn(delay: 300.ms),
          ],
        ),
      );
    }

    if (state.conversations.isEmpty) {
      return Center(
        child: Container(
          margin: const EdgeInsets.all(24),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          decoration: BoxDecoration(
            color: colors.cardBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: colors.cardBorder),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: colors.tealLight,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.chat_bubble_outline_rounded,
                    size: 56, color: colors.tealDark),
              ).animate().scale(curve: Curves.easeOutBack, duration: 600.ms),
              const SizedBox(height: 24),
              Text(
                _MessagingText.of(context).emptyTitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2),
              const SizedBox(height: 8),
              Text(
                _MessagingText.of(context).emptyHint,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: colors.mutedText,
                  fontSize: 15,
                ),
              ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.2),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: colors.tealDark,
      backgroundColor: colors.cardBg,
      onRefresh: () => ref.read(conversationsProvider.notifier).load(),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        itemCount: state.conversations.length,
        itemBuilder: (context, index) {
          final conv = state.conversations[index];
          return _ConversationTile(
            conversation: conv,
            currentUserId: currentUserId,
            onTap: () => context.push('/messaging/${conv.id}', extra: conv),
          ).animate().fadeIn(delay: (50 * index).ms).slideX(begin: 0.05);
        },
      ),
    );
  }

  Widget? _buildFab(
      BuildContext context, WidgetRef ref, String role, AppColors colors) {
    if (!['teacher', 'principal', 'secretary', 'parent'].contains(role)) {
      return null;
    }
    return Container(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: colors.tealDark.withValues(alpha: 0.22),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
        borderRadius: BorderRadius.circular(20),
      ),
      child: FloatingActionButton(
        backgroundColor: colors.tealDark,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Icon(Icons.edit_rounded,
            color: Theme.of(context).colorScheme.onPrimary, size: 26),
        onPressed: () => _showNewConversationDialog(context, ref, role),
      ),
    ).animate().scale(delay: 400.ms, curve: Curves.easeOutBack);
  }

  void _showNewConversationDialog(
      BuildContext context, WidgetRef ref, String role) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          Theme.of(context).colorScheme.surface.withValues(alpha: 0),
      builder: (_) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: _NewConversationSheet(role: role),
      ),
    );
  }
}

// ── Conversation Tile ─────────────────────────────────────────────────────────

class _ConversationTile extends StatelessWidget {
  final ConversationModel conversation;
  final String currentUserId;
  final VoidCallback onTap;

  const _ConversationTile({
    required this.conversation,
    required this.currentUserId,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    final theme = Theme.of(context);
    final name = conversation.displayName(currentUserId);
    final String subtitle;
    if (conversation.type == 'group') {
      subtitle = _MessagingText.of(context)
          .participantCount(conversation.subtitleParticipantCount);
    } else {
      subtitle =
          _roleLabel(context, conversation.subtitleRoleKey(currentUserId));
    }
    final lastMsg = conversation.lastMessage;
    final unread = conversation.unreadCount;
    final isGroup = conversation.type == 'group';

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 7),
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: unread > 0
              ? colors.tealDark.withValues(alpha: 0.24)
              : colors.cardBorder,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        highlightColor: colors.tealDark.withValues(alpha: 0.04),
        splashColor: colors.tealDark.withValues(alpha: 0),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              _buildAvatar(context, isGroup, colors),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: TextStyle(
                              color: theme.colorScheme.onSurface,
                              fontWeight: unread > 0
                                  ? FontWeight.w800
                                  : FontWeight.w600,
                              fontSize: 16,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (lastMsg != null)
                          Text(
                            _formatDate(context, lastMsg.createdAt),
                            style: TextStyle(
                              color: unread > 0
                                  ? colors.tealDark
                                  : colors.mutedText.withValues(alpha: 0.78),
                              fontSize: 12,
                              fontWeight: unread > 0
                                  ? FontWeight.w600
                                  : FontWeight.w500,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                subtitle,
                                style: TextStyle(
                                  color: colors.tealDark,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (lastMsg != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  lastMsg.content,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: unread > 0
                                        ? theme.colorScheme.onSurface
                                        : colors.mutedText,
                                    fontSize: 14,
                                    fontWeight: unread > 0
                                        ? FontWeight.w500
                                        : FontWeight.normal,
                                  ),
                                ),
                              ]
                            ],
                          ),
                        ),
                        if (unread > 0)
                          Container(
                            margin: const EdgeInsetsDirectional.only(start: 12),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: colors.dangerRed,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              unread > 9 ? '9+' : '$unread',
                              style: TextStyle(
                                color: theme.colorScheme.onPrimary,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ).animate().scale(curve: Curves.easeOutBack),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(BuildContext context, bool isGroup, AppColors colors) {
    final tone = isGroup ? colors.successGreen : colors.tealDark;
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: tone.withValues(alpha: 0.18)),
      ),
      child: Center(
        child: Icon(
          isGroup ? Icons.groups_rounded : Icons.person_rounded,
          color: tone,
          size: 28,
        ),
      ),
    );
  }

  String _formatDate(BuildContext context, DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) return DateFormat('HH:mm').format(date);
    if (diff.inDays == 1) return _MessagingText.of(context).yesterday;
    if (diff.inDays < 7) {
      return DateFormat('EEE', Localizations.localeOf(context).languageCode)
          .format(date);
    }
    return DateFormat('dd/MM').format(date);
  }
}

// ── New Conversation Bottom Sheet ─────────────────────────────────────────────

class _NewConversationSheet extends ConsumerStatefulWidget {
  final String role;
  const _NewConversationSheet({required this.role});

  @override
  ConsumerState<_NewConversationSheet> createState() =>
      _NewConversationSheetState();
}

class _NewConversationSheetState extends ConsumerState<_NewConversationSheet> {
  final _searchController = TextEditingController();
  final _messageController = TextEditingController();
  final List<MessagingContact> _selectedContacts = [];
  bool _isSending = false;

  @override
  void dispose() {
    _searchController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    final theme = Theme.of(context);
    final contactsAsync = ref.watch(dmContactsProvider);
    final text = _MessagingText.of(context);
    final query = _searchController.text.trim().toLowerCase();
    final canSend = _selectedContacts.isNotEmpty &&
        (_selectedContacts.length == 1 ||
            _messageController.text.trim().isNotEmpty);

    return Container(
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsetsDirectional.fromSTEB(
        24,
        12,
        24,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: colors.cardBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: Text(
                    text.newConversation,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Container(
                  decoration: BoxDecoration(
                    color: colors.glassSurface,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: Icon(Icons.close_rounded,
                        color: colors.mutedText, size: 20),
                    onPressed: () => context.pop(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _inputField(
              context: context,
              controller: _searchController,
              hint: text.searchContact,
              icon: Icons.search_rounded,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
            contactsAsync.when(
              loading: () => const ShimmerList(
                itemCount: 2,
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                physics: NeverScrollableScrollPhysics(),
              ),
              error: (error, _) => _ContactMessage(
                icon: Icons.error_outline_rounded,
                message: text.contactsLoadError,
              ),
              data: (contacts) {
                final filtered = contacts.where((contact) {
                  if (query.isEmpty) return true;
                  return contact.fullName.toLowerCase().contains(query) ||
                      (contact.email ?? '').toLowerCase().contains(query) ||
                      _roleLabel(context, contact.role)
                          .toLowerCase()
                          .contains(query);
                }).toList();

                if (filtered.isEmpty) {
                  return _ContactMessage(
                    icon: Icons.person_off_rounded,
                    message: text.noAuthorizedContact,
                  );
                }

                return ConstrainedBox(
                  constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.35),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const BouncingScrollPhysics(),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final contact = filtered[index];
                      final isSelected = _selectedContacts
                          .any((item) => item.userId == contact.userId);
                      return _ContactTile(
                        contact: contact,
                        isSelected: isSelected,
                        onTap: () => setState(() => _toggleContact(contact)),
                      )
                          .animate()
                          .fadeIn(delay: (30 * index).ms)
                          .slideY(begin: 0.1);
                    },
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            if (_selectedContacts.isNotEmpty) ...[
              _SelectedRecipientsBar(
                contacts: _selectedContacts,
                onRemove: (contact) =>
                    setState(() => _selectedContacts.remove(contact)),
              ),
              const SizedBox(height: 16),
            ],
            _inputField(
              context: context,
              controller: _messageController,
              hint: text.firstMessage,
              icon: Icons.chat_bubble_rounded,
              maxLines: 3,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _isSending || !canSend ? null : _send,
                child: _isSending
                    ? SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                            color: theme.colorScheme.onPrimary,
                            strokeWidth: 2.5),
                      )
                    : Text(text.startConversation),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _inputField({
    required BuildContext context,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
  }) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Container(
      decoration: BoxDecoration(
        color: colors.glassSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.cardBorder),
      ),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        onChanged: onChanged,
        style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface, fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: colors.mutedText),
          prefixIcon: Padding(
            padding:
                EdgeInsetsDirectional.only(bottom: maxLines > 1 ? 48.0 : 0),
            child: Icon(icon, color: colors.tealDark, size: 22),
          ),
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
    );
  }

  void _toggleContact(MessagingContact contact) {
    final index =
        _selectedContacts.indexWhere((item) => item.userId == contact.userId);
    if (index >= 0) {
      _selectedContacts.removeAt(index);
    } else {
      _selectedContacts.add(contact);
    }
  }

  Future<void> _send() async {
    if (_selectedContacts.isEmpty) return;
    setState(() => _isSending = true);

    final message = _messageController.text.trim();
    ConversationModel? conv;
    if (_selectedContacts.length == 1) {
      conv = await ref.read(conversationsProvider.notifier).createDirect(
            recipientId: _selectedContacts.first.userId,
            initialMessage: message.isEmpty ? null : message,
          );
    } else if (message.isNotEmpty) {
      final convs = await ref.read(conversationsProvider.notifier).createBulk(
            recipientIds:
                _selectedContacts.map((contact) => contact.userId).toList(),
            initialMessage: message,
          );
      conv = convs.isEmpty ? null : convs.first;
    }

    if (!mounted) return;
    setState(() => _isSending = false);
    if (conv != null) {
      context.pop();
      context.push('/messaging/${conv.id}', extra: conv);
    }
  }
}

class _SelectedRecipientsBar extends StatelessWidget {
  final List<MessagingContact> contacts;
  final ValueChanged<MessagingContact> onRemove;

  const _SelectedRecipientsBar({
    required this.contacts,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: contacts
          .map(
            (contact) => InputChip(
              label: Text(
                contact.fullName,
                overflow: TextOverflow.ellipsis,
              ),
              avatar: const Icon(Icons.person_rounded, size: 16),
              onDeleted: () => onRemove(contact),
              backgroundColor: colors.tealLight,
              side: BorderSide(
                color: colors.tealDark.withValues(alpha: 0.20),
              ),
              labelStyle: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontWeight: FontWeight.w600,
              ),
              deleteIconColor: colors.mutedText,
            ),
          )
          .toList(),
    );
  }
}

class _ContactTile extends StatelessWidget {
  final MessagingContact contact;
  final bool isSelected;
  final VoidCallback onTap;

  const _ContactTile({
    required this.contact,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? colors.tealLight : colors.cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? colors.tealDark.withValues(alpha: 0.28)
                : colors.cardBorder,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: colors.tealDark,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(
                  contact.fullName.trim().isEmpty
                      ? '?'
                      : contact.fullName.trim()[0].toUpperCase(),
                  style: TextStyle(
                    color: theme.colorScheme.onPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contact.fullName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface,
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [
                      _roleLabel(context, contact.role),
                      if (contact.email != null && contact.email!.isNotEmpty)
                        contact.email!,
                    ].join(' • '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: colors.mutedText,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle_rounded, color: colors.tealDark, size: 24)
                  .animate()
                  .scale(curve: Curves.easeOutBack, duration: 300.ms)
            else
              Icon(Icons.circle_outlined, color: colors.cardBorder, size: 24),
          ],
        ),
      ),
    );
  }
}

class _ContactMessage extends StatelessWidget {
  final IconData icon;
  final String message;

  const _ContactMessage({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colors.glassSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.cardBorder),
      ),
      child: Column(
        children: [
          Icon(icon, color: colors.mutedText, size: 32),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.mutedText, fontSize: 14),
          ),
        ],
      ),
    );
  }
}

String _roleLabel(BuildContext context, String role) {
  final text = _MessagingText.of(context);
  switch (role) {
    case 'principal':
      return text.direction;
    case 'secretary':
      return text.administration;
    case 'teacher':
      return text.teacher;
    case 'parent':
      return text.parent;
    default:
      return role;
  }
}

class _MessagingText {
  final String languageCode;

  const _MessagingText(this.languageCode);

  static _MessagingText of(BuildContext context) =>
      _MessagingText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get title => _ar
      ? 'الرسائل'
      : _fr
          ? 'Messagerie'
          : 'Messaging';
  String get retry => _ar
      ? 'إعادة المحاولة'
      : _fr
          ? 'Réessayer'
          : 'Retry';
  String get emptyTitle => _ar
      ? 'لا توجد محادثات'
      : _fr
          ? 'Aucune conversation'
          : 'No conversations';
  String get emptyHint => _ar
      ? 'اضغط على + للبدء'
      : _fr
          ? 'Appuyez sur + pour commencer'
          : 'Tap + to start';
  String get yesterday => _ar
      ? 'أمس'
      : _fr
          ? 'Hier'
          : 'Yesterday';
  String get newConversation => _ar
      ? 'محادثة جديدة'
      : _fr
          ? 'Nouvelle conversation'
          : 'New conversation';
  String get searchContact => _ar
      ? 'ابحث عن ولي أو معلم أو عضو من الإدارة'
      : _fr
          ? 'Rechercher un parent, enseignant ou membre de la direction'
          : 'Search for a parent, teacher, or administrator';
  String get contactsLoadError => _ar
      ? 'تعذر تحميل جهات الاتصال.'
      : _fr
          ? 'Impossible de charger les contacts.'
          : 'Unable to load contacts.';
  String get noAuthorizedContact => _ar
      ? 'لم يتم العثور على جهة اتصال مسموحة.'
      : _fr
          ? 'Aucun contact autorisé trouvé.'
          : 'No authorized contact found.';
  String get firstMessage => _ar
      ? 'الرسالة الأولى (اختيارية)'
      : _fr
          ? 'Premier message (optionnel)'
          : 'First message (optional)';
  String get startConversation => _ar
      ? 'بدء المحادثة'
      : _fr
          ? 'Démarrer la conversation'
          : 'Start conversation';
  String get direction => _ar
      ? 'الإدارة'
      : _fr
          ? 'Direction'
          : 'Direction';
  String get administration => _ar
      ? 'الإشراف'
      : _fr
          ? 'Administration'
          : 'Administration';
  String get teacher => _ar
      ? 'معلم'
      : _fr
          ? 'Enseignant'
          : 'Teacher';
  String get parent => _ar
      ? 'ولي أمر'
      : _fr
          ? 'Parent'
          : 'Parent';

  String participantCount(int count) => _ar
      ? '$count مشاركون'
      : _fr
          ? '$count participants'
          : '$count participants';
}
