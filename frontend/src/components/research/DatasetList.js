import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash } from 'lucide-react'; // Added Trash icon
import api from '../../services/api';

const DatasetList = ({ projectId, onUploadClick }) => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 useEffect(() => {
    fetchDatasets();
  }, [projectId]); // Refetch when projectId changes

 const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/datasets', { params: { project_id: projectId } });
      setDatasets(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch datasets');
      console.error('Error fetching datasets:', err);
    } finally {
      setLoading(false);
    }
  };

 const handleExportDataset = (datasetId) => {
    window.open(`${api.defaults.baseURL}/datasets/${datasetId}/export`, '_blank');
  };

 // Placeholder for delete functionality
 const handleDeleteDataset = async (datasetId) => {
    if (window.confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      try {
        // await api.delete(`/datasets/${datasetId}`); // Uncomment when backend endpoint is ready
        alert(`Simulating delete for dataset ID: ${datasetId}. Backend endpoint needed.`);
        fetchDatasets(); // Refresh list after deletion
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to delete dataset');
        console.error('Error deleting dataset:', err);
      }
    }
 };


 if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Loading datasets...</div>
      </div>
    );
  }

 if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

 if (datasets.length === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg text-center">
        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500 mb-4">No datasets have been uploaded for this project yet.</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={onUploadClick}
        >
          Upload Your First Dataset
        </button>
      </div>
    );
  }

 return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Format
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Records
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {datasets.map((dataset) => {
            // Determine dataset type based on name/description
            const isOrgDataset = dataset.name.toLowerCase().includes('organization') || dataset.description.toLowerCase().includes('organization');
            const isCommDataset = dataset.name.toLowerCase().includes('communication') || dataset.description.toLowerCase().includes('communication');
            const isPerfDataset = dataset.name.toLowerCase().includes('performance') || dataset.description.toLowerCase().includes('performance');

            let datasetType = 'custom';
            if (isOrgDataset) datasetType = 'organization';
            if (isCommDataset) datasetType = 'communication';
            if (isPerfDataset) datasetType = 'performance';

            return (
              <tr key={dataset.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{dataset.name}</div>
                  <div className="text-sm text-gray-500">{dataset.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {dataset.format}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dataset.record_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(dataset.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${datasetType === 'organization' ? 'bg-green-100 text-green-800' : ''}
                    ${datasetType === 'communication' ? 'bg-purple-100 text-purple-800' : ''}
                    ${datasetType === 'performance' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${datasetType === 'custom' ? 'bg-gray-100 text-gray-800' : ''}
                  `}>
                    {datasetType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="text-blue-600 hover:text-blue-900 mr-2"
                    onClick={() => handleExportDataset(dataset.id)}
                    title="Download Dataset"
                  >
                    <Download size={16} />
                  </button>
                   <button
                    className="text-red-600 hover:text-red-900"
                    onClick={() => handleDeleteDataset(dataset.id)} // Placeholder
                    title="Delete Dataset"
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DatasetList;