import { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { DatasetsPage } from './pages/DatasetsPage';
import { AskQuestionPage } from './pages/AskQuestionPage';
import { QuestionsHistoryPage } from './pages/QuestionsHistoryPage';

export type Page = 'datasets' | 'questions' | 'history';

// A few screens only, so navigation is a small page state rather than a router.
export default function App() {
  const [page, setPage] = useState<Page>('datasets');

  return (
    <div className="app">
      <AppHeader page={page} onNavigate={setPage} />
      <main className="app-main">
        {page === 'datasets' ? (
          <DatasetsPage />
        ) : page === 'questions' ? (
          <AskQuestionPage onNavigate={setPage} />
        ) : (
          <QuestionsHistoryPage onNavigate={setPage} />
        )}
      </main>
    </div>
  );
}
