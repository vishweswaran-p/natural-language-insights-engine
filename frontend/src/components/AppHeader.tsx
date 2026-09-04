import { useEffect, useState } from 'react';
import type { Page } from '../App';
import { LlmSettingsModal } from './LlmSettingsModal';

interface Props {
  page: Page;
  onNavigate: (page: Page) => void;
}

export function AppHeader({ page, onNavigate }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-title">Natural Language Insights Engine</span>
          <nav className="app-nav">
            <button
              type="button"
              className={`nav-link${page === 'datasets' ? ' active' : ''}`}
              onClick={() => onNavigate('datasets')}
            >
              Datasets
            </button>
            <button
              type="button"
              className={`nav-link${page === 'questions' ? ' active' : ''}`}
              onClick={() => onNavigate('questions')}
            >
              Ask a Question
            </button>
            <button
              type="button"
              className={`nav-link${page === 'history' ? ' active' : ''}`}
              onClick={() => onNavigate('history')}
            >
              Questions
            </button>
            <button type="button" className="nav-link nav-link-settings" onClick={() => setSettingsOpen(true)}>
              LLM
            </button>
          </nav>
        </div>
      </header>
      {successMessage && (
        <div className="app-toast" role="status">
          {successMessage}
        </div>
      )}
      <LlmSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={setSuccessMessage}
      />
    </>
  );
}
