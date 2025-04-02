import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import api from '../../services/api';

const UploadDatasetModal = ({ isOpen, onClose, projectId, onDatasetUploaded }) => {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('organization');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

 if (!isOpen) return null;

 const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // Use filename as default dataset name if not specified
      if (!name) {
        setName(e.target.files[0].name.split('.')[0]);
      }
    }
  };

 const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

   // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    formData.append('project_id', projectId);

    if (name) formData.append('name', name);
    if (description) formData.append('description', description);

   try {
      const response = await api.post('/datasets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      onDatasetUploaded(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error uploading file');
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

 return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Upload Dataset</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

       {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

       <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="fileType" className="block text-sm font-medium text-gray-700 mb-1">
              Dataset Type
            </label>
            <select
              id="fileType"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="organization">Organization Structure</option>
              <option value="communication">Communication Data</option>
              <option value="performance">Performance Metrics</option>
              <option value="custom">Custom Data</option>
            </select>
          </div>

         <div className="mb-4">
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
              File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-2">
                {file ? file.name : 'Click to select or drag and drop'}
              </p>
              <input
                type="file"
                id="file"
                accept=".csv,.xlsx,.json"
                className="hidden"
                onChange={handleFileChange}
                required
              />
              <label
                htmlFor="file"
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded cursor-pointer text-sm inline-block"
              >
                Select File
              </label>
            </div>
          </div>

         <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Dataset Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter dataset name"
            />
          </div>

         <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter dataset description"
            />
          </div>

         <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {uploading ? 'Uploading...' : 'Upload Dataset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadDatasetModal;