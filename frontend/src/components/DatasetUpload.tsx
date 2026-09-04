import { useRef, useState } from 'react';
import { uploadDataset } from '../api/datasets';
import { FileIcon, UploadIcon } from './icons';

interface Props {
  // Called after a successful upload so the parent can refresh the list.
  onUploaded: () => void;
}

export function DatasetUpload({ onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError(null);
    setSuccess(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Please choose a CSV file to upload.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files can be uploaded.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const dataset = await uploadDataset(file);
      setSuccess(`Uploaded "${dataset.filename}". Profiling has started.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload dataset.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="panel upload-panel" onSubmit={onSubmit}>
      <div className="upload-controls">
        <label className={`btn btn-secondary file-button${uploading ? ' disabled' : ''}`}>
          <FileIcon className="btn-icon" />
          Choose CSV file
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onSelect}
            disabled={uploading}
            hidden
          />
        </label>
        <span className="file-name">
          {file ? (
            <>
              <FileIcon className="btn-icon file-name-icon" />
              {file.name}
            </>
          ) : (
            'No file selected'
          )}
        </span>
        <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
          <UploadIcon className="btn-icon" />
          {uploading ? 'Uploading…' : 'Upload Dataset'}
        </button>
      </div>

      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="banner banner-success" role="status">
          {success}
        </div>
      )}
    </form>
  );
}
