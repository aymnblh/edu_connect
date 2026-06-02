import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:go_router/go_router.dart';
import 'package:edu_connect/features/class/data/repositories/student_repository.dart';
import 'package:edu_connect/core/theme/app_theme.dart';
import 'package:edu_connect/l10n/app_localizations.dart';
import 'package:edu_connect/features/class/presentation/widgets/linking_success_dialog.dart';

const _scannerDark = Color.fromARGB(255, 0, 0, 0);
const _scannerLight = Color.fromARGB(255, 255, 255, 255);
const _scannerTransparent = Color.fromARGB(0, 0, 0, 0);

class QrScannerScreen extends ConsumerStatefulWidget {
  const QrScannerScreen({super.key});

  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String? code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    final colors = context.appColors;
    setState(() => _isProcessing = true);

    try {
      // 1. Call API to link student
      await ref.read(studentRepositoryProvider).linkByQr(code);

      // 2. Fetch student data for preview (assuming return or separate fetch)
      // For now, we'll fetch latest to get the last linked student or similar
      // Logic might vary based on backend response, assuming success for now

      if (mounted) {
        // Show success dialog with preview
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => const LinkingSuccessDialog(),
        );

        if (mounted) context.go('/classes');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: colors.dangerRed,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    const double scanAreaSize = 250;

    return Scaffold(
      backgroundColor: _scannerDark,
      appBar: AppBar(
        backgroundColor: _scannerTransparent,
        elevation: 0,
        title:
            Text(l10n.scanQrCode, style: const TextStyle(color: _scannerLight)),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
          icon: const Icon(Icons.close, color: _scannerLight),
          onPressed: () => context.pop(),
        ),
      ),
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          // 1. Full screen scanner
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),

          // 2. Semi-transparent overlay with clear hole
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              _scannerDark.withValues(alpha: 0.65),
              BlendMode.srcOver,
            ),
            child: Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: _scannerDark,
                    backgroundBlendMode: BlendMode.dstOut,
                  ),
                ),
                Align(
                  alignment: Alignment.center,
                  child: Container(
                    width: scanAreaSize,
                    height: scanAreaSize,
                    decoration: BoxDecoration(
                      color: _scannerLight,
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 3. Scan border (Corners)
          Center(
            child: Container(
              width: scanAreaSize,
              height: scanAreaSize,
              decoration: BoxDecoration(
                border: Border.all(color: _scannerTransparent),
              ),
              child: Stack(
                children: [
                  _buildCorner(top: 0, start: 0, angle: 0),
                  _buildCorner(top: 0, end: 0, angle: 90),
                  _buildCorner(bottom: 0, start: 0, angle: 270),
                  _buildCorner(bottom: 0, end: 0, angle: 180),
                ],
              ),
            ),
          ),

          // 4. Instructions
          Positioned(
            bottom: MediaQuery.of(context).size.height * 0.15,
            left: 40,
            right: 40,
            child: Column(
              children: [
                Text(
                  l10n.scanInstructions,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: _scannerLight,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (_isProcessing) ...[
                  const SizedBox(height: 24),
                  const CircularProgressIndicator(color: _scannerLight),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCorner(
      {double? top,
      double? bottom,
      double? start,
      double? end,
      required double angle}) {
    return PositionedDirectional(
      top: top,
      bottom: bottom,
      start: start,
      end: end,
      child: Transform.rotate(
        angle: angle * 3.14159 / 180,
        child: Container(
          width: 30,
          height: 30,
          decoration: const BoxDecoration(
            border: BorderDirectional(
              top: BorderSide(color: _scannerLight, width: 4),
              start: BorderSide(color: _scannerLight, width: 4),
            ),
            borderRadius:
                BorderRadiusDirectional.only(topStart: Radius.circular(8)),
          ),
        ),
      ),
    );
  }
}
