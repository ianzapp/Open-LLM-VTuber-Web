import { useEffect, useState } from 'react';
import i18n from 'i18next';
import { useWebSocket } from '@/context/websocket-context';
import { useVAD } from '@/context/vad-context';
import { deriveBackendUrls } from '@/utils/backend-url';
import {
  negativeThresholdFor,
  sensitivityToThreshold,
  thresholdToSensitivity,
} from './logic/settings-logic';

const SENSITIVITY_LEVELS = [1, 2, 3, 4, 5] as const;

/** Languages the i18n setup actually loaded (see src/renderer/src/i18n.ts). */
const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

function GearIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H11a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8.6a1.65 1.65 0 0 0 1.51 1H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function SettingsButton({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      className="cm-pill cm-island cm-round"
      data-testid="settings-button"
      aria-label="Settings"
      onClick={onClick}
    >
      <GearIcon />
    </button>
  );
}

export function SettingsSheet({ onClose }: { onClose: () => void }): JSX.Element {
  const { setBaseUrl, setWsUrl } = useWebSocket();
  const { settings, updateSettings } = useVAD();

  const [language, setLanguage] = useState((i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleUseThisSite = (): void => {
    const derived = deriveBackendUrls(window.location);
    setBaseUrl(derived.baseUrl);
    setWsUrl(derived.wsUrl);
  };

  const sensitivity = thresholdToSensitivity(settings.positiveSpeechThreshold);

  const handleSensitivity = (level: 1 | 2 | 3 | 4 | 5): void => {
    const positiveSpeechThreshold = sensitivityToThreshold(level);
    updateSettings({
      ...settings,
      positiveSpeechThreshold,
      negativeSpeechThreshold: negativeThresholdFor(positiveSpeechThreshold),
    });
  };

  const handleLanguage = (code: string): void => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  const loadedCodes = Object.keys(i18n.options.resources ?? {});
  const languagesToShow = loadedCodes.length > 0
    ? LANGUAGES.filter((l) => loadedCodes.includes(l.code))
    : LANGUAGES;

  return (
    <section className="cm-sheet cm-settings-sheet cm-island" data-testid="settings-sheet" aria-label="Settings">
      <header className="cm-sheet-head">
        <span>Settings</span>
        <button type="button" className="cm-round cm-sheet-close" aria-label="Close settings" onClick={onClose}>✕</button>
      </header>
      <div className="cm-settings-body">
        <div className="cm-settings-group">
          <div className="cm-settings-label">Server address</div>
          <div>The app talks to the server that served it.</div>
          <div className="cm-settings-row">
            <button
              type="button"
              className="cm-pill cm-settings-use-site"
              data-testid="settings-use-this-site"
              onClick={handleUseThisSite}
            >
              Use this site&apos;s address
            </button>
          </div>
        </div>

        <div className="cm-settings-group">
          <div className="cm-settings-label">Voice sensitivity</div>
          <div className="cm-settings-sensitivity" role="group" aria-label="Voice sensitivity" data-testid="settings-sensitivity">
            {SENSITIVITY_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                className="cm-settings-seg"
                data-testid={`settings-sensitivity-${level}`}
                aria-pressed={sensitivity === level}
                data-selected={sensitivity === level}
                onClick={() => handleSensitivity(level)}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="cm-settings-hints">
            <span>Quiet room</span>
            <span>Noisy room</span>
          </div>
        </div>

        {languagesToShow.length > 1 && (
          <div className="cm-settings-group">
            <div className="cm-settings-label">Language</div>
            <select
              className="cm-settings-select"
              data-testid="settings-language"
              value={language}
              onChange={(e) => handleLanguage(e.target.value)}
            >
              {languagesToShow.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </section>
  );
}
