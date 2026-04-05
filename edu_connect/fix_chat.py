import os
path = 'lib/features/chat/presentation/screens/chat_screen.dart'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('l10n.', 'AppLocalizations.of(context)!.')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

