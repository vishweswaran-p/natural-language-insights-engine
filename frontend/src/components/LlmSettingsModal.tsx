import { useEffect, useState } from 'react';
import { getLlmSettings, updateLlmSettings } from '../api/settings';
import type { LlmProviderName, LlmSettings } from '../types/llm-settings';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LlmSettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<LlmSettings | null>(null);
  const [provider, setProvider] = useState<LlmProviderName>('local');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    setApiKey('');
    setLoading(true);
    getLlmSettings()
      .then((current) => {
        setSettings(current);
        setProvider(current.provider);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load settings.');
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateLlmSettings({
        provider,
        ...(provider === 'openai' && apiKey.trim() ? { openaiApiKey: apiKey.trim() } : {}),
      });
      setSettings(updated);
      setProvider(updated.provider);
      setApiKey('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  const needsApiKey =
    provider === 'openai' && !settings?.openaiApiKeyConfigured && apiKey.trim().length === 0;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal panel"
        role="dialog"
        aria-labelledby="llm-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="llm-settings-title">LLM settings</h3>
        <p className="muted modal-lead">
          Choose which model answers questions. Changes apply immediately to new questions.
        </p>

        {loading ? (
          <p className="muted">Loading settings…</p>
        ) : (
          <>
            <fieldset className="settings-fieldset">
              <legend className="settings-legend">Provider</legend>
              <label className="settings-option">
                <input
                  type="radio"
                  name="llm-provider"
                  value="local"
                  checked={provider === 'local'}
                  onChange={() => setProvider('local')}
                />
                <span>
                  <strong>Local (Ollama)</strong>
                  <span className="muted"> — free, runs in Docker, slower on CPU</span>
                </span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="llm-provider"
                  value="openai"
                  checked={provider === 'openai'}
                  onChange={() => setProvider('openai')}
                />
                <span>
                  <strong>OpenAI</strong>
                  <span className="muted"> — faster and more reliable; requires an API key</span>
                </span>
              </label>
            </fieldset>

            {provider === 'openai' && (
              <div className="field">
                <label htmlFor="openai-api-key">OpenAI API key</label>
                <input
                  id="openai-api-key"
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings?.openaiApiKeyConfigured
                      ? 'Leave blank to keep the current key'
                      : 'sk-...'
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                {settings?.openaiApiKeyConfigured && apiKey.length === 0 && (
                  <p className="muted field-hint">A key is already configured for this session.</p>
                )}
              </div>
            )}

            {settings && (
              <p className="muted settings-current">
                Active model: <strong>{settings.provider}:{settings.model}</strong>
              </p>
            )}

            {error && (
              <div className="banner banner-error" role="alert">
                {error}
              </div>
            )}

            {saved && (
              <div className="banner banner-info">Settings saved. New questions will use this provider.</div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || needsApiKey}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
