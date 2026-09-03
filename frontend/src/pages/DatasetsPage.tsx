import { useEffect, useState } from 'react';
import { getDataset, listDatasets } from '../api/datasets';
import { DatasetDetails } from '../components/DatasetDetails';
import { DatasetTable } from '../components/DatasetTable';
import { DatasetUpload } from '../components/DatasetUpload';
import type { Dataset } from '../types/dataset';

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  async function loadDatasets(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setDatasets(await listDatasets());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datasets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDatasets();
  }, []);

  async function onView(id: string) {
    setSelectedId(id);
    setSelectedDataset(null);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      setSelectedDataset(await getDataset(id));
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to load dataset.');
    } finally {
      setDetailsLoading(false);
    }
  }

  function onCloseDetails() {
    setSelectedId(null);
    setSelectedDataset(null);
    setDetailsError(null);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Datasets</h1>
          <p className="subtitle">Upload and profile CSV datasets.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => loadDatasets(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <DatasetUpload onUploaded={() => loadDatasets(true)} />

      {loading ? (
        <div className="panel muted">Loading datasets…</div>
      ) : error ? (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      ) : datasets.length === 0 ? (
        <div className="panel empty-state">No datasets yet. Upload a CSV file to get started.</div>
      ) : (
        <div className="panel table-panel">
          <DatasetTable datasets={datasets} selectedId={selectedId} onView={onView} />
        </div>
      )}

      {selectedId &&
        (detailsLoading ? (
          <div className="panel muted">Loading dataset details…</div>
        ) : detailsError ? (
          <div className="banner banner-error" role="alert">
            {detailsError}
          </div>
        ) : selectedDataset ? (
          <DatasetDetails dataset={selectedDataset} onClose={onCloseDetails} />
        ) : null)}
    </div>
  );
}
