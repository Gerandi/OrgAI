import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import Button from '../ui/Button';

const FileUploader = ({
  title,
  description,
  acceptedFormats = ".csv,.xlsx",
  onUpload,
  uploadProgress = null,
  className = ''
}) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Check file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit");
        setFile(null);
        return;
      }

      // Check file format
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      const acceptedExts = acceptedFormats.split(',').map(ext => ext.replace('.', '').trim());

      if (!acceptedExts.includes(fileExt)) {
        setError(`Invalid file format. Please upload: ${acceptedFormats}`);
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = () => {
    if (file && onUpload) {
      onUpload(file);
    }
  };

  return (
    <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center ${className}`}>
      <Upload size={40} className="text-gray-400 mb-4" />
      <h4 className="font-medium mb-2">{title}</h4>
      <p className="text-sm text-gray-500 text-center mb-4">
        {description}
      </p>

      {error && (
        <p className="text-red-500 text-sm mb-2">{error}</p>
      )}

      {!file ? (
        <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
          <input
            type="file"
            accept={acceptedFormats}
            className="hidden"
            onChange={handleFileChange}
            disabled={uploadProgress !== null}
          />
          Select File
        </label>
      ) : (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-700 truncate max-w-xs">{file.name}</p>
            <button
              className="text-red-500 text-sm"
              onClick={() => setFile(null)}
              disabled={uploadProgress !== null}
            >
              Remove
            </button>
          </div>

          {uploadProgress !== null ? (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={handleUpload}
            >
              Upload
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;