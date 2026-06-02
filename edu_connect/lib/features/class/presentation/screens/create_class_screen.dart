import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:ui';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/validators.dart';
import '../providers/class_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class CreateClassScreen extends ConsumerStatefulWidget {
  const CreateClassScreen({super.key});

  @override
  ConsumerState<CreateClassScreen> createState() => _CreateClassScreenState();
}

class _CreateClassScreenState extends ConsumerState<CreateClassScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  bool _isLoading = false;

  // Algerian grade presets for quick selection
  static const _gradePresets = [
    '1ère AP',
    '2ème AP',
    '3ème AP',
    '4ème AP',
    '5ème AP',
    '1ère AM',
    '2ème AM',
    '3ème AM',
    '4ème AM',
    '1AS',
    '2AS',
    '3AS',
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    if (!_formKey.currentState!.validate()) return;
    final user = ref.read(authNotifierProvider).value;
    if (user == null || user.schoolId == null) return;
    final colors = context.appColors;

    setState(() => _isLoading = true);
    try {
      final cls = await ref.read(classNotifierProvider.notifier).createClass(
            schoolId: user.schoolId!,
            name: _nameCtrl.text.trim(),
          );

      if (mounted && cls != null) {
        _showSuccess(cls.joinCode, cls.id);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            content: Text(e.toString(),
                style: const TextStyle(fontWeight: FontWeight.w600)),
            backgroundColor: colors.dangerRed,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSuccess(String code, String classId) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;

    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: colorScheme.shadow.withValues(alpha: 0.6),
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        backgroundColor: colors.cardBg,
        elevation: 0,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: colors.successGreen.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.check_circle_rounded,
                    color: colors.successGreen, size: 48),
              ).animate().scale(curve: Curves.easeOutBack, duration: 500.ms),
              const SizedBox(height: 24),
              Text(
                'Classe créée !',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: colorScheme.onSurface,
                  letterSpacing: -0.5,
                ),
              ).animate().fadeIn(delay: 200.ms),
              const SizedBox(height: 8),
              Text(
                'Votre classe a été créée avec succès.',
                textAlign: TextAlign.center,
                style: TextStyle(color: colors.subtitleText, fontSize: 15),
              ).animate().fadeIn(delay: 300.ms),
              const SizedBox(height: 32),
              Text(
                'Code de liaison',
                style: TextStyle(
                    fontSize: 13,
                    color: colors.mutedText,
                    fontWeight: FontWeight.w600,
                    textBaseline: TextBaseline.alphabetic),
              ).animate().fadeIn(delay: 400.ms),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      colorScheme.surface,
                      colors.glassSurface,
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: colors.cardBorder, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: colorScheme.shadow.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    code,
                    style: TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w900,
                      color: colorScheme.onSurface,
                      letterSpacing: 8,
                    ),
                  ),
                ),
              ).animate().scale(delay: 500.ms, curve: Curves.easeOutBack),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: colors.tealLight.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline_rounded,
                        color: colors.tealDark, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Prochaine étape : configurez les matières et inscrivez les élèves via "Gérer".',
                        style: TextStyle(
                            fontSize: 13,
                            color: colors.tealDark,
                            height: 1.5,
                            fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.2),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        context.go('/classes');
                      },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                        side: BorderSide(color: colors.cardBorder, width: 2),
                      ),
                      child: Text('Mes classes',
                          style: TextStyle(
                              color: colors.subtitleText,
                              fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        context.push('/class/$classId/manage');
                      },
                      icon: const Icon(Icons.settings_rounded, size: 18),
                      label: const Text('Gérer',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colors.tealDark,
                        foregroundColor: colorScheme.onPrimary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                  ),
                ],
              ).animate().fadeIn(delay: 700.ms),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: colorScheme.surface.withValues(alpha: 0),
        elevation: 0,
        centerTitle: true,
        flexibleSpace: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              color: colorScheme.surface.withValues(alpha: 0.8),
            ),
          ),
        ),
        title: Text(
          'Nouvelle classe',
          style: TextStyle(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
        ),
        leading: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Container(
            decoration: BoxDecoration(
              color: colors.cardBg,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: colorScheme.shadow.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: IconButton(
              tooltip: MaterialLocalizations.of(context).backButtonTooltip,
              icon: Icon(Icons.adaptive.arrow_back,
                  color: colorScheme.onSurface, size: 18),
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/classes');
                }
              },
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        physics: const BouncingScrollPhysics(),
        child: Padding(
          padding: EdgeInsetsDirectional.only(
            start: 24,
            end: 24,
            top: MediaQuery.of(context).padding.top + kToolbarHeight + 24,
            bottom: 40,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [colors.tealDark, colorScheme.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: colors.tealDark.withValues(alpha: 0.2),
                      blurRadius: 24,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: colorScheme.onPrimary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color:
                                colorScheme.onPrimary.withValues(alpha: 0.1)),
                      ),
                      child: Icon(Icons.class_rounded,
                          color: colorScheme.onPrimary, size: 32),
                    ).animate().scale(curve: Curves.easeOutBack, delay: 200.ms),
                    const SizedBox(height: 24),
                    Text(
                      'Créer une nouvelle classe',
                      style: TextStyle(
                        color: colorScheme.onPrimary,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ).animate().fadeIn(delay: 300.ms).slideX(begin: -0.1),
                    const SizedBox(height: 8),
                    Text(
                      'Une classe est un groupe d\'élèves (ex: 3ème A, 2AS).\nVous pourrez ensuite y ajouter des matières et des élèves.',
                      style: TextStyle(
                        color: colorScheme.onPrimary.withValues(alpha: 0.7),
                        fontSize: 14,
                        height: 1.6,
                      ),
                    ).animate().fadeIn(delay: 400.ms).slideX(begin: -0.1),
                  ],
                ),
              ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.1),

              const SizedBox(height: 40),

              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Nom de la classe',
                      style: TextStyle(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ).animate().fadeIn(delay: 500.ms),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: colors.cardBg,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: colorScheme.shadow.withValues(alpha: 0.02),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: TextFormField(
                        controller: _nameCtrl,
                        textCapitalization: TextCapitalization.words,
                        validator: (v) =>
                            Validators.required(v, 'Nom de la classe'),
                        style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                            color: colorScheme.onSurface),
                        decoration: InputDecoration(
                          hintText: 'ex: 3ème A, 2AS Groupe 1...',
                          hintStyle: TextStyle(
                              color: colors.mutedText,
                              fontWeight: FontWeight.normal),
                          prefixIcon: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Icon(Icons.drive_file_rename_outline_rounded,
                                color: colors.subtitleText),
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(20),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(20),
                            borderSide: BorderSide(
                                color: colorScheme.primary, width: 2),
                          ),
                          errorBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(20),
                            borderSide:
                                BorderSide(color: colors.dangerRed, width: 2),
                          ),
                          contentPadding:
                              const EdgeInsets.symmetric(vertical: 20),
                        ),
                      ),
                    ).animate().fadeIn(delay: 550.ms).slideY(begin: 0.1),

                    const SizedBox(height: 32),

                    Text(
                      'Sélection rapide',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: colorScheme.onSurface,
                      ),
                    ).animate().fadeIn(delay: 600.ms),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: _gradePresets.map((grade) {
                        final isSelected = _nameCtrl.text == grade;
                        return GestureDetector(
                          onTap: () {
                            setState(() => _nameCtrl.text = grade);
                            FocusScope.of(context).unfocus();
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeOutCubic,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 12),
                            decoration: BoxDecoration(
                              color:
                                  isSelected ? colors.tealDark : colors.cardBg,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                color: isSelected
                                    ? colors.tealDark
                                    : colors.cardBorder,
                                width: 1.5,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: colors.tealDark
                                            .withValues(alpha: 0.2),
                                        blurRadius: 12,
                                        offset: const Offset(0, 4),
                                      )
                                    ]
                                  : [
                                      BoxShadow(
                                        color: colorScheme.shadow
                                            .withValues(alpha: 0.02),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      )
                                    ],
                            ),
                            child: Text(
                              grade,
                              style: TextStyle(
                                color: isSelected
                                    ? colorScheme.onPrimary
                                    : colors.subtitleText,
                                fontWeight: isSelected
                                    ? FontWeight.w700
                                    : FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ).animate().fadeIn(delay: 650.ms),

                    const SizedBox(height: 40),

                    // Info box
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: colors.warningAmber.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: colors.warningAmber.withValues(alpha: 0.45)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color:
                                  colors.warningAmber.withValues(alpha: 0.24),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(Icons.lightbulb_outline_rounded,
                                color: colors.warningAmber, size: 20),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              'Les matières (Maths, Français...) et les professeurs sont ajoutés '
                              'après la création, depuis la page de gestion de la classe.',
                              style: TextStyle(
                                fontSize: 14,
                                color: colors.warningAmber,
                                height: 1.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 700.ms),

                    const SizedBox(height: 40),

                    // Create button
                    SizedBox(
                      width: double.infinity,
                      height: 60,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _create,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colorScheme.primary,
                          foregroundColor: colorScheme.onPrimary,
                          elevation: 0,
                          shadowColor:
                              colorScheme.primary.withValues(alpha: 0.4),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20)),
                        ),
                        child: _isLoading
                            ? SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(
                                    strokeWidth: 3,
                                    color: colorScheme.onPrimary),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.add_circle_outline_rounded,
                                      size: 22),
                                  SizedBox(width: 12),
                                  Text(
                                    'Créer la classe',
                                    style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5),
                                  ),
                                ],
                              ),
                      ),
                    ).animate().fadeIn(delay: 750.ms).slideY(begin: 0.2),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
