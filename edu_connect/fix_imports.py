import os

for root, dirs, files in os.walk('lib'):
    for file in files:
        if file.endswith('.dart'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            new_content = content.replace('package:flutter_gen/gen_l10n/app_localizations.dart', 'package:edu_connect/l10n/app_localizations.dart')
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Fixed {path}')

