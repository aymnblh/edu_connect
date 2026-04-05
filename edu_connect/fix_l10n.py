import os
import re

for root, dirs, files in os.walk('lib'):
    for file in files:
        if file.endswith('.dart'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            orig = content
            if 'l10n.' in content and 'final l10n = AppLocalizations.of(context)!' not in content:
                content = re.sub(r'(Widget build\([^)]*context[^)]*\)\s*\{)', r'\1\n    final l10n = AppLocalizations.of(context)!;', content)
            
            if 'AppLocalizations' in content and 'package:edu_connect/l10n/app_localizations.dart' not in content:
                content = "import 'package:edu_connect/l10n/app_localizations.dart';\n" + content
            
            if content != orig:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Fixed {path}')
