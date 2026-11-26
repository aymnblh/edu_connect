import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Loader2, LogOut, ShieldAlert, X } from 'lucide-react';
import { logoutSession } from '../lib/api';
import {
  BIOMETRIC_LOCK_EVENT,
  consumeFreshWebSignIn,
  dismissBiometricPromptForSession,
  enrollBiometricLock,
  isBiometricLockEnabledForUser,
  isBiometricPromptDismissed,
  isPlatformBiometricSupported,
  readBiometricLockConfig,
  verifyBiometricLock,
} from '../lib/biometricLock';
import { useLocale } from '../lib/i18n';
import { decodeJwtPayload, readWorkspaceSessionItem } from '../lib/workspace';

type StoredUserInfo = {
  id?: string;
  email?: string;
  full_name?: string;
  name?: string;
  is_demo?: boolean;
};

function readCurrentUserIdentity(): {
  id: string;
  email: string;
  displayName: string;
  isDemo: boolean;
} {
  const rawUser = readWorkspaceSessionItem('user');
  let parsed: StoredUserInfo = {};
  if (rawUser) {
    try {
      parsed = JSON.parse(rawUser) as StoredUserInfo;
    } catch {
      parsed = {};
    }
  }
  const claims = decodeJwtPayload(readWorkspaceSessionItem('access_token')) || {};
  const id = String(parsed.id || claims.sub || '');
  const email = String(parsed.email || '');
  const displayName = String(parsed.full_name || parsed.name || email || '');
  const isDemo = Boolean(parsed.is_demo || claims.demo);
  return { id, email, displayName, isDemo };
}

const LOCK_GRACE_MS = 60 * 1000;

export default function BiometricLockGate({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const identity = readCurrentUserIdentity();
  const userId = identity.id;
  const isDemo = identity.isDemo;

  const [locked, setLocked] = useState(() => {
    if (isDemo || !userId) return false;
    const isFresh = consumeFreshWebSignIn();
    if (isFresh) return false;
    return isBiometricLockEnabledForUser(userId);
  });
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [platformSupported, setPlatformSupported] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(() => isBiometricPromptDismissed());
  const [enrolledNow, setEnrolledNow] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [setupBannerError, setSetupBannerError] = useState('');
  const hiddenAtRef = useRef<number | null>(null);

  const canOfferSetup =
    platformSupported &&
    !isDemo &&
    Boolean(userId) &&
    !locked &&
    !enrolledNow &&
    !promptDismissed &&
    !isBiometricLockEnabledForUser(userId);

  useEffect(() => {
    if (isDemo || !userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (hiddenAtRef.current === null) {
          hiddenAtRef.current = Date.now();
        }
        return;
      }

      if (document.visibilityState === 'visible') {
        const hiddenAt = hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (
          hiddenAt !== null &&
          Date.now() - hiddenAt >= LOCK_GRACE_MS &&
          isBiometricLockEnabledForUser(userId)
        ) {
          setError('');
          setLocked(true);
        }
      }
    };

    const handleManualLock = () => {
      if (isBiometricLockEnabledForUser(userId)) {
        setError('');
        setLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener(BIOMETRIC_LOCK_EVENT, handleManualLock);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener(BIOMETRIC_LOCK_EVENT, handleManualLock);
    };
  }, [isDemo, userId]);

  useEffect(() => {
    if (isDemo || !userId || locked || enrolledNow || promptDismissed || isBiometricLockEnabledForUser(userId)) {
      return;
    }

    let cancelled = false;
    void isPlatformBiometricSupported().then((supported) => {
      if (!cancelled) {
        setPlatformSupported(supported);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enrolledNow, isDemo, locked, promptDismissed, userId]);

  const handleUnlock = async () => {
    const config = readBiometricLockConfig();
    if (!config || config.userId !== userId) {
      setLocked(false);
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const ok = await verifyBiometricLock(config.credentialId);
      if (ok) {
        setLocked(false);
      } else {
        setError(t('biometric.unlockFailed'));
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logoutSession();
    navigate('/login', { replace: true });
  };

  const handleEnableFromBanner = async () => {
    if (!userId || enrolling) return;
    setEnrolling(true);
    setSetupBannerError('');
    try {
      await enrollBiometricLock({
        id: userId,
        email: identity.email,
        fullName: identity.displayName,
      });
      setEnrolledNow(true);
    } catch {
      setSetupBannerError(t('biometric.enrollFailed'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleDismissBanner = () => {
    dismissBiometricPromptForSession();
    setPromptDismissed(true);
  };

  if (locked) {
    return (
      <div className="biometric-lock-screen" role="dialog" aria-modal="true" aria-labelledby="biometric-lock-title">
        <div className="glass-card biometric-lock-card animate-fade-in">
          <div className="biometric-lock-brand">
            <img src="/wasel-edu-logo.png" alt={t('common.appName')} />
            <span>{t('common.appName')}</span>
          </div>
          <div className="biometric-lock-icon" aria-hidden="true">
            <Fingerprint size={34} />
          </div>
          <h1 id="biometric-lock-title" className="biometric-lock-title">
            {t('biometric.lockTitle')}
          </h1>
          <p className="biometric-lock-copy">{t('biometric.lockSubtitle')}</p>
          {identity.displayName && (
            <div className="biometric-lock-user">{identity.displayName}</div>
          )}
          {error && (
            <div className="login-error animate-fade-in" role="alert">
              <ShieldAlert size={18} className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={() => void handleUnlock()}
            disabled={verifying}
          >
            {verifying ? <Loader2 size={16} className="spin-icon" /> : <Fingerprint size={16} />}
            {t('biometric.unlockButton')}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={() => void handleSwitchAccount()}
            disabled={verifying}
          >
            <LogOut size={16} />
            {t('biometric.switchAccount')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {canOfferSetup && (
        <div className="biometric-setup-banner" role="region" aria-label={t('biometric.modalTitle')}>
          <div className="biometric-setup-banner-main">
            <Fingerprint size={18} />
            <div>
              <strong>{t('biometric.bannerTitle')}</strong>
              <p>{setupBannerError || t('biometric.bannerCopy')}</p>
            </div>
          </div>
          <div className="biometric-setup-banner-actions">
            <button
              type="button"
              className="btn btn-primary btn-compact"
              onClick={() => void handleEnableFromBanner()}
              disabled={enrolling}
            >
              {enrolling ? <Loader2 size={14} className="spin-icon" /> : <Fingerprint size={14} />}
              {t('biometric.enableButton')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              onClick={handleDismissBanner}
              aria-label={t('common.close')}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
