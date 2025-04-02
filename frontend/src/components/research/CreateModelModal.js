import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';

const CreateModelModal = ({ isOpen, onClose, projectId, onModelCreated }) => {
  const [datasets, setDatasets] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model_type: 'random_forest',
    dataset_id: '',
    version: '1.0.0',
    parameters: JSON.stringify({
      n_estimators: 100,
      max_depth: 10,
      random_state: 42
    }, null, 2),
    project_id: projectId // Ensure project_id is included
  });
  const [loading, setLoading] = useState(false);
  const [fetchingDatasets, setFetchingDatasets] = useState(false);
  const [error, setError] = useState(null);
  const [datasetColumns, setDatasetColumns] = useState([]); // State for dataset columns

 useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectDatasets();
      // Reset form data when modal opens
      setFormData({
        name: '',
        description: '',
        model_type: 'random_forest',
        dataset_id: '',
        version: '1.0.0',
        parameters: JSON.stringify({ n_estimators: 100, max_depth: 10, random_state: 42 }, null, 2),
        project_id: projectId
      });
      setDatasetColumns([]);
      setError(null);
    }
  }, [isOpen, projectId]);

 useEffect(() => {
    // Fetch columns when dataset selection changes
    if (formData.dataset_id) {
      fetchDatasetColumns(formData.dataset_id);
    } else {
      setDatasetColumns([]);
      // Reset target and feature columns if dataset is deselected
      setFormData(prev => ({
        ...prev,
        parameters: JSON.stringify({
          ...JSON.parse(prev.parameters),
          target_column: '',
          feature_columns: []
        }, null, 2)
      }));
    }
  }, [formData.dataset_id]);

 const fetchProjectDatasets = async () => {
    try {
      setFetchingDatasets(true);
      const response = await api.get('/datasets', {
        params: { project_id: projectId }
      });
      // Filter for processed datasets if possible, otherwise show all
      const availableDatasets = response.data.filter(d => d.name.includes('(Processed)') || response.data.length === 0);
      setDatasets(availableDatasets.length > 0 ? availableDatasets : response.data);
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError('Failed to load project datasets');
    } finally {
      setFetchingDatasets(false);
    }
  };

 const fetchDatasetColumns = async (datasetId) => {
    try {
      // Placeholder: In a real app, fetch columns from the backend
      // For now, use dummy columns based on dataset name or type
      const selectedDataset = datasets.find(d => d.id === parseInt(datasetId));
      if (selectedDataset) {
          // Simulate fetching columns - replace with actual API call
          console.log(`Fetching columns for dataset: ${selectedDataset.name}`);
          // Example dummy columns
          setDatasetColumns([
            'employee_id', 'department', 'role', 'tenure_months', 'skill_level',
            'performance_score', 'team_size', 'direct_reports_count', 'management_level',
            'degree_centrality', 'betweenness_centrality', 'closeness_centrality', 'clustering_coefficient'
          ]);
      } else {
          setDatasetColumns([]);
      }
    } catch (err) {
      console.error('Error fetching dataset columns:', err);
      setError('Failed to load dataset columns');
      setDatasetColumns([]);
    }
  };


 const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

 const handleParametersChange = (e) => {
    // Update the parameters string directly
    setFormData((prev) => ({
      ...prev,
      parameters: e.target.value
    }));
  };

 const handleModelTypeChange = (e) => {
    const modelType = e.target.value;

    // Update parameters template based on model type
    let parametersTemplate = {};

    switch (modelType) {
      case 'random_forest':
        parametersTemplate = { n_estimators: 100, max_depth: 10, random_state: 42, feature_columns: [], target_column: "" };
        break;
      case 'neural_network':
        parametersTemplate = { hidden_layers: [64, 32], activation: 'relu', learning_rate: 0.001, epochs: 100, feature_columns: [], target_column: "" };
        break;
      case 'svm':
        parametersTemplate = { kernel: 'rbf', C: 1.0, gamma: 'scale', feature_columns: [], target_column: "" };
        break;
      case 'decision_tree':
         parametersTemplate = { criterion: 'gini', max_depth: 5, random_state: 42, feature_columns: [], target_column: "" };
         break;
      case 'logistic_regression':
         parametersTemplate = { penalty: 'l2', C: 1.0, solver: 'liblinear', feature_columns: [], target_column: "" };
         break;
      case 'kmeans':
         parametersTemplate = { n_clusters: 3, init: 'k-means++', n_init: 10, random_state: 42, feature_columns: [] }; // No target for clustering
         break;
      default:
        parametersTemplate = { feature_columns: [], target_column: "" };
    }

    // Preserve existing feature/target columns if they exist in the new template
    try {
        const currentParams = JSON.parse(formData.parameters);
        if (currentParams.feature_columns) parametersTemplate.feature_columns = currentParams.feature_columns;
        if (currentParams.target_column && parametersTemplate.hasOwnProperty('target_column')) {
            parametersTemplate.target_column = currentParams.target_column;
        }
    } catch {
        // Ignore parsing errors if current parameters are invalid
    }


    setFormData((prev) => ({
      ...prev,
      model_type: modelType,
      parameters: JSON.stringify(parametersTemplate, null, 2)
    }));
  };

  // Handlers for feature and target column selection within parameters JSON
  const handleParamSubChange = (paramKey, value) => {
      try {
          const currentParams = JSON.parse(formData.parameters);
          currentParams[paramKey] = value;
          setFormData(prev => ({ ...prev, parameters: JSON.stringify(currentParams, null, 2) }));
      } catch (err) {
          console.error("Error updating parameters JSON:", err);
          setError("Parameters field contains invalid JSON.");
      }
  };

  const handleFeatureToggle = (column) => {
      try {
          const currentParams = JSON.parse(formData.parameters);
          const features = currentParams.feature_columns || [];
          const index = features.indexOf(column);
          if (index > -1) {
              features.splice(index, 1); // Remove feature
          } else {
              features.push(column); // Add feature
          }
          currentParams.feature_columns = features;
          setFormData(prev => ({ ...prev, parameters: JSON.stringify(currentParams, null, 2) }));
      } catch (err) {
          console.error("Error updating feature columns in parameters JSON:", err);
          setError("Parameters field contains invalid JSON.");
      }
  };


 const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

   try {
      // Validate parameters JSON before submitting
      let parsedParameters;
      try {
        parsedParameters = JSON.parse(formData.parameters);
        // Basic validation for required fields in parameters
        if (!parsedParameters.feature_columns || parsedParameters.feature_columns.length === 0) {
            throw new Error('Please select at least one feature column.');
        }
        if (formData.model_type !== 'kmeans' && (!parsedParameters.target_column)) { // K-Means doesn't need a target
             throw new Error('Please select a target column.');
        }

      } catch (err) {
        throw new Error(`Invalid JSON in parameters field: ${err.message}`);
      }

      // Prepare model data
      const modelData = {
        ...formData,
        parameters: formData.parameters, // Send as string
        project_id: projectId,
      };

      // Since the model endpoint might not exist yet, we're using try/catch
      try {
        const response = await api.post('/research/models', modelData); // Assuming this endpoint exists
        onModelCreated(response.data);
        onClose();
      } catch (err) {
         if (err.response?.status === 404 || err.message.includes('404')) {
             console.error('Model creation endpoint not found:', err);
             // Simulate success for demo purposes if endpoint is missing
             alert('Model creation simulation successful! (Backend endpoint /research/models needs implementation)');
             onModelCreated({ id: Date.now(), ...formData, parameters: parsedParameters }); // Simulate response
             onClose();
         } else {
            throw err; // Re-throw other errors
         }
      }
    } catch (err) {
      setError(err.message || 'Failed to create model');
      console.error('Error in form submission:', err);
    } finally {
      setLoading(false);
    }
  };

 if (!isOpen) return null;

 // Safely parse parameters for UI rendering, default to empty object on error
 let currentParamsUI = {};
 try {
     currentParamsUI = JSON.parse(formData.parameters);
 } catch {
     // Keep default empty object if JSON is invalid
 }
 const featureColumnsUI = currentParamsUI.feature_columns || [];
 const targetColumnUI = currentParamsUI.target_column || "";


 return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">Create Model</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

       {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 sticky top-[65px] z-10">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

       <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Model Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter model name"
              />
            </div>

            <div>
              <label htmlFor="model_type" className="block text-sm font-medium text-gray-700 mb-1">
                Model Type *
              </label>
              <select
                id="model_type"
                name="model_type"
                value={formData.model_type}
                onChange={handleModelTypeChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="random_forest">Random Forest</option>
                <option value="neural_network">Neural Network</option>
                <option value="svm">Support Vector Machine</option>
                <option value="decision_tree">Decision Tree</option>
                <option value="logistic_regression">Logistic Regression</option>
                <option value="kmeans">K-Means Clustering</option>
                <option value="custom">Custom Algorithm</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the model's purpose"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="dataset_id" className="block text-sm font-medium text-gray-700 mb-1">
                Training Dataset *
              </label>
              <select
                id="dataset_id"
                name="dataset_id"
                value={formData.dataset_id}
                onChange={handleChange}
                required
                disabled={fetchingDatasets}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select Dataset --</option>
                {datasets.map(dataset => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.record_count} records)
                  </option>
                ))}
              </select>
              {fetchingDatasets && (
                <p className="mt-1 text-sm text-gray-500">Loading datasets...</p>
              )}
            </div>

            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                type="text"
                id="version"
                name="version"
                value={formData.version}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 1.0.0"
              />
            </div>
          </div>

         {/* Feature and Target Selection (only if dataset is selected) */}
         {formData.dataset_id && datasetColumns.length > 0 && (
            <>
              {formData.model_type !== 'kmeans' && ( // K-Means doesn't need a target
                  <div className="mb-4">
                    <label htmlFor="target_column" className="block text-sm font-medium text-gray-700 mb-1">
                      Target Column *
                    </label>
                    <select
                      id="target_column"
                      name="target_column"
                      value={targetColumnUI}
                      onChange={(e) => handleParamSubChange('target_column', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Select Target --</option>
                      {datasetColumns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>
              )}

             <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feature Columns *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                  {datasetColumns
                    .filter(col => col !== targetColumnUI) // Exclude target from features
                    .map((column) => (
                    <div key={column} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`feature-${column}`}
                        checked={featureColumnsUI.includes(column)}
                        onChange={() => handleFeatureToggle(column)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`feature-${column}`}
                        className="ml-2 text-sm text-gray-700"
                      >
                        {column}
                      </label>
                    </div>
                  ))}
                </div>
                {featureColumnsUI.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    Please select at least one feature column.
                  </p>
                )}
              </div>
            </>
          )}


          <div className="mb-4">
            <label htmlFor="parameters" className="block text-sm font-medium text-gray-700 mb-1">
              Model Parameters (JSON)
            </label>
            <textarea
              id="parameters"
              name="parameters"
              value={formData.parameters}
              onChange={handleParametersChange} // Use direct change handler
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter model hyperparameters as a valid JSON object. Feature/Target columns selected above will be automatically included.
            </p>
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
              disabled={loading || !formData.dataset_id || (formData.model_type !== 'kmeans' && !targetColumnUI) || featureColumnsUI.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateModelModal;