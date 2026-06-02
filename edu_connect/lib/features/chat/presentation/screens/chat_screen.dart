import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../data/models/message_model.dart';
import '../providers/chat_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../class/data/models/class_model.dart';
import '../../../class/presentation/providers/class_provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/shimmer_loading.dart';

import 'package:edu_connect/l10n/app_localizations.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String classId;

  const ChatScreen({super.key, required this.classId});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen>
    with SingleTickerProviderStateMixin {
  final _messageCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  late TabController _tabController;
  bool _isAnnouncementMode = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!mounted) return;
      setState(() => _isAnnouncementMode = _tabController.index == 1);
    });
  }

  @override
  void dispose() {
    _messageCtrl.dispose();
    _scrollCtrl.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send(UserModel user) async {
    final text = _messageCtrl.text.trim();
    if (text.isEmpty) return;
    final canSendAnnouncement = _canSendClassAnnouncement(user);
    if (_isAnnouncementMode && !canSendAnnouncement) return;

    _messageCtrl.clear();
    try {
      HapticFeedback.lightImpact();
      await ref.read(chatStateProvider(widget.classId).notifier).send(
            text,
            isAnnouncement: _isAnnouncementMode,
          );
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_chatText(context).failedToSend(e))),
        );
      }
    }
  }

  void _goBack() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/classes');
    }
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(authNotifierProvider);
    final classAsync = ref.watch(classDetailProvider(widget.classId));
    final chatState = ref.watch(chatStateProvider(widget.classId));

    return userAsync.when(
      loading: () => const Scaffold(
        body: SafeArea(child: ShimmerMessageList()),
      ),
      error: (e, _) => Scaffold(
          body: Center(
              child: Text('${AppLocalizations.of(context)!.error}: $e'))),
      data: (user) {
        if (user == null) return const SizedBox.shrink();
        final canSendAnnouncement = _canSendClassAnnouncement(user);
        final isAnnouncementTab = _tabController.index == 1;

        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) _goBack();
          },
          child: Builder(
            builder: (context) {
              final theme = Theme.of(context);
              final colors = context.appColors;
              final isDark = theme.brightness == Brightness.dark;
              final appBarBgColor = isDark ? colors.cardBg : colors.tealDark;
              final appBarForeground = isDark
                  ? theme.colorScheme.onSurface
                  : theme.colorScheme.onPrimary;
              final text = _chatText(context);
              return Scaffold(
                backgroundColor: theme.scaffoldBackgroundColor,
                appBar: AppBar(
                  backgroundColor: appBarBgColor,
                  foregroundColor: appBarForeground,
                  leading: IconButton(
                    icon: Icon(Icons.adaptive.arrow_back),
                    tooltip:
                        MaterialLocalizations.of(context).backButtonTooltip,
                    onPressed: _goBack,
                  ),
                  title: classAsync.when(
                    loading: () => Text(AppLocalizations.of(context)!.loading),
                    error: (_, __) => Text(AppLocalizations.of(context)!.chat),
                    data: (ClassModel? cls) => cls == null
                        ? Text(AppLocalizations.of(context)!.chat)
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(cls.name,
                                  style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700)),
                              Text(
                                _chatAudienceTitle(context, user, cls),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color:
                                      appBarForeground.withValues(alpha: 0.72),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                  ),
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.people_outline),
                      tooltip: text.attendance,
                      onPressed: () {
                        if (user.isTeacher) {
                          context.push('/class/${widget.classId}/attendance');
                        } else {
                          context.push(
                              '/class/${widget.classId}/student-attendance');
                        }
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.grade_outlined),
                      tooltip: text.grades,
                      onPressed: () =>
                          context.push('/class/${widget.classId}/grades'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.book_outlined),
                      tooltip: text.remarks,
                      onPressed: () =>
                          context.push('/class/${widget.classId}/remarks'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.assignment_outlined),
                      tooltip: text.homework,
                      onPressed: () =>
                          context.push('/class/${widget.classId}/homework'),
                    ),
                  ],
                  bottom: TabBar(
                    controller: _tabController,
                    indicatorColor:
                        isDark ? colors.tealAccent : appBarForeground,
                    labelColor: isDark ? colors.tealAccent : appBarForeground,
                    unselectedLabelColor:
                        appBarForeground.withValues(alpha: 0.6),
                    tabs: [
                      Tab(text: AppLocalizations.of(context)!.chat),
                      Tab(text: AppLocalizations.of(context)!.announcements),
                    ],
                  ),
                ),
                body: Column(
                  children: [
                    Expanded(
                      child: Builder(
                        builder: (context) {
                          if (chatState.isLoading) {
                            return const ShimmerMessageList();
                          }
                          if (chatState.error != null) {
                            return Center(
                              child: Text(
                                '${text.error}: ${chatState.error}',
                              ),
                            );
                          }

                          final messages = chatState.messages;
                          final filtered = _tabController.index == 0
                              ? messages
                                  .where((m) => !m.isAnnouncement)
                                  .toList()
                              : messages
                                  .where((m) => m.isAnnouncement)
                                  .toList();

                          if (filtered.isEmpty) {
                            return _EmptyChatState(
                                isAnnouncement: _tabController.index == 1);
                          }

                          WidgetsBinding.instance
                              .addPostFrameCallback((_) => _scrollToBottom());

                          return ListView.builder(
                            controller: _scrollCtrl,
                            keyboardDismissBehavior:
                                ScrollViewKeyboardDismissBehavior.onDrag,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            itemCount: filtered.length,
                            itemBuilder: (ctx, i) {
                              final msg = filtered[i];
                              final isMe = msg.senderId == user.id;
                              final showDate = i == 0 ||
                                  !_isSameDay(
                                      filtered[i - 1].createdAt, msg.createdAt);

                              return Column(
                                children: [
                                  if (showDate)
                                    _DateHeader(date: msg.createdAt),
                                  MessageBubble(
                                    message: msg,
                                    isMe: isMe,
                                    onLongPress: isMe || user.isTeacher
                                        ? () => _confirmDelete(msg)
                                        : null,
                                  ),
                                ],
                              );
                            },
                          );
                        },
                      ),
                    ),
                    _AudienceHint(
                      isAnnouncement: isAnnouncementTab,
                      canSendAnnouncement: canSendAnnouncement,
                      user: user,
                    ),
                    if (isAnnouncementTab && !canSendAnnouncement)
                      _ReadOnlyAnnouncementBar(user: user)
                    else
                      _MessageInputBar(
                        controller: _messageCtrl,
                        isAnnouncement: isAnnouncementTab,
                        onSend: () => _send(user),
                      ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  void _confirmDelete(MessageModel msg) {
    HapticFeedback.mediumImpact();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppLocalizations.of(context)!.deleteMessage),
        content: Text(AppLocalizations.of(context)!.deleteMessageConfirm),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(AppLocalizations.of(context)!.cancel)),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              // TODO: implement delete in backend/repo
            },
            style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error),
            child: Text(AppLocalizations.of(context)!.delete),
          ),
        ],
      ),
    );
  }
}

// ── Message Bubble ─────────────────────────────────────────────────────────
class MessageBubble extends StatelessWidget {
  final MessageModel message;
  final bool isMe;
  final VoidCallback? onLongPress;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isMe,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    if (message.isAnnouncement) {
      return _AnnouncementBubble(message: message);
    }

    final theme = Theme.of(context);
    final colors = context.appColors;

    return Align(
      alignment: isMe
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: GestureDetector(
        onLongPress: onLongPress,
        child: Container(
          margin: EdgeInsetsDirectional.only(
            top: 4,
            bottom: 4,
            start: isMe ? 60 : 0,
            end: isMe ? 0 : 60,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            gradient: isMe
                ? LinearGradient(
                    colors: [colors.tealDark, colors.tealAccent],
                    begin: AlignmentDirectional.topStart,
                    end: AlignmentDirectional.bottomEnd,
                  )
                : null,
            color: isMe ? null : colors.cardBg,
            border: isMe ? null : Border.all(color: colors.cardBorder),
            borderRadius: BorderRadiusDirectional.only(
              topStart: const Radius.circular(20),
              topEnd: const Radius.circular(20),
              bottomStart: Radius.circular(isMe ? 20 : 4),
              bottomEnd: Radius.circular(isMe ? 4 : 20),
            ),
            boxShadow: [
              BoxShadow(
                color: theme.shadowColor.withValues(alpha: 0.08),
                blurRadius: 6,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment:
                isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (!isMe)
                Padding(
                  padding: const EdgeInsetsDirectional.only(bottom: 4),
                  child: Text(
                    message.senderName,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: colors.tealDark,
                    ),
                  ),
                ),
              Text(
                message.content,
                style: TextStyle(
                  color: isMe
                      ? theme.colorScheme.onPrimary
                      : theme.colorScheme.onSurface,
                  fontSize: 15,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    DateFormatter.chatTimestamp(message.createdAt),
                    style: TextStyle(
                      fontSize: 10,
                      color: isMe
                          ? theme.colorScheme.onPrimary.withValues(alpha: 0.75)
                          : colors.mutedText,
                    ),
                  ),
                  if (isMe) ...[
                    const SizedBox(width: 4),
                    Icon(
                      Icons.done_all_rounded,
                      size: 14,
                      color: theme.colorScheme.onPrimary.withValues(alpha: 0.9),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 250.ms)
        .slideY(begin: 0.15, curve: Curves.easeOutBack);
  }
}

class _AnnouncementBubble extends StatelessWidget {
  final MessageModel message;

  const _AnnouncementBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.warningAmber.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(16),
        border: BorderDirectional(
          start: BorderSide(
            color: colors.warningAmber,
            width: 4,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.campaign_outlined,
                size: 18,
                color: colors.warningAmber,
              ),
              const SizedBox(width: 6),
              Text(
                AppLocalizations.of(context)!.announcements,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: colors.warningAmber,
                  letterSpacing: 0.5,
                ),
              ),
              const Spacer(),
              Text(
                DateFormatter.chatTimestamp(message.createdAt),
                style: TextStyle(
                  fontSize: 10,
                  color: colors.mutedText,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            message.content,
            style: TextStyle(
              color: theme.colorScheme.onSurface,
              fontSize: 14.5,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '— ${message.senderName}',
            style: TextStyle(
              fontSize: 12,
              color: colors.mutedText,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}

class _DateHeader extends StatelessWidget {
  final DateTime date;

  const _DateHeader({required this.date});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
          decoration: BoxDecoration(
            color: colors.cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: colors.cardBorder,
              width: 1,
            ),
          ),
          child: Text(
            DateFormatter.dateHeader(date),
            style: TextStyle(
              fontSize: 12,
              color: colors.mutedText,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _MessageInputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool isAnnouncement;
  final VoidCallback onSend;

  const _MessageInputBar({
    required this.controller,
    required this.isAnnouncement,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    final sendForeground = isAnnouncement
        ? theme.colorScheme.onSurface
        : theme.colorScheme.onPrimary;

    return Container(
      color: colors.cardBg,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: colors.glassSurface,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: colors.cardBorder,
                    width: 1,
                  ),
                ),
                child: TextField(
                  controller: controller,
                  maxLines: 4,
                  minLines: 1,
                  textInputAction: TextInputAction.send,
                  textCapitalization: TextCapitalization.sentences,
                  onSubmitted: (_) => onSend(),
                  style: TextStyle(
                    color: theme.colorScheme.onSurface,
                  ),
                  decoration: InputDecoration(
                    hintText: isAnnouncement
                        ? _chatText(context).announcementInputHint
                        : _chatText(context).messageInputHint,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    hintStyle: TextStyle(
                      color: colors.mutedText,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Tooltip(
              message: _chatText(context).send,
              child: Semantics(
                button: true,
                label: _chatText(context).send,
                child: GestureDetector(
                  onTap: onSend,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: isAnnouncement
                          ? colors.warningAmber
                          : colors.tealDark,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isAnnouncement ? Icons.campaign : Icons.send_rounded,
                      color: sendForeground,
                      size: 20,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AudienceHint extends StatelessWidget {
  final bool isAnnouncement;
  final bool canSendAnnouncement;
  final UserModel user;

  const _AudienceHint({
    required this.isAnnouncement,
    required this.canSendAnnouncement,
    required this.user,
  });

  @override
  Widget build(BuildContext context) {
    final text = _chatText(context);
    final label = isAnnouncement
        ? canSendAnnouncement
            ? text.announcementAudience
            : text.announcementReadOnlyAudience
        : user.isParent
            ? text.parentChatAudience
            : text.classChatAudience;

    final colors = context.appColors;

    return Container(
      width: double.infinity,
      color: colors.cardBg,
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
      child: Row(
        children: [
          Icon(
            isAnnouncement ? Icons.campaign_outlined : Icons.groups_2_outlined,
            size: 18,
            color: colors.subtitleText,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: colors.subtitleText,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReadOnlyAnnouncementBar extends StatelessWidget {
  final UserModel user;

  const _ReadOnlyAnnouncementBar({required this.user});

  @override
  Widget build(BuildContext context) {
    final text = _chatText(context);
    final colors = context.appColors;
    return Container(
      width: double.infinity,
      color: colors.cardBg,
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
      child: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: colors.glassSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: colors.cardBorder,
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.lock_outline,
                size: 18,
                color: colors.mutedText,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  text.announcementReadOnly,
                  style: TextStyle(
                    color: colors.mutedText,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyChatState extends StatelessWidget {
  final bool isAnnouncement;

  const _EmptyChatState({required this.isAnnouncement});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isAnnouncement
                ? Icons.campaign_outlined
                : Icons.chat_bubble_outline,
            size: 64,
            color: colors.mutedText.withValues(alpha: 0.35),
          ),
          const SizedBox(height: 16),
          Text(
            isAnnouncement
                ? AppLocalizations.of(context)!.noAnnouncements
                : AppLocalizations.of(context)!.noMessages,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: colors.subtitleText,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isAnnouncement
                ? AppLocalizations.of(context)!.teachersPostAnnouncements
                : AppLocalizations.of(context)!.startConversation,
            style: TextStyle(
              color: colors.mutedText,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

bool _canSendClassAnnouncement(UserModel user) {
  return user.role == UserRole.teacher ||
      user.role == UserRole.principal ||
      user.role == UserRole.secretary;
}

String _chatAudienceTitle(
  BuildContext context,
  UserModel user,
  ClassModel cls,
) {
  final text = _chatText(context);
  final count = cls.memberCount;
  final members =
      count == 0 ? text.noLinkedStudents : text.linkedStudents(count);
  if (user.isParent) return '${text.toClassTeam} • $members';
  return '${text.toClassParentsAndTeam} • $members';
}

_ChatText _chatText(BuildContext context) {
  final code = Localizations.localeOf(context).languageCode;
  return _ChatText(code);
}

class _ChatText {
  final String languageCode;

  const _ChatText(this.languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get send => _ar
      ? 'إرسال'
      : _fr
          ? 'Envoyer'
          : 'Send';

  String get error => _ar
      ? 'خطأ'
      : _fr
          ? 'Erreur'
          : 'Error';

  String failedToSend(Object error) => _ar
      ? 'تعذر الإرسال: $error'
      : _fr
          ? 'Échec de l’envoi : $error'
          : 'Failed to send: $error';

  String get attendance => _ar
      ? 'الحضور'
      : _fr
          ? 'Assiduité'
          : 'Attendance';

  String get grades => _ar
      ? 'النقاط'
      : _fr
          ? 'Notes'
          : 'Grades';

  String get remarks => _ar
      ? 'الملاحظات'
      : _fr
          ? 'Remarques'
          : 'Remarks';

  String get homework => _ar
      ? 'الواجبات'
      : _fr
          ? 'Devoirs'
          : 'Homework';

  String get messageInputHint => _ar
      ? 'رسالة إلى القسم...'
      : _fr
          ? 'Message à la classe...'
          : 'Message to the class...';

  String get announcementInputHint => _ar
      ? 'إعلان إلى الأولياء...'
      : _fr
          ? 'Annonce aux parents...'
          : 'Announcement to parents...';

  String get classChatAudience => _ar
      ? 'إلى: القسم كاملًا، الأساتذة والأولياء المرتبطون'
      : _fr
          ? 'À: toute la classe, enseignants et parents liés'
          : 'To: the whole class, teachers and linked parents';

  String get parentChatAudience => _ar
      ? 'إلى: فريق القسم والإدارة'
      : _fr
          ? 'À: équipe de la classe et administration'
          : 'To: class team and administration';

  String get announcementAudience => _ar
      ? 'إلى: أولياء هذا القسم'
      : _fr
          ? 'À: parents de cette classe'
          : 'To: parents of this class';

  String get announcementReadOnlyAudience => _ar
      ? 'الإعلانات للقراءة فقط'
      : _fr
          ? 'Annonces en lecture seule'
          : 'Announcements are read-only';

  String get announcementReadOnly => _ar
      ? 'يمكن للأساتذة والإدارة فقط نشر إعلان.'
      : _fr
          ? 'Seuls les enseignants et l’administration peuvent publier une annonce.'
          : 'Only teachers and school staff can publish an announcement.';

  String get toClassTeam => _ar
      ? 'إلى فريق القسم'
      : _fr
          ? 'Vers équipe classe'
          : 'To class team';

  String get toClassParentsAndTeam => _ar
      ? 'إلى القسم والأولياء'
      : _fr
          ? 'Vers classe et parents'
          : 'To class and parents';

  String get noLinkedStudents => _ar
      ? 'لا يوجد تلاميذ'
      : _fr
          ? 'aucun élève'
          : 'no students';

  String linkedStudents(int count) {
    if (_ar) return '$count تلميذ';
    if (_fr) return '$count élève${count > 1 ? 's' : ''}';
    return '$count student${count == 1 ? '' : 's'}';
  }
}
