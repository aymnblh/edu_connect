import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../data/repositories/admin_repository.dart';

class CourseLibraryScreen extends ConsumerStatefulWidget {
  const CourseLibraryScreen({super.key});

  @override
  ConsumerState<CourseLibraryScreen> createState() =>
      _CourseLibraryScreenState();
}

class _CourseLibraryScreenState extends ConsumerState<CourseLibraryScreen> {
  final _nameController = TextEditingController();
  final _searchController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  _LibraryLanguage _selectedLanguage = _LibraryLanguage.fr;
  _SchoolCycle _selectedCycle = _SchoolCycle.primary;
  bool _isSaving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = _CourseLibraryText.of(context);
    final coursesAsync = ref.watch(schoolCoursesProvider);
    final courses = coursesAsync.valueOrNull ?? const <CourseModel>[];

    return Scaffold(
      appBar: AppBar(
        title: Text(text.title),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: Icon(Icons.adaptive.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/admin-tools');
            }
          },
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(schoolCoursesProvider),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 32),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _SuggestedCoursesPanel(
                      courses: courses,
                      isSaving: _isSaving,
                      searchController: _searchController,
                      selectedCycle: _selectedCycle,
                      selectedLanguage: _selectedLanguage,
                      onCycleChanged: (cycle) {
                        setState(() => _selectedCycle = cycle);
                      },
                      onLanguageChanged: (language) {
                        setState(() => _selectedLanguage = language);
                      },
                      onSearchChanged: (_) => setState(() {}),
                      onAddTemplate: (template) => _createCourseName(
                        template.name(_selectedLanguage),
                      ),
                    ),
                    const SizedBox(height: 18),
                    _AddCoursePanel(
                      formKey: _formKey,
                      controller: _nameController,
                      isSaving: _isSaving,
                      onSubmit: _createCourse,
                    ),
                    const SizedBox(height: 22),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            text.currentCourses,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        if (courses.isNotEmpty)
                          _CountBadge(label: '${courses.length}'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    coursesAsync.when(
                      loading: () => const ShimmerList(
                        itemCount: 4,
                        padding: EdgeInsetsDirectional.only(top: 8),
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                      ),
                      error: (error, _) => _StatePanel(
                        icon: Icons.error_outline,
                        message: text.loadError,
                        actionLabel: text.retry,
                        onAction: () => ref.invalidate(schoolCoursesProvider),
                      ),
                      data: (courses) {
                        if (courses.isEmpty) {
                          return _StatePanel(
                            icon: Icons.menu_book_outlined,
                            message: text.empty,
                          );
                        }

                        final sorted = List<CourseModel>.from(courses)
                          ..sort((a, b) => a.name.compareTo(b.name));
                        return Column(
                          children: [
                            for (final course in sorted)
                              _CourseTile(course: course),
                          ],
                        );
                      },
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _createCourse() async {
    if (!_formKey.currentState!.validate()) return;
    await _createCourseName(_nameController.text.trim(), clearManual: true);
  }

  Future<void> _createCourseName(
    String name, {
    bool clearManual = false,
  }) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty || _isSaving) return;

    final text = _CourseLibraryText.of(context);
    final colors = context.appColors;
    final courses = ref.read(schoolCoursesProvider).valueOrNull ?? [];
    if (_courseNameExists(trimmed, courses)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(text.alreadyAdded)),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      await ref.read(adminRepositoryProvider).createCourse(name: trimmed);
      if (clearManual) _nameController.clear();
      ref.invalidate(schoolCoursesProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(text.created),
          backgroundColor: colors.successGreen,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${text.error}: $error'),
          backgroundColor: colors.dangerRed,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }
}

class _SuggestedCoursesPanel extends StatelessWidget {
  final List<CourseModel> courses;
  final TextEditingController searchController;
  final _SchoolCycle selectedCycle;
  final _LibraryLanguage selectedLanguage;
  final bool isSaving;
  final ValueChanged<_SchoolCycle> onCycleChanged;
  final ValueChanged<_LibraryLanguage> onLanguageChanged;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<_CourseTemplate> onAddTemplate;

  const _SuggestedCoursesPanel({
    required this.courses,
    required this.searchController,
    required this.selectedCycle,
    required this.selectedLanguage,
    required this.isSaving,
    required this.onCycleChanged,
    required this.onLanguageChanged,
    required this.onSearchChanged,
    required this.onAddTemplate,
  });

  @override
  Widget build(BuildContext context) {
    final text = _CourseLibraryText.of(context);
    final colors = context.appColors;
    final query = searchController.text;
    final suggestions = _courseTemplates
        .where((template) => template.cycle == selectedCycle)
        .where((template) => template.matches(query))
        .toList();

    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const _IconBox(icon: Icons.library_books_outlined),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      text.officialCatalog,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      text.officialCatalogHelp,
                      style: TextStyle(
                        color: colors.subtitleText,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _ChoiceGroup<_LibraryLanguage>(
            label: text.displayLanguage,
            values: _LibraryLanguage.values,
            selected: selectedLanguage,
            labelFor: (language) => language.label,
            onChanged: onLanguageChanged,
          ),
          const SizedBox(height: 12),
          _ChoiceGroup<_SchoolCycle>(
            label: text.cycle,
            values: _SchoolCycle.values,
            selected: selectedCycle,
            labelFor: (cycle) => cycle.label(text),
            onChanged: onCycleChanged,
          ),
          const SizedBox(height: 14),
          TextField(
            controller: searchController,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: text.search,
              prefixIcon: const Icon(Icons.search),
              suffixIcon: query.isEmpty
                  ? null
                  : IconButton(
                      tooltip: text.clear,
                      icon: const Icon(Icons.close),
                      onPressed: () {
                        searchController.clear();
                        onSearchChanged('');
                      },
                    ),
            ),
            onChanged: onSearchChanged,
          ),
          const SizedBox(height: 14),
          if (suggestions.isEmpty)
            _StatePanel(
              icon: Icons.search_off_outlined,
              message: text.noSuggestions,
            )
          else
            LayoutBuilder(
              builder: (context, constraints) {
                const gap = 10.0;
                final columns = constraints.maxWidth >= 720 ? 2 : 1;
                final itemWidth =
                    (constraints.maxWidth - gap * (columns - 1)) / columns;

                return Wrap(
                  spacing: gap,
                  runSpacing: gap,
                  children: [
                    for (final template in suggestions)
                      SizedBox(
                        width: itemWidth,
                        child: _TemplateCourseButton(
                          template: template,
                          language: selectedLanguage,
                          isAdded: _templateAlreadyAdded(template, courses),
                          isSaving: isSaving,
                          onTap: () => onAddTemplate(template),
                        ),
                      ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}

class _AddCoursePanel extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController controller;
  final bool isSaving;
  final VoidCallback onSubmit;

  const _AddCoursePanel({
    required this.formKey,
    required this.controller,
    required this.isSaving,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final text = _CourseLibraryText.of(context);
    final colors = context.appColors;
    return _Panel(
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const _IconBox(icon: Icons.add_circle_outline),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        text.addCourse,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        text.addCourseHelp,
                        style: TextStyle(color: colors.subtitleText),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: controller,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                labelText: text.courseName,
                hintText: text.courseHint,
                prefixIcon: const Icon(Icons.edit_note_outlined),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return text.requiredField;
                }
                if (value.trim().length < 2) return text.tooShort;
                return null;
              },
              onFieldSubmitted: (_) {
                if (!isSaving) onSubmit();
              },
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: isSaving ? null : onSubmit,
                icon: isSaving
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      )
                    : const Icon(Icons.add),
                label: Text(isSaving ? text.saving : text.add),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TemplateCourseButton extends StatelessWidget {
  final _CourseTemplate template;
  final _LibraryLanguage language;
  final bool isAdded;
  final bool isSaving;
  final VoidCallback onTap;

  const _TemplateCourseButton({
    required this.template,
    required this.language,
    required this.isAdded,
    required this.isSaving,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final text = _CourseLibraryText.of(context);
    final colors = context.appColors;
    final enabled = !isAdded && !isSaving;

    return Semantics(
      button: true,
      enabled: enabled,
      label: template.name(language),
      child: Opacity(
        opacity: isAdded ? 0.62 : 1,
        child: Material(
          color: colors.cardBg,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: enabled ? onTap : null,
            child: Container(
              constraints: const BoxConstraints(minHeight: 76),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isAdded ? colors.successGreen : colors.cardBorder,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    isAdded ? Icons.check_circle : Icons.add_circle_outline,
                    color: isAdded ? colors.successGreen : colors.tealDark,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          template.name(language),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isAdded
                              ? text.alreadyAdded
                              : template.scope(language),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isAdded
                                ? colors.successGreen
                                : colors.subtitleText,
                            fontSize: 12,
                            fontWeight:
                                isAdded ? FontWeight.w700 : FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CourseTile extends StatelessWidget {
  final CourseModel course;

  const _CourseTile({required this.course});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      margin: const EdgeInsetsDirectional.only(bottom: 8),
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colors.cardBorder),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: colors.tealLight,
          child: Icon(Icons.auto_stories_rounded, color: colors.tealDark),
        ),
        title: Text(
          course.name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

class _ChoiceGroup<T> extends StatelessWidget {
  final String label;
  final List<T> values;
  final T selected;
  final String Function(T value) labelFor;
  final ValueChanged<T> onChanged;

  const _ChoiceGroup({
    required this.label,
    required this.values,
    required this.selected,
    required this.labelFor,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: colors.mutedText,
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final value in values)
              ChoiceChip(
                label: Text(labelFor(value)),
                selected: value == selected,
                onSelected: (_) => onChanged(value),
              ),
          ],
        ),
      ],
    );
  }
}

class _Panel extends StatelessWidget {
  final Widget child;

  const _Panel({required this.child});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colors.cardBorder),
      ),
      child: child,
    );
  }
}

class _IconBox extends StatelessWidget {
  final IconData icon;

  const _IconBox({required this.icon});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: colors.tealLight,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: colors.tealDark, size: 22),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final String label;

  const _CountBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: colors.tealLight,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: colors.tealDark,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _StatePanel extends StatelessWidget {
  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _StatePanel({
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: colors.glassSurface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colors.cardBorder),
      ),
      child: Column(
        children: [
          Icon(icon, color: colors.subtitleText, size: 32),
          const SizedBox(height: 10),
          Text(message, textAlign: TextAlign.center),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: onAction,
              child: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}

enum _LibraryLanguage {
  fr('FR'),
  ar('AR'),
  en('EN');

  final String label;

  const _LibraryLanguage(this.label);
}

enum _SchoolCycle {
  primary,
  middle,
  secondary;

  String label(_CourseLibraryText text) {
    switch (this) {
      case _SchoolCycle.primary:
        return text.primary;
      case _SchoolCycle.middle:
        return text.middle;
      case _SchoolCycle.secondary:
        return text.secondary;
    }
  }
}

class _CourseTemplate {
  final _SchoolCycle cycle;
  final String fr;
  final String ar;
  final String en;
  final String scopeFr;
  final String scopeAr;
  final String scopeEn;

  const _CourseTemplate({
    required this.cycle,
    required this.fr,
    required this.ar,
    required this.en,
    required this.scopeFr,
    required this.scopeAr,
    required this.scopeEn,
  });

  String name(_LibraryLanguage language) {
    switch (language) {
      case _LibraryLanguage.fr:
        return fr;
      case _LibraryLanguage.ar:
        return ar;
      case _LibraryLanguage.en:
        return en;
    }
  }

  String scope(_LibraryLanguage language) {
    switch (language) {
      case _LibraryLanguage.fr:
        return scopeFr;
      case _LibraryLanguage.ar:
        return scopeAr;
      case _LibraryLanguage.en:
        return scopeEn;
    }
  }

  List<String> get allNames => [fr, ar, en];

  bool matches(String query) {
    final normalizedQuery = _normalizeCourseName(query);
    if (normalizedQuery.isEmpty) return true;

    return [
      fr,
      ar,
      en,
      scopeFr,
      scopeAr,
      scopeEn,
    ].any((value) => _normalizeCourseName(value).contains(normalizedQuery));
  }
}

bool _courseNameExists(String name, List<CourseModel> courses) {
  final normalized = _normalizeCourseName(name);
  return courses.any(
    (course) => _namesEquivalent(_normalizeCourseName(course.name), normalized),
  );
}

bool _templateAlreadyAdded(
  _CourseTemplate template,
  List<CourseModel> courses,
) {
  final existing = courses.map((course) => _normalizeCourseName(course.name));
  return template.allNames.map(_normalizeCourseName).any(
        (name) => existing.any(
          (courseName) => _namesEquivalent(courseName, name),
        ),
      );
}

bool _namesEquivalent(String left, String right) {
  if (left == right) return true;
  if (left.length < 6 || right.length < 6) return false;
  return left.contains(right) || right.contains(left);
}

String _normalizeCourseName(String value) {
  var normalized = value.trim().toLowerCase();
  normalized = normalized.replaceAll(RegExp('[\u064b-\u065f]'), '');
  normalized = normalized.replaceAll(RegExp('[\u00e0-\u00e5]'), 'a');
  normalized = normalized.replaceAll(RegExp('[\u00e8-\u00eb]'), 'e');
  normalized = normalized.replaceAll(RegExp('[\u00ec-\u00ef]'), 'i');
  normalized = normalized.replaceAll(RegExp('[\u00f2-\u00f6]'), 'o');
  normalized = normalized.replaceAll(RegExp('[\u00f9-\u00fc]'), 'u');
  normalized = normalized.replaceAll(RegExp('[\u00e7]'), 'c');
  normalized = normalized.replaceAll(RegExp('[^a-z0-9\u0600-\u06ff]+'), ' ');
  return normalized.trim().replaceAll(RegExp(r'\s+'), ' ');
}

const _primaryEarly = 'Primaire 1-2';
const _primaryUpper = 'Primaire 3-5';
const _middleScope = 'Moyen 1AM-4AM';
const _secondaryCommon = 'Lycee - socle commun';
const _secondaryScience = 'Lycee - sciences';
const _secondaryTech = 'Lycee - technique';
const _secondaryLetters = 'Lycee - lettres';
const _secondaryLanguages = 'Lycee - langues';
const _secondaryEconomics = 'Lycee - gestion';
const _secondaryArts = 'Lycee - arts';

const _courseTemplates = <_CourseTemplate>[
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Langue arabe',
    ar: 'اللغة العربية',
    en: 'Arabic Language',
    scopeFr: _primaryEarly,
    scopeAr: 'الابتدائي 1-2',
    scopeEn: 'Primary 1-2',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Education islamique',
    ar: 'التربية الإسلامية',
    en: 'Islamic Education',
    scopeFr: _primaryEarly,
    scopeAr: 'الابتدائي 1-2',
    scopeEn: 'Primary 1-2',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Mathematiques',
    ar: 'الرياضيات',
    en: 'Mathematics',
    scopeFr: _primaryEarly,
    scopeAr: 'الابتدائي 1-2',
    scopeEn: 'Primary 1-2',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Education artistique',
    ar: 'التربية الفنية',
    en: 'Art Education',
    scopeFr: _primaryEarly,
    scopeAr: 'الابتدائي 1-2',
    scopeEn: 'Primary 1-2',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Education physique et sportive',
    ar: 'التربية البدنية والرياضية',
    en: 'Physical Education',
    scopeFr: _primaryEarly,
    scopeAr: 'الابتدائي 1-2',
    scopeEn: 'Primary 1-2',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Histoire et geographie',
    ar: 'التاريخ والجغرافيا',
    en: 'History and Geography',
    scopeFr: _primaryUpper,
    scopeAr: 'الابتدائي 3-5',
    scopeEn: 'Primary 3-5',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Education civique',
    ar: 'التربية المدنية',
    en: 'Civics',
    scopeFr: _primaryUpper,
    scopeAr: 'الابتدائي 3-5',
    scopeEn: 'Primary 3-5',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Education scientifique et technologique',
    ar: 'التربية العلمية والتكنولوجية',
    en: 'Scientific and Technological Education',
    scopeFr: _primaryUpper,
    scopeAr: 'الابتدائي 3-5',
    scopeEn: 'Primary 3-5',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Langue francaise',
    ar: 'اللغة الفرنسية',
    en: 'French Language',
    scopeFr: _primaryUpper,
    scopeAr: 'الابتدائي 3-5',
    scopeEn: 'Primary 3-5',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Langue anglaise',
    ar: 'اللغة الإنجليزية',
    en: 'English Language',
    scopeFr: _primaryUpper,
    scopeAr: 'الابتدائي 3-5',
    scopeEn: 'Primary 3-5',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.primary,
    fr: 'Langue amazighe',
    ar: 'اللغة الأمازيغية',
    en: 'Tamazight Language',
    scopeFr: _primaryUpper,
    scopeAr: 'الابتدائي 4-5',
    scopeEn: 'Primary 4-5',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Langue arabe',
    ar: 'اللغة العربية',
    en: 'Arabic Language',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Langue amazighe',
    ar: 'اللغة الأمازيغية',
    en: 'Tamazight Language',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Langue francaise',
    ar: 'اللغة الفرنسية',
    en: 'French Language',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Langue anglaise',
    ar: 'اللغة الإنجليزية',
    en: 'English Language',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Mathematiques',
    ar: 'الرياضيات',
    en: 'Mathematics',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Sciences de la nature et de la vie',
    ar: 'علوم الطبيعة والحياة',
    en: 'Natural and Life Sciences',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Sciences physiques et technologie',
    ar: 'العلوم الفيزيائية والتكنولوجيا',
    en: 'Physical Sciences and Technology',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Informatique',
    ar: 'الإعلام الآلي',
    en: 'Computer Science',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Education islamique',
    ar: 'التربية الإسلامية',
    en: 'Islamic Education',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Histoire et geographie',
    ar: 'التاريخ والجغرافيا',
    en: 'History and Geography',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Education civique',
    ar: 'التربية المدنية',
    en: 'Civics',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Education artistique',
    ar: 'التربية الفنية',
    en: 'Art Education',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.middle,
    fr: 'Education physique et sportive',
    ar: 'التربية البدنية والرياضية',
    en: 'Physical Education',
    scopeFr: _middleScope,
    scopeAr: 'المتوسط 1-4',
    scopeEn: 'Middle 1-4',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Langue arabe',
    ar: 'اللغة العربية',
    en: 'Arabic Language',
    scopeFr: _secondaryCommon,
    scopeAr: 'الثانوي - مواد مشتركة',
    scopeEn: 'High school - common',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Langue francaise',
    ar: 'اللغة الفرنسية',
    en: 'French Language',
    scopeFr: _secondaryCommon,
    scopeAr: 'الثانوي - مواد مشتركة',
    scopeEn: 'High school - common',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Langue anglaise',
    ar: 'اللغة الإنجليزية',
    en: 'English Language',
    scopeFr: _secondaryCommon,
    scopeAr: 'الثانوي - مواد مشتركة',
    scopeEn: 'High school - common',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Histoire et geographie',
    ar: 'التاريخ والجغرافيا',
    en: 'History and Geography',
    scopeFr: _secondaryCommon,
    scopeAr: 'الثانوي - مواد مشتركة',
    scopeEn: 'High school - common',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Education islamique',
    ar: 'التربية الإسلامية',
    en: 'Islamic Education',
    scopeFr: _secondaryCommon,
    scopeAr: 'الثانوي - مواد مشتركة',
    scopeEn: 'High school - common',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Education physique et sportive',
    ar: 'التربية البدنية والرياضية',
    en: 'Physical Education',
    scopeFr: _secondaryCommon,
    scopeAr: 'الثانوي - مواد مشتركة',
    scopeEn: 'High school - common',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Mathematiques',
    ar: 'الرياضيات',
    en: 'Mathematics',
    scopeFr: _secondaryScience,
    scopeAr: 'الثانوي - علوم',
    scopeEn: 'High school - science',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Physique-chimie',
    ar: 'الفيزياء والكيمياء',
    en: 'Physics and Chemistry',
    scopeFr: _secondaryScience,
    scopeAr: 'الثانوي - علوم',
    scopeEn: 'High school - science',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Sciences de la nature et de la vie',
    ar: 'علوم الطبيعة والحياة',
    en: 'Natural and Life Sciences',
    scopeFr: _secondaryScience,
    scopeAr: 'الثانوي - علوم',
    scopeEn: 'High school - science',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Technologie',
    ar: 'التكنولوجيا',
    en: 'Technology',
    scopeFr: _secondaryTech,
    scopeAr: 'الثانوي - تقني رياضي',
    scopeEn: 'High school - technical math',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Genie civil',
    ar: 'هندسة مدنية',
    en: 'Civil Engineering',
    scopeFr: _secondaryTech,
    scopeAr: 'الثانوي - تقني رياضي',
    scopeEn: 'High school - technical math',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Genie mecanique',
    ar: 'هندسة ميكانيكية',
    en: 'Mechanical Engineering',
    scopeFr: _secondaryTech,
    scopeAr: 'الثانوي - تقني رياضي',
    scopeEn: 'High school - technical math',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Genie electrique',
    ar: 'هندسة كهربائية',
    en: 'Electrical Engineering',
    scopeFr: _secondaryTech,
    scopeAr: 'الثانوي - تقني رياضي',
    scopeEn: 'High school - technical math',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Genie des procedes',
    ar: 'هندسة الطرائق',
    en: 'Process Engineering',
    scopeFr: _secondaryTech,
    scopeAr: 'الثانوي - تقني رياضي',
    scopeEn: 'High school - technical math',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Informatique',
    ar: 'الإعلام الآلي',
    en: 'Computer Science',
    scopeFr: 'Lycee - numerique',
    scopeAr: 'الثانوي - الرقمنة',
    scopeEn: 'High school - digital',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Technologies numeriques',
    ar: 'التقنيات الرقمية',
    en: 'Digital Technologies',
    scopeFr: 'Lycee - numerique',
    scopeAr: 'الثانوي - الرقمنة',
    scopeEn: 'High school - digital',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Systemes d information',
    ar: 'نظم المعلومات',
    en: 'Information Systems',
    scopeFr: 'Lycee - numerique',
    scopeAr: 'الثانوي - الرقمنة',
    scopeEn: 'High school - digital',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Philosophie',
    ar: 'الفلسفة',
    en: 'Philosophy',
    scopeFr: _secondaryLetters,
    scopeAr: 'الثانوي - آداب',
    scopeEn: 'High school - letters',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Espagnol',
    ar: 'الإسبانية',
    en: 'Spanish',
    scopeFr: _secondaryLanguages,
    scopeAr: 'الثانوي - لغات',
    scopeEn: 'High school - languages',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Allemand',
    ar: 'الألمانية',
    en: 'German',
    scopeFr: _secondaryLanguages,
    scopeAr: 'الثانوي - لغات',
    scopeEn: 'High school - languages',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Italien',
    ar: 'الإيطالية',
    en: 'Italian',
    scopeFr: _secondaryLanguages,
    scopeAr: 'الثانوي - لغات',
    scopeEn: 'High school - languages',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Russe',
    ar: 'الروسية',
    en: 'Russian',
    scopeFr: _secondaryLanguages,
    scopeAr: 'الثانوي - لغات',
    scopeEn: 'High school - languages',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Comptabilite et finance',
    ar: 'المحاسبة والمالية',
    en: 'Accounting and Finance',
    scopeFr: _secondaryEconomics,
    scopeAr: 'الثانوي - تسيير واقتصاد',
    scopeEn: 'High school - management',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Economie',
    ar: 'الاقتصاد',
    en: 'Economics',
    scopeFr: _secondaryEconomics,
    scopeAr: 'الثانوي - تسيير واقتصاد',
    scopeEn: 'High school - management',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Management',
    ar: 'المناجمنت',
    en: 'Management',
    scopeFr: _secondaryEconomics,
    scopeAr: 'الثانوي - تسيير واقتصاد',
    scopeEn: 'High school - management',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Droit',
    ar: 'القانون',
    en: 'Law',
    scopeFr: _secondaryEconomics,
    scopeAr: 'الثانوي - تسيير واقتصاد',
    scopeEn: 'High school - management',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Histoire de l art',
    ar: 'تاريخ الفن',
    en: 'History of Art',
    scopeFr: _secondaryArts,
    scopeAr: 'الثانوي - فنون',
    scopeEn: 'High school - arts',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Arts plastiques',
    ar: 'فنون تشكيلية',
    en: 'Visual Arts',
    scopeFr: _secondaryArts,
    scopeAr: 'الثانوي - فنون',
    scopeEn: 'High school - arts',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Musique',
    ar: 'موسيقى',
    en: 'Music',
    scopeFr: _secondaryArts,
    scopeAr: 'الثانوي - فنون',
    scopeEn: 'High school - arts',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Theatre',
    ar: 'مسرح',
    en: 'Theatre',
    scopeFr: _secondaryArts,
    scopeAr: 'الثانوي - فنون',
    scopeEn: 'High school - arts',
  ),
  _CourseTemplate(
    cycle: _SchoolCycle.secondary,
    fr: 'Cinema et audiovisuel',
    ar: 'سينما وسمعي بصري',
    en: 'Cinema and Audiovisual',
    scopeFr: _secondaryArts,
    scopeAr: 'الثانوي - فنون',
    scopeEn: 'High school - arts',
  ),
];

class _CourseLibraryText {
  final String languageCode;

  const _CourseLibraryText(this.languageCode);

  static _CourseLibraryText of(BuildContext context) =>
      _CourseLibraryText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String pick(String ar, String fr, String en) => _ar
      ? ar
      : _fr
          ? fr
          : en;

  String get title => pick(
        'مكتبة المواد',
        'Bibliotheque des modules',
        'Module library',
      );
  String get officialCatalog => pick(
        'برنامج الجزائر 2026',
        'Catalogue Algerie 2026',
        'Algeria 2026 catalogue',
      );
  String get officialCatalogHelp => pick(
        'اختر اللغة والطور ثم اضغط على المادة لاضافتها.',
        'Choisissez la langue et le cycle, puis touchez un module.',
        'Choose the language and cycle, then tap a module to add it.',
      );
  String get displayLanguage => pick('اللغة', 'Langue', 'Language');
  String get cycle => pick('الطور', 'Cycle', 'Cycle');
  String get search => pick(
        'البحث عن مادة',
        'Rechercher un module',
        'Search modules',
      );
  String get clear => pick('مسح', 'Effacer', 'Clear');
  String get primary => pick('ابتدائي', 'Primaire', 'Primary');
  String get middle => pick('متوسط', 'Moyen', 'Middle');
  String get secondary => pick('ثانوي', 'Lycee', 'High school');
  String get noSuggestions => pick(
        'لم يتم العثور على مادة. يمكنك اضافتها يدويا في الاسفل.',
        'Aucun module trouve. Ajoutez-le manuellement ci-dessous.',
        'No module found. Add it manually below.',
      );
  String get currentCourses => pick(
        'المواد الحالية',
        'Modules actuels',
        'Current modules',
      );
  String get loadError => pick(
        'تعذر تحميل المواد.',
        'Impossible de charger les modules.',
        'Unable to load modules.',
      );
  String get retry => pick('اعادة المحاولة', 'Reessayer', 'Retry');
  String get empty => pick(
        'لم يتم انشاء اي مادة لهذه المدرسة.',
        'Aucun module cree pour cette ecole.',
        'No module has been created for this school.',
      );
  String get created => pick(
        'تمت اضافة المادة.',
        'Module ajoute.',
        'Module added.',
      );
  String get alreadyAdded => pick(
        'مضاف مسبقا',
        'Deja ajoute',
        'Already added',
      );
  String get error => pick('خطأ', 'Erreur', 'Error');
  String get addCourse => pick(
        'المادة غير موجودة؟',
        'Module non disponible ?',
        'Missing module?',
      );
  String get addCourseHelp => pick(
        'اكتب اسم المادة يدويا اذا لم تجدها في القائمة.',
        'Ajoutez un module manuel si le catalogue ne le propose pas.',
        'Add a custom module if it is not in the catalogue.',
      );
  String get courseName => pick(
        'اسم المادة',
        'Nom du module',
        'Module name',
      );
  String get courseHint => pick(
        'مثال: هندسة مدنية، موسيقى، انجليزية...',
        'Ex: Genie civil, Musique, Anglais...',
        'Ex: Civil Engineering, Music, English...',
      );
  String get requiredField => pick('حقل مطلوب', 'Champ requis', 'Required');
  String get tooShort => pick(
        'الاسم قصير جدا',
        'Nom trop court',
        'Name too short',
      );
  String get saving => pick(
        'جار الاضافة...',
        'Ajout en cours...',
        'Adding...',
      );
  String get add => pick('اضافة', 'Ajouter', 'Add');
}
