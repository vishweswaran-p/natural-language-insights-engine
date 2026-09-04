import { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { DatasetsPage } from './pages/DatasetsPage';
import { AskQuestionPage } from './pages/AskQuestionPage';

export type Page = 'datasets' | 'questions';

export default function App() {
  const [page, setPage] = useState<Page>('datasets');

  return (
    <div className="app">
      <AppHeader page={page} onNavigate={setPage} />
      <main className="app-main">
        {page === 'datasets' ? <DatasetsPage /> : <AskQuestionPage onNavigate={setPage} />}
      </main>
    </div>
  );
}
