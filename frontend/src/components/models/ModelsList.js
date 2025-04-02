import React, { useState, useEffect } from 'react';
import { BarChart2, Edit, Trash2, Eye, Download, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';

const ModelsList = ({ onSelectModel, refreshTrigger }) => {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedModel, setExpandedModel] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null); // Added state for success message

  // Load models when component mounts or when refreshTrigger changes
  useEffect(() => {
    fetchModels();
  }, [activeProject, refreshTrigger]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get models with project filtering if we have an active project
      const params = activeProject ? { project_id: activeProject.id } : {};

      const response = await api.get('/models', { params });

      // Sort models by created_at (newest first)
      const sortedModels = response.data.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );

      setModels(sortedModels);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Could not load models. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (modelId) => {
    try {
      // If this model is already expanded, collapse it
      if (expandedModel === modelId) {
        setExpandedModel(null);
        return;
      }

      // Otherwise, fetch the model details and expand
      const response = await api.get(`/models/${modelId}`);

      // Update the model in the list with its details
      setModels(prev =>
        prev.map(model =>
          model.id === modelId
            ? { ...model, details: response.data }
            : model
        )
      );

      // Set as expanded
      setExpandedModel(modelId);
    } catch (err) {
      console.error('Error fetching model details:', err);
    }
  };

  const handleEditModel = (modelId) => {
    navigate('/model-builder', { state: { modelId } });
  };

  // Updated handleDeleteModel
  const handleDeleteModel = async (modelId, modelName) => {
    // If this is the first click, just confirm
    if (deleteConfirm !== modelId) {
      setDeleteConfirm(modelId);
      return;
    }

    // Second click, proceed with deletion
    try {
      setLoading(true); // Set loading state
      console.log(`Attempting to delete model ${modelId} - ${modelName}`); // Added logging
      // Make DELETE request
      const response = await api.delete(`/models/${modelId}`);
      console.log('Delete response:', response); // Added logging

      // Remove from state
      setModels(prev => prev.filter(model => model.id !== modelId));

      // Reset confirm state
      setDeleteConfirm(null);

      // Show success message
      setDeleteSuccess(`Model "${modelName}" was successfully deleted.`);

      // Clear success message after 5 seconds
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 5000);
    } catch (err) {
      console.error('Error deleting model:', err);
      console.error('Error details:', err.response?.data || err.message); // Added detailed error logging
      setDeleteConfirm(null); // Reset confirm state on error
      setError(`Error deleting model: ${err.response?.data?.detail || err.message}`);

      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setLoading(false); // Reset loading state
    }
  };


  const handleExportModel = async (modelId) => {
    try {
      const response = await api.get(`/models/${modelId}`);

      // Create a JSON string of the model data
      const modelData = response.data;
      const jsonString = JSON.stringify(modelData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create a download link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = `${modelData.name.replace(/\\s+/g, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting model:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <p className="text-red-700">{error}</p>
        <button
          className="mt-2 text-sm text-blue-600 flex items-center"
          onClick={fetchModels}
        >
          <RefreshCw size={16} className="mr-1" /> Try Again
        </button>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <BarChart2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No trained models available</h3>
        <p className="mt-2 text-sm text-gray-500">
          You haven't trained any models yet. Use the Model Builder to create your first model.
        </p>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => navigate('/model-builder')}
        >
          Go to Model Builder
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Trained Models</h3>
        <button
          className="text-sm text-blue-600 flex items-center"
          onClick={fetchModels}
        >
          <RefreshCw size={16} className="mr-1" /> Refresh
        </button>
      </div>

      {/* Added success message display */}
      {deleteSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div>
              <p className="text-green-700">{deleteSuccess}</p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Accuracy (R²)</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created</th>
              <th className="relative py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {models.map(model => (
              <React.Fragment key={model.id}>
                <tr>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                    <div className="font-medium text-gray-900">{model.name}</div>
                    {/* Added description display */}
                    {model.description && <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{model.description}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {/* Added linear regression display */}
                    {model.model_type === 'random_forest' ? 'Random Forest' :
                    model.model_type === 'gradient_boosting' ? 'Gradient Boosting' :
                    model.model_type === 'neural_network' ? 'Neural Network' :
                    model.model_type === 'linear_regression' ? 'Linear Regression' :
                    model.model_type || 'Unknown'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {model.r2_score ? Math.round(model.r2_score * 100) + '%' : 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(model.created_at).toLocaleDateString()}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewDetails(model.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => onSelectModel ? onSelectModel(model.id) : handleEditModel(model.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Model"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleExportModel(model.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Export Model"
                      >
                        <Download size={18} />
                      </button>
                      {/* Updated delete button */}
                      <button
                        onClick={() => handleDeleteModel(model.id, model.name)} // Pass model name
                        className={`${
                          deleteConfirm === model.id
                            ? 'text-red-600 animate-pulse bg-red-50 p-1 rounded' // Added background highlight
                            : 'text-gray-600'
                        } hover:text-red-900`}
                        title={deleteConfirm === model.id ? "Click again to confirm" : "Delete Model"}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded details row */}
                {expandedModel === model.id && model.details && (
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="p-4">
                      <div className="text-sm">
                        <h4 className="font-medium text-gray-900 mb-2">Model Details</h4>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <h5 className="font-medium text-gray-700 mb-1">Metrics</h5>
                            <ul className="space-y-1 text-gray-600">
                              <li>R² Score: {model.details.r2_score ? (model.details.r2_score).toFixed(4) : 'N/A'}</li>
                              <li>RMSE: {model.details.rmse ? (model.details.rmse).toFixed(4) : 'N/A'}</li>
                              {/* Added MAE display */}
                              {model.details.mae && <li>MAE: {(model.details.mae).toFixed(4)}</li>}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-medium text-gray-700 mb-1">Dataset</h5>
                            <p className="text-gray-600">
                              {model.details.dataset_id
                                ? `Dataset ID: ${model.details.dataset_id}`
                                : 'No dataset information available'}
                            </p>
                            {/* Added dataset name/count display */}
                            {model.details.dataset && (
                              <p className="text-gray-600 text-xs mt-1">
                                {model.details.dataset.name} ({model.details.dataset.record_count} records)
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-gray-700 mb-1">Parameters</h5>
                            {model.details.parameters && Object.keys(model.details.parameters).length > 0 ? (
                              /* Changed font size */
                              <ul className="space-y-1 text-gray-600 text-sm">
                                {Object.entries(model.details.parameters).map(([key, value]) => (
                                  <li key={key}>{key}: {JSON.stringify(value)}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-gray-500">No parameter information available</p>
                            )}
                          </div>

                          <div>
                            <h5 className="font-medium text-gray-700 mb-1">Features Importance</h5>
                            {model.details.training_history?.feature_importances &&
                            Object.keys(model.details.training_history.feature_importances).length > 0 ? (
                              /* Changed font size */
                              <ul className="space-y-1 text-gray-600 text-sm">
                                {Object.entries(model.details.training_history.feature_importances)
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 5)
                                  .map(([feature, importance]) => (
                                    <li key={feature}>
                                      {feature}: {(importance * 100).toFixed(1)}%
                                    </li>
                                  ))}
                              </ul>
                            ) : (
                              <p className="text-gray-500">No feature importance information available</p>
                            )}
                          </div>
                        </div>

                        {/* Added Features Used section */}
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-700 mb-1">Features Used</h5>
                          {model.details.training_history?.features ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {model.details.training_history.features.map(feature => (
                                <span key={feature} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500">No feature information available</p>
                          )}
                        </div>

                        <div className="mt-4">
                          <h5 className="font-medium text-gray-700 mb-1">Description</h5>
                          <p className="text-gray-600">
                            {model.details.description || 'No description available'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModelsList;