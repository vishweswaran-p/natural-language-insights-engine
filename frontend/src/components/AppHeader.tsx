import type { Page } from '../App';

interface Props {
  page: Page;
  onNavigate: (page: Page) => void;
}

export function AppHeader({ page, onNavigate }: Props) {
  return (
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
        </nav>
      </div>
    </header>
  );
}
