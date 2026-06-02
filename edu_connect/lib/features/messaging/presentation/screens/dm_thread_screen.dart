import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../providers/dm_provider.dart';
import '../../data/models/conversation_model.dart';

class DmThreadScreen extends ConsumerStatefulWidget {
  final String conversationId;
  final ConversationModel?
      conversation; // passed as GoRouter extra for instant display

  const DmThreadScreen({
    super.key,
    required this.conversationId,
    this.conversation,
  });

  @override
  ConsumerState<DmThreadScreen> createState() => _DmThreadScreenState();
}

class _DmThreadScreenState extends ConsumerState<DmThreadScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authUser = ref.watch(authNotifierProvider).valueOrNull;
    final currentUserId = authUser?.id ?? '';
    final threadState = ref.watch(dmThreadProvider(widget.conversationId));
    final conv = widget.conversation;
    final theme = Theme.of(context);
    final colors = context.appColors;
    final text = _DmText.of(context);

    // Auto-scroll on new messages
    ref.listen(dmThreadProvider(widget.conversationId), (prev, next) {
      if ((prev?.messages.length ?? 0) < next.messages.length) {
        _scrollToBottom();
      }
    });

    final title = conv?.displayName(currentUserId) ?? text.conversation;
    final subtitle = conv?.subtitle(currentUserId) ?? '';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colors.cardBg,
        surfaceTintColor: theme.colorScheme.surface.withValues(alpha: 0),
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.adaptive.arrow_back,
              color: theme.colorScheme.onSurface),
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () => context.pop(),
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: conv?.type == 'group'
                  ? colors.successGreen.withValues(alpha: 0.12)
                  : colors.tealLight,
              child: Icon(
                conv?.type == 'group' ? Icons.groups : Icons.person,
                color: conv?.type == 'group'
                    ? colors.successGreen
                    : colors.tealDark,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (subtitle.isNotEmpty)
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: colors.subtitleText,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(child: _buildMessages(threadState, currentUserId)),
          _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildMessages(DmThreadState state, String currentUserId) {
    final colors = context.appColors;
    if (state.isLoading) {
      return const ShimmerMessageList();
    }

    if (state.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            state.error!,
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.dangerRed),
          ),
        ),
      );
    }

    if (state.messages.isEmpty) {
      return Center(
        child: Text(
          _DmText.of(context).startConversation,
          style: TextStyle(color: colors.subtitleText),
        ),
      );
    }

    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

    return ListView.builder(
      controller: _scrollController,
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      itemCount: state.messages.length,
      itemBuilder: (context, index) {
        final msg = state.messages[index];
        final isMe = msg.senderId == currentUserId;
        final showDate = index == 0 ||
            !_sameDay(state.messages[index - 1].createdAt, msg.createdAt);

        return Column(
          children: [
            if (showDate) _DateDivider(date: msg.createdAt),
            _MessageBubble(message: msg, isMe: isMe),
          ],
        );
      },
    );
  }

  Widget _buildInputBar() {
    final theme = Theme.of(context);
    final colors = context.appColors;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: colors.cardBg,
        border: Border(top: BorderSide(color: colors.cardBorder)),
        boxShadow: [
          BoxShadow(
            color: theme.shadowColor.withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: colors.glassSurface,
                  borderRadius: const BorderRadius.all(Radius.circular(24)),
                  border: Border.fromBorderSide(
                    BorderSide(color: colors.cardBorder),
                  ),
                ),
                child: TextField(
                  controller: _textController,
                  style: TextStyle(
                      color: theme.colorScheme.onSurface, fontSize: 14),
                  maxLines: 4,
                  minLines: 1,
                  textInputAction: TextInputAction.newline,
                  decoration: InputDecoration(
                    hintText: _DmText.of(context).messageHint,
                    hintStyle: TextStyle(color: colors.mutedText, fontSize: 14),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Semantics(
              button: true,
              enabled: !_isSending,
              label: _DmText.of(context).sendMessage,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                child: GestureDetector(
                  onTap: _isSending ? null : _send,
                  child: Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: colors.tealDark,
                      borderRadius: BorderRadius.circular(23),
                      boxShadow: [
                        BoxShadow(
                          color: colors.tealDark.withValues(alpha: 0.22),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: _isSending
                        ? Padding(
                            padding: const EdgeInsets.all(12),
                            child: CircularProgressIndicator(
                              color: theme.colorScheme.onPrimary,
                              strokeWidth: 2,
                            ),
                          )
                        : Icon(Icons.send_rounded,
                            color: theme.colorScheme.onPrimary, size: 20),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _send() async {
    final content = _textController.text.trim();
    if (content.isEmpty) return;
    _textController.clear();
    setState(() => _isSending = true);
    await ref
        .read(dmThreadProvider(widget.conversationId).notifier)
        .send(content);
    setState(() => _isSending = false);
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

// ── Message Bubble ────────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final DirectMessageModel message;
  final bool isMe;

  const _MessageBubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe)
            CircleAvatar(
              radius: 14,
              backgroundColor: colors.tealLight,
              child: Text(
                message.senderName.isNotEmpty
                    ? message.senderName[0].toUpperCase()
                    : '?',
                style: TextStyle(
                    color: colors.tealDark,
                    fontSize: 11,
                    fontWeight: FontWeight.bold),
              ),
            ),
          if (!isMe) const SizedBox(width: 6),
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe)
                  Padding(
                    padding:
                        const EdgeInsetsDirectional.only(start: 4, bottom: 2),
                    child: Text(
                      message.senderName,
                      style: TextStyle(
                        color: colors.mutedText,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                Container(
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.72,
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isMe ? colors.tealDark : colors.cardBg,
                    border: isMe ? null : Border.all(color: colors.cardBorder),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft: Radius.circular(isMe ? 18 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 18),
                    ),
                    boxShadow: isMe
                        ? [
                            BoxShadow(
                              color: colors.tealDark.withValues(alpha: 0.18),
                              blurRadius: 14,
                              offset: const Offset(0, 6),
                            ),
                          ]
                        : [
                            BoxShadow(
                              color: theme.shadowColor.withValues(alpha: 0.08),
                              blurRadius: 12,
                              offset: const Offset(0, 6),
                            ),
                          ],
                  ),
                  child: Text(
                    message.content,
                    style: TextStyle(
                      color: isMe
                          ? theme.colorScheme.onPrimary
                          : theme.colorScheme.onSurface,
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsetsDirectional.only(
                      top: 3, start: 4, end: 4),
                  child: Text(
                    DateFormat('HH:mm').format(message.createdAt),
                    style: TextStyle(
                      color: colors.mutedText,
                      fontSize: 10,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Date Divider ──────────────────────────────────────────────────────────────

class _DateDivider extends StatelessWidget {
  final DateTime date;
  const _DateDivider({required this.date});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final messageDate = DateTime(date.year, date.month, date.day);
    String label;
    if (messageDate == today) {
      label = _DmText.of(context).today;
    } else if (messageDate == today.subtract(const Duration(days: 1))) {
      label = _DmText.of(context).yesterday;
    } else {
      label = DateFormat(
              'd MMMM yyyy', Localizations.localeOf(context).languageCode)
          .format(date);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Expanded(child: Divider(color: colors.cardBorder)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              label,
              style: TextStyle(
                color: colors.mutedText,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(child: Divider(color: colors.cardBorder)),
        ],
      ),
    );
  }
}

class _DmText {
  final String languageCode;

  const _DmText(this.languageCode);

  static _DmText of(BuildContext context) =>
      _DmText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get conversation => _ar
      ? 'محادثة'
      : _fr
          ? 'Conversation'
          : 'Conversation';
  String get startConversation => _ar
      ? 'ابدأوا المحادثة...'
      : _fr
          ? 'Commencez la conversation...'
          : 'Start the conversation...';
  String get messageHint => _ar
      ? 'رسالتكم...'
      : _fr
          ? 'Votre message...'
          : 'Your message...';
  String get sendMessage => _ar
      ? 'إرسال الرسالة'
      : _fr
          ? 'Envoyer le message'
          : 'Send message';
  String get today => _ar
      ? 'اليوم'
      : _fr
          ? "Aujourd'hui"
          : 'Today';
  String get yesterday => _ar
      ? 'أمس'
      : _fr
          ? 'Hier'
          : 'Yesterday';
}
