import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Monitor, Smartphone } from 'lucide-react';
import { useLocale } from '../lib/i18n';
import { usePwaInstall } from '../lib/pwaInstall';

type InstallButtonVariant = 'nav' | 'hero' | 'login' | 'sidebar' | 'footer';

interface InstallAppButtonProps {
  variant?: InstallButtonVariant;
  collapsed?: boolean;
  className?: string;
  onAfterClick?: () => void;
}

/** Button that triggers native PWA desktop/mobile installation or shows manual platform steps. */
export default function InstallAppButton({
  variant = 'nav',
  collapsed = false,
  className = '',
  onAfterClick,
}: InstallAppButtonProps) {
  const { t } = useLocale();
  const { isInstalled, promptInstall } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (guideOpen) {
      closeRef.current?.focus();
    }
  }, [guideOpen]);

  if (isInstalled) {
    return null;
  }

  const label = variant === 'nav' || variant === 'login' ? t('pwa.download') : t('pwa.downloadApp');

  const variantClass = (() => {
    switch (variant) {
      case 'nav':
        return 'btn btn-secondary btn-compact';
      case 'hero':
        return 'btn btn-secondary landing-cta-ghost';
      case 'login':
        return 'btn btn-secondary btn-compact pwa-login-btn';
      case 'sidebar':
        return `sidebar-install-btn ${collapsed ? 'sidebar-install-btn--collapsed' : ''}`;
      case 'footer':
        return 'pwa-footer-link';
    }
  })();

  const handleClick = async () => {
    onAfterClick?.();
    const outcome = await promptInstall();
    if (outcome === 'manual') {
      setGuideOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`${variantClass} ${className}`.trim()}
        onClick={() => void handleClick()}
        title={variant === 'sidebar' && collapsed ? label : undefined}
        aria-label={variant === 'sidebar' && collapsed ? label : undefined}
      >
        <Download size={variant === 'footer' ? 15 : 16} aria-hidden="true" />
        {!(variant === 'sidebar' && collapsed) && <span>{label}</span>}
      </button>

      {guideOpen &&
        createPortal(
          <div
            className="workspace-modal-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setGuideOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setGuideOpen(false);
              }
            }}
          >
            <div
              className="workspace-modal pwa-install-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-install-title"
            >
              <h2 id="pwa-install-title">
                <Download size={18} aria-hidden="true" />
                <span>{t('pwa.modalTitle')}</span>
              </h2>
              <p className="dashboard-section-copy">{t('pwa.modalSubtitle')}</p>

              <div className="pwa-install-steps">
                <div className="pwa-install-step">
                  <div className="pwa-install-step-title">
                    <Monitor size={16} aria-hidden="true" />
                    <span>{t('pwa.desktopTitle')}</span>
                  </div>
                  <p className="pwa-install-step-copy">{t('pwa.desktopStep')}</p>
                </div>

                <div className="pwa-install-step">
                  <div className="pwa-install-step-title">
                    <Monitor size={16} aria-hidden="true" />
                    <span>{t('pwa.macSafariTitle')}</span>
                  </div>
                  <p className="pwa-install-step-copy">{t('pwa.macSafariStep')}</p>
                </div>

                <div className="pwa-install-step">
                  <div className="pwa-install-step-title">
                    <Smartphone size={16} aria-hidden="true" />
                    <span>{t('pwa.iosTitle')}</span>
                  </div>
                  <p className="pwa-install-step-copy">{t('pwa.iosStep')}</p>
                </div>

                <div className="pwa-install-step">
                  <div className="pwa-install-step-title">
                    <Smartphone size={16} aria-hidden="true" />
                    <span>{t('pwa.androidTitle')}</span>
                  </div>
                  <p className="pwa-install-step-copy">{t('pwa.androidStep')}</p>
                </div>
              </div>

              <button
                ref={closeRef}
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => setGuideOpen(false)}
              >
                {t('common.close')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
