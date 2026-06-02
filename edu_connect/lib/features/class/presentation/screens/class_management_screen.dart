import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../data/repositories/admin_repository.dart';
import '../../data/repositories/student_repository.dart';
import '../../data/models/class_model.dart';
import '../providers/class_provider.dart';

// ── Page entry point ─────────────────────────────────────────────────────────

class ClassManagementScreen extends ConsumerStatefulWidget {
  final String classId;
  const ClassManagementScreen({super.key, required this.classId});

  @override
  ConsumerState<ClassManagementScreen> createState() =>
      _ClassManagementScreenState();
}

class _ClassManagementScreenState extends ConsumerState<ClassManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final classAsync = ref.watch(classDetailProvider(widget.classId));

    return classAsync.when(
      loading: () => const Scaffold(body: ShimmerDashboard()),
      error: (e, _) => Scaffold(body: Center(child: Text('Erreur: $e'))),
      data: (cls) => _buildScaffold(cls),
    );
  }

  Widget _buildScaffold(ClassModel cls) {
    final colors = context.appColors;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(cls.name,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
            Text('Gestion de la classe',
                style: TextStyle(fontSize: 12, color: colors.subtitleText)),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.people_outline), text: 'Élèves'),
            Tab(icon: Icon(Icons.menu_book_outlined), text: 'Programme'),
            Tab(icon: Icon(Icons.info_outline), text: 'Aperçu'),
          ],
          labelColor: colors.tealDark,
          unselectedLabelColor: colors.mutedText,
          indicatorColor: colors.tealDark,
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _StudentsTab(classId: widget.classId),
          _ProgramTab(classId: widget.classId),
          _OverviewTab(cls: cls),
        ],
      ),
    );
  }
}

// ── Tab 1: Students Enrollment ────────────────────────────────────────────────

class _StudentsTab extends ConsumerStatefulWidget {
  final String classId;
  const _StudentsTab({required this.classId});

  @override
  ConsumerState<_StudentsTab> createState() => _StudentsTabState();
}

class _StudentsTabState extends ConsumerState<_StudentsTab> {
  final Set<String> _selectedIds = {};
  bool _initialized = false;
  bool _isSaving = false;
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final allStudentsAsync = ref.watch(schoolStudentsProvider);
    final classAsync = ref.watch(classDetailProvider(widget.classId));
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;

    // Pre-select already enrolled students on first load
    if (!_initialized) {
      classAsync.whenData((cls) {
        if (cls.members.isNotEmpty && _selectedIds.isEmpty) {
          setState(() {
            _selectedIds.addAll(cls.members.map((m) => m.id));
            _initialized = true;
          });
        } else {
          _initialized = true;
        }
      });
    }

    return allStudentsAsync.when(
      loading: () => const ShimmerList(
        itemCount: 6,
        padding: EdgeInsets.all(16),
      ),
      error: (e, _) => Center(child: Text('Erreur chargement élèves: $e')),
      data: (students) {
        final filtered = students
            .where((s) =>
                s.fullName.toLowerCase().contains(_search.toLowerCase()) ||
                (s.studentId?.toLowerCase().contains(_search.toLowerCase()) ??
                    false))
            .toList();

        return Column(
          children: [
            // Header with count + save button
            Container(
              color: colors.glassSurface,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      onChanged: (v) => setState(() => _search = v),
                      decoration: InputDecoration(
                        hintText: 'Rechercher un élève...',
                        prefixIcon: const Icon(Icons.search, size: 20),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        isDense: true,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.inputBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.inputBorder),
                        ),
                        filled: true,
                        fillColor: colors.inputBg,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  FilledButton.icon(
                    onPressed: _isSaving ? null : () => _save(context),
                    icon: _isSaving
                        ? SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: colorScheme.onPrimary))
                        : const Icon(Icons.save_outlined, size: 18),
                    label: Text('Enregistrer (${_selectedIds.length})'),
                    style: FilledButton.styleFrom(
                      backgroundColor: colors.tealDark,
                      foregroundColor: colorScheme.onPrimary,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                    ),
                  ),
                ],
              ),
            ),
            // Student list
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.person_search,
                              size: 56, color: colors.cardBorder),
                          const SizedBox(height: 12),
                          Text('Aucun élève trouvé',
                              style: TextStyle(color: colors.subtitleText)),
                          const SizedBox(height: 8),
                          Text(
                            'Ajoutez d\'abord des élèves depuis\nl\'outil Administration.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: colors.mutedText, fontSize: 12),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) =>
                          Divider(height: 1, color: colors.dividerColor),
                      itemBuilder: (ctx, i) {
                        final s = filtered[i];
                        final isSelected = _selectedIds.contains(s.id);
                        return ListTile(
                          leading: CircleAvatar(
                            radius: 20,
                            backgroundColor:
                                isSelected ? colors.tealDark : colors.inputBg,
                            child: Text(
                              s.fullName[0].toUpperCase(),
                              style: TextStyle(
                                color: isSelected
                                    ? colorScheme.onPrimary
                                    : colors.subtitleText,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          title: Text(s.fullName,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w500)),
                          subtitle: s.studentId != null
                              ? Text(s.studentId!,
                                  style: TextStyle(
                                      color: colors.subtitleText, fontSize: 12))
                              : null,
                          trailing: isSelected
                              ? Icon(Icons.check_circle, color: colors.tealDark)
                              : Icon(Icons.circle_outlined,
                                  color: colors.mutedText),
                          onTap: () => setState(() {
                            if (isSelected) {
                              _selectedIds.remove(s.id);
                            } else {
                              _selectedIds.add(s.id);
                            }
                          }),
                          selected: isSelected,
                          selectedTileColor:
                              colors.tealLight.withValues(alpha: 0.25),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _save(BuildContext context) async {
    final colors = context.appColors;

    setState(() => _isSaving = true);
    try {
      await ref.read(adminRepositoryProvider).enrollStudents(
            classId: widget.classId,
            studentIds: _selectedIds.toList(),
          );
      ref.invalidate(classDetailProvider(widget.classId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content:
                Text('${_selectedIds.length} élève(s) inscrits avec succès'),
            backgroundColor: colors.successGreen,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Erreur: $e'), backgroundColor: colors.dangerRed),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }
}

// ── Tab 2: Program (Courses + Teachers) ──────────────────────────────────────

class _ProgramTab extends ConsumerStatefulWidget {
  final String classId;
  const _ProgramTab({required this.classId});

  @override
  ConsumerState<_ProgramTab> createState() => _ProgramTabState();
}

class _ProgramTabState extends ConsumerState<_ProgramTab> {
  String? _selectedCourseId;
  String? _selectedTeacherId;
  final _coefficientCtrl = TextEditingController(text: '1');
  bool _isAdding = false;

  @override
  void dispose() {
    _coefficientCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final coursesAsync = ref.watch(schoolCoursesProvider);
    final teachersAsync = ref.watch(schoolTeachersProvider);
    final classCourseAsync = ref.watch(classCoursesProvider(widget.classId));
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        // ── Add course form ────────────────────────────────────────────
        Container(
          color: colors.glassSurface,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Ajouter une matière',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () => context.push('/admin-tools/courses'),
                  icon: const Icon(Icons.library_books_outlined, size: 18),
                  label: const Text('Bibliotheque'),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  // Course dropdown
                  Expanded(
                    child: coursesAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (_, __) => const Text('Erreur matières'),
                      data: (courses) => DropdownButtonFormField<String>(
                        initialValue: _selectedCourseId,
                        isExpanded: true,
                        decoration: InputDecoration(
                          labelText: 'Matière',
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          isDense: true,
                          filled: true,
                          fillColor: colors.inputBg,
                        ),
                        items: courses
                            .map((c) => DropdownMenuItem(
                                value: c.id,
                                child: Text(c.name,
                                    overflow: TextOverflow.ellipsis)))
                            .toList(),
                        onChanged: (v) => setState(() {
                          _selectedCourseId = v;
                          for (final course in courses) {
                            if (course.id == v) {
                              _coefficientCtrl.text =
                                  _formatCoefficient(course.coefficient);
                              break;
                            }
                          }
                        }),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Teacher dropdown
                  Expanded(
                    child: teachersAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (_, __) => const Text('Aucun prof'),
                      data: (teachers) => teachers.isEmpty
                          ? Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                border: Border.all(color: colors.warningAmber),
                                borderRadius: BorderRadius.circular(10),
                                color:
                                    colors.warningAmber.withValues(alpha: 0.12),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.warning_outlined,
                                      color: colors.warningAmber, size: 16),
                                  const SizedBox(width: 6),
                                  Expanded(
                                      child: Text(
                                          'Créez d\'abord un professeur',
                                          style: TextStyle(
                                              fontSize: 11,
                                              color: colors.warningAmber))),
                                ],
                              ),
                            )
                          : DropdownButtonFormField<String>(
                              initialValue: _selectedTeacherId,
                              isExpanded: true,
                              decoration: InputDecoration(
                                labelText: 'Professeur',
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 10),
                                border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10)),
                                isDense: true,
                                filled: true,
                                fillColor: colors.inputBg,
                              ),
                              items: teachers
                                  .map((t) => DropdownMenuItem(
                                      value: t.id,
                                      child: Text(t.fullName,
                                          overflow: TextOverflow.ellipsis)))
                                  .toList(),
                              onChanged: (v) =>
                                  setState(() => _selectedTeacherId = v),
                            ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 96,
                    child: TextField(
                      controller: _coefficientCtrl,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        labelText: 'Coef.',
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10)),
                        isDense: true,
                        filled: true,
                        fillColor: colors.inputBg,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Add button
                  FilledButton(
                    onPressed: (_isAdding ||
                            _selectedCourseId == null ||
                            _selectedTeacherId == null ||
                            _parsedCoefficient == null)
                        ? null
                        : () => _assignCourse(context),
                    style: FilledButton.styleFrom(
                      backgroundColor: colors.tealDark,
                      foregroundColor: colorScheme.onPrimary,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 14),
                    ),
                    child: _isAdding
                        ? SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: colorScheme.onPrimary))
                        : const Icon(Icons.add),
                  ),
                ],
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        // ── Assigned courses list ──────────────────────────────────────
        Expanded(
          child: classCourseAsync.when(
            loading: () => const ShimmerList(
              itemCount: 5,
              padding: EdgeInsets.all(16),
            ),
            error: (e, _) => Center(child: Text('Erreur: $e')),
            data: (classCourses) => classCourses.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.menu_book,
                            size: 60, color: colors.cardBorder),
                        const SizedBox(height: 16),
                        Text(
                          'Aucune matière affectée',
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: colors.subtitleText),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Sélectionnez une matière et un professeur\npuis cliquez sur +',
                          textAlign: TextAlign.center,
                          style:
                              TextStyle(color: colors.mutedText, fontSize: 13),
                        ),
                      ],
                    ).animate().fadeIn(),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: classCourses.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (ctx, i) {
                      final cc = classCourses[i];
                      return Container(
                        decoration: BoxDecoration(
                          color: colors.cardBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: colors.cardBorder),
                        ),
                        child: ListTile(
                          leading: Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: colors.inputBg,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(Icons.menu_book,
                                color: colors.tealDark, size: 22),
                          ),
                          title: Text(
                            cc.courseName ?? cc.courseId,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.person,
                                      size: 12, color: colors.mutedText),
                                  const SizedBox(width: 4),
                                  Text(
                                    cc.teacherName ?? 'Prof inconnu',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                ],
                              ),
                              Text(
                                'Coef. ${_formatCoefficient(cc.coefficient)}',
                                style: TextStyle(
                                    color: colors.mutedText, fontSize: 12),
                              ),
                            ],
                          ),
                          trailing: IconButton(
                            icon: Icon(Icons.delete_outline,
                                color: colors.dangerRed, size: 20),
                            onPressed: () => _removeCourse(context, cc.courseId,
                                cc.courseName ?? 'cette matière'),
                          ),
                        ),
                      ).animate().fadeIn(delay: Duration(milliseconds: i * 60));
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Future<void> _assignCourse(BuildContext context) async {
    final colors = context.appColors;

    setState(() => _isAdding = true);
    try {
      await ref.read(adminRepositoryProvider).assignCourseToClass(
            classId: widget.classId,
            courseId: _selectedCourseId!,
            teacherId: _selectedTeacherId!,
            coefficient: _parsedCoefficient!,
          );
      ref.invalidate(classCoursesProvider(widget.classId));
      setState(() {
        _selectedCourseId = null;
        _selectedTeacherId = null;
        _coefficientCtrl.text = '1';
      });
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: const Text('Matière affectée avec succès'),
              backgroundColor: colors.successGreen),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Erreur: $e'), backgroundColor: colors.dangerRed),
        );
      }
    } finally {
      if (mounted) setState(() => _isAdding = false);
    }
  }

  double? get _parsedCoefficient {
    final value = double.tryParse(_coefficientCtrl.text.replaceAll(',', '.'));
    if (value == null || value <= 0) return null;
    return value;
  }

  Future<void> _removeCourse(
      BuildContext context, String courseId, String courseName) async {
    final colors = context.appColors;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Supprimer la matière ?'),
        content: Text(
            'Voulez-vous retirer "$courseName" du programme de cette classe ?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Annuler')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: colors.dangerRed),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref.read(adminRepositoryProvider).removeCourseFromClass(
            classId: widget.classId,
            courseId: courseId,
          );
      ref.invalidate(classCoursesProvider(widget.classId));
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Erreur: $e'), backgroundColor: colors.dangerRed),
        );
      }
    }
  }
}

// ── Tab 3: Overview ───────────────────────────────────────────────────────────

class _OverviewTab extends StatelessWidget {
  final ClassModel cls;
  const _OverviewTab({required this.cls});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Class info card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: colors.tealDark,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: colorScheme.onPrimary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.class_,
                          color: colorScheme.onPrimary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(cls.name,
                              style: TextStyle(
                                  color: colorScheme.onPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18)),
                          if (cls.subject != null)
                            Text(cls.subject!,
                                style: TextStyle(
                                    color: colorScheme.onPrimary
                                        .withValues(alpha: 0.7),
                                    fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _InfoChip(
                        icon: Icons.people,
                        label: '${cls.members.length} élèves'),
                    const SizedBox(width: 8),
                    _InfoChip(
                        icon: Icons.person_pin,
                        label: '${cls.teachers.length} profs'),
                  ],
                ),
                const SizedBox(height: 12),
                // Join code
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: colorScheme.onPrimary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.qr_code_2,
                          color: colorScheme.onPrimary, size: 16),
                      const SizedBox(width: 6),
                      Text('Code: ',
                          style: TextStyle(
                              color:
                                  colorScheme.onPrimary.withValues(alpha: 0.7),
                              fontSize: 12)),
                      Text(cls.joinCode,
                          style: TextStyle(
                              color: colorScheme.onPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              letterSpacing: 2)),
                    ],
                  ),
                ),
              ],
            ),
          ).animate().fadeIn().slideY(begin: -0.1),
          const SizedBox(height: 20),

          // Teachers
          if (cls.teachers.isNotEmpty) ...[
            Text('Professeurs',
                style: TextStyle(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                    fontSize: 15)),
            const SizedBox(height: 10),
            ...cls.teachers.map((t) => Container(
                  margin: const EdgeInsetsDirectional.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: colors.cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.cardBorder),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: colors.inputBg,
                        child: Text(t.fullName[0],
                            style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: colors.tealDark)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t.fullName,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                            Text(t.email,
                                style: TextStyle(
                                    color: colors.subtitleText, fontSize: 12)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: colors.inputBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('Enseignant',
                            style: TextStyle(
                                fontSize: 11, color: colors.tealDark)),
                      ),
                    ],
                  ),
                ).animate().fadeIn()),
            const SizedBox(height: 20),
          ],

          // Students
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Élèves inscrits',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              Text('${cls.members.length} total',
                  style: TextStyle(color: colors.subtitleText, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 10),
          if (cls.members.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: colors.glassSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: colors.cardBorder),
              ),
              child: Column(
                children: [
                  Icon(Icons.people_outline,
                      size: 40, color: colors.cardBorder),
                  const SizedBox(height: 8),
                  Text('Aucun élève inscrit',
                      style: TextStyle(color: colors.subtitleText)),
                  const SizedBox(height: 4),
                  Text(
                    'Allez dans l\'onglet "Élèves" pour inscrire des élèves.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: colors.mutedText, fontSize: 12),
                  ),
                ],
              ),
            )
          else
            ...cls.members.map((m) => ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                  leading: CircleAvatar(
                    radius: 16,
                    backgroundColor: colors.inputBg,
                    child: Text(m.fullName[0],
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: colors.tealDark)),
                  ),
                  title: Text(m.fullName,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w500)),
                  subtitle: m.studentId != null
                      ? Text(m.studentId!,
                          style:
                              TextStyle(fontSize: 11, color: colors.mutedText))
                      : null,
                  dense: true,
                )),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: colorScheme.onPrimary.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: colorScheme.onPrimary),
          const SizedBox(width: 5),
          Text(label,
              style: TextStyle(
                  color: colorScheme.onPrimary,
                  fontSize: 12,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

String _formatCoefficient(double value) {
  if (value == value.roundToDouble()) return value.toInt().toString();
  return value.toStringAsFixed(1);
}
