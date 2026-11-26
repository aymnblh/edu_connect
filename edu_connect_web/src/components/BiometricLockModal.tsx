import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Fingerprint, Loader2, Lock, ShieldAlert } from 'lucide-react';
import {
  disableBiometricLock,
  enrollBiometricLock,
  isBiometricLockEnabledForUser,
  isPlatformBiometricSupported,
  readBiometricLockConfig,
  requestWebAppLock,
  verifyBiometricLock,
} from '../lib/biometricLock';
import { useLocale } from '../lib/i18n';
import { decodeJwtPayload, readWorkspaceSessionItem } from '../lib/workspace';

export default function BiometricLockModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const closeRef = useRef<HTMLButtonElement>(null);

  const user = (() => {
    const raw = readWorkspaceSessionItem('user');
    let parsed: { id?: string; email?: string; full_name?: string; name?: string } = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) as typeof parsed;
      } catch {
        parsed = {};
      }
    }
    const claims = decodeJwtPayload(readWorkspaceSessionItem('access_token')) || {};
    return {
      id: String(parsed.id || claims.sub || ''),
      email: String(parsed.email || ''),
      fullName: String(parsed.full_name || parsed.name || ''),
    };
  })();

  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(() => isBiometricLockEnabledForUser(user.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canForceDisable, setCanForceDisable] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    let cancelled = false;
    void isPlatformBiometricSupported().then((ok) => {
      if (!cancelled) setSupported(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnable = async () => {
    if (!user.id || busy) return;
    setBusy(true);
    setError('');
    setCanForceDisable(false);
    try {
      await enrollBiometricLock(user);
      setEnabled(true);
    } catch {
      setError(t('biometric.enrollFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (busy) return;
    const config = readBiometricLockConfig();
    if (!config || config.userId !== user.id) {
      disableBiometricLock();
      setEnabled(false);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const verified = await verifyBiometricLock(config.credentialId);
      if (verified) {
        disableBiometricLock();
        setEnabled(false);
        setCanForceDisable(false);
      } else {
        setError(t('biometric.unlockFailed'));
        setCanForceDisable(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleForceDisable = () => {
    disableBiometricLock();
    setEnabled(false);
    setCanForceDisable(false);
    setError('');
  };

  const handleLockNow = () => {
    onClose();
    requestWebAppLock();
  };

  return createPortal(
    <div className="workspace-modal-backdrop" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <div className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="biometric-modal-title">
        <h2 id="biometric-modal-title">
          <Fingerprint size={18} /> {t('biometric.modalTitle')}
        </h2>
        <p className="dashboard-section-copy">{t('biometric.modalCopy')}</p>

        {supported === false && (
          <div className="notice-box">
            <strong>{t('biometric.unavailableTitle')}</strong>
            <span>{t('biometric.unavailableCopy')}</span>
          </div>
        )}

        {error && (
          <div className="login-error animate-fade-in" role="alert">
            <ShieldAlert size={18} className="login-error-icon" />
            <span>{error}</span>
          </div>
        )}

        {enabled ? (
          <>
            <div className="notice-box">
              <strong>{t('biometric.statusEnabled')}</strong>
              <span>{t('biometric.statusEnabledCopy')}</span>
            </div>
            <button type="button" className="btn btn-primary btn-full" onClick={handleLockNow} disabled={busy}>
              <Lock size={16} /> {t('biometric.lockNow')}
            </button>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => void handleDisable()} disabled={busy}>
              {busy ? <Loader2 size={16} className="spin-icon" /> : <Fingerprint size={16} />}
              {t('biometric.disableButton')}
            </button>
            {canForceDisable && (
              <button type="button" className="btn btn-secondary btn-full" onClick={handleForceDisable} disabled={busy}>
                {t('biometric.forceDisableButton')}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={() => void handleEnable()}
            disabled={busy || supported === false || supported === null}
          >
            {busy ? <Loader2 size={16} className="spin-icon" /> : <Fingerprint size={16} />}
            {t('biometric.enableButton')}
          </button>
        )}

        <button ref={closeRef} type="button" className="btn btn-secondary btn-full" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
