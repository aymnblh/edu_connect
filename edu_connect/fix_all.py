import os

files = [
    'lib/features/auth/presentation/screens/login_screen.dart',
    'lib/features/auth/presentation/screens/register_screen.dart',
    'lib/features/notifications/presentation/screens/notifications_screen.dart',
    'lib/features/payments/presentation/screens/payments_list_screen.dart',
    'lib/features/attendance/presentation/screens/mark_attendance_screen.dart',
    'lib/features/homework/presentation/screens/homework_list_screen.dart'
]
for path in files:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
        
        # fix l10n undefined
        c = c.replace('l10n.', 'AppLocalizations.of(context)!.')
        
        # fix missing UserModel in mark_attendance
        if path.endswith('mark_attendance_screen.dart'):
            if 'import \'../../../auth/data/models/user_model.dart\';' not in c:
                c = 'import \'../../../auth/data/models/user_model.dart\';\n' + c
            # Fix property 'id' can't be unconditionally accessed
            c = c.replace('m.id != cls.teacherId', 'm.id != cls?.teacherId')

        # Fix 'AppLocalizations' doesn't have 'new' getter
        if path.endswith('homework_list_screen.dart'):
            c = c.replace('AppLocalizations.of(context)!.new,', 'AppLocalizations.of(context)!.newLabel,')
            c = c.replace('AppLocalizations.of(context)!.new)', 'AppLocalizations.of(context)!.newLabel)')

        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f"Fixed {path}")
    except Exception as e:
        print(f"Error on {path}: {e}")
