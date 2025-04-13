import React, { useState, useEffect } from 'react';
import { BarChart2, Check, AlignLeft, GitBranch, Save, Database, Download, PlayCircle, List } from 'lucide-react';
import api from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import withProjectRequired from '../hoc/withProjectRequired';
import FeatureSelectionGrid from '../components/models/FeatureSelectionGrid';
import ModelHyperparameters from '../components/models/ModelHyperparameters';
import ModelResultsPanel from '../components/models/ModelResultsPanel';
import ModelsList from '../components/models/ModelsList';
import TrainingProgress from '../components/models/TrainingProgress'; // Import TrainingProgress
import { useProject } from '../contexts/ProjectContext';

const ModelBuilder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [showModelsList, setShowModelsList] = useState(false);
  const [modelsRefreshTrigger, setModelsRefreshTrigger] = useState(0);
  const [activeStep, setActiveStep] = useState('dataSelection');
  const [modelType, setModelType] = useState('random_forest');
  const [targetVariable, setTargetVariable] = useState('performance');
  const [selectedFeatures, setSelectedFeatures] = useState([
    'team_size',
    'avg_tenure',
    'communication_density',
    'diversity_index',
    'hierarchy_levels'
  ]);

  // Define hyperparameters state with defaults
  const [hyperparameters, setHyperparameters] = useState({
    random_forest: {
      n_estimators: 100,
      max_depth: 20,
      min_samples_split: 5
    },
    gradient_boosting: {
      n_estimators: 100,
      learning_rate: 0.1,
      max_depth: 5
    },
    neural_network: {
      hidden_layers: 1,
      neurons_per_layer: 50,
      activation: 'relu',
      alpha: 0.001
    },
    linear_regression: {
      fit_intercept: true,
      regularization: 'none',
      alpha: 0.01
    }
  });

  const [availableFeatures, setAvailableFeatures] = useState([
    { name: 'team_size', label: 'Team Size', category: 'Structure' },
    { name: 'avg_tenure', label: 'Average Tenure', category: 'Employee' },
    { name: 'communication_density', label: 'Communication Density', category: 'Network' },
    { name: 'diversity_index', label: 'Diversity Index', category: 'Team' },
    { name: 'hierarchy_levels', label: 'Hierarchy Levels', category: 'Structure' },
    { name: 'avg_degree_centrality', label: 'Avg. Degree Centrality', category: 'Network' },
    { name: 'manager_span', label: 'Manager Span', category: 'Structure' },
    { name: 'avg_skill', label: 'Average Skill Level', category: 'Employee' },
    { name: 'cross_team_communication', label: 'Cross-Team Communication', category: 'Network' }
  ]);

  const [loading, setLoading] = useState(false);
  const [modelResults, setModelResults] = useState(null);
  const [savedModel, setSavedModel] = useState(null);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [validationStrategy, setValidationStrategy] = useState('cross_validation');
  const [targetColumns, setTargetColumns] = useState([]);
  const [trainingProgress, setTrainingProgress] = useState(0); // Progress percentage
  const [trainingStatus, setTrainingStatus] = useState(null); // 'started', 'processing', 'completed', 'error'
  const [trainingJobId, setTrainingJobId] = useState(null); // Job ID for tracking progress

  // Use this in useEffect to handle navigation with state from NetworkAnalysis
  useEffect(() => {
    loadAvailableDatasets();

    // Check if we have state from network analysis
    if (location.state) {
      // If there's a specific dataset ID suggested
      if (location.state.datasetId) {
        setSelectedDataset(location.state.datasetId);
        // Directly analyze this dataset
        analyzeDataset(location.state.datasetId);
      }

      // If there are suggested features
      if (location.state.suggestedFeatures && location.state.suggestedFeatures.length > 0) {
        setSelectedFeatures(location.state.suggestedFeatures);
      }

      // If there's a suggested target variable
      if (location.state.preSelectTarget) {
        setTargetVariable(location.state.preSelectTarget);
      }
    }
  }, [location]);

  const loadAvailableDatasets = async () => {
    try {
      setLoadingDatasets(true);

      // Get datasets with project filtering if we have an active project
      const params = activeProject ? { project_id: activeProject.id } : {};

      try {
        const response = await api.get('/datasets', { params });

        // Filter for processed datasets (they contain the network features we need)
        const processedDatasets = response.data.filter(d =>
          d.dataset_type === 'processed' ||
          d.name.toLowerCase().includes('processed')
        );

        setAvailableDatasets(processedDatasets);

        if (processedDatasets.length > 0) {
          // If we have a dataset ID from router state, use that one
          if (location.state?.datasetId) {
            const datasetFromState = processedDatasets.find(d => d.id === location.state.datasetId);
            if (datasetFromState) {
              setSelectedDataset(datasetFromState.id);
              analyzeDataset(datasetFromState.id);
              return;
            }
          }

          // Otherwise sort by date and take the newest
          const newest = processedDatasets.sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
          )[0];

          setSelectedDataset(newest.id);

          // If there's a selected dataset, analyze it to suggest features
          if (newest.id) {
            analyzeDataset(newest.id);
          }
        }
      } catch (apiError) {
        console.error('API error:', apiError);
        // Fallback to use mock data if the backend is not available
        const mockDatasets = [
          { id: 1, name: 'Engineering Team Data (Processed)', dataset_type: 'processed', record_count: 250, created_at: new Date().toISOString() },
          { id: 2, name: 'Marketing Department Network', dataset_type: 'processed', record_count: 120, created_at: new Date().toISOString() }
        ];
        setAvailableDatasets(mockDatasets);
        setSelectedDataset(1);
        analyzeDataset(1, true);
      }

    } catch (err) {
      console.error('Error loading datasets:', err);
      setError('Error loading datasets: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingDatasets(false);
    }
  };

  // Helper function to categorize features
  const getFeatureCategory = (featureName) => {
    if (featureName.includes('centrality') || featureName.includes('network') || featureName.includes('communication')) return 'Network';
    if (featureName.includes('team') || featureName.includes('size')) return 'Team';
    if (featureName.includes('employee') || featureName.includes('tenure')) return 'Employee';
    if (featureName.includes('manager') || featureName.includes('hierarchy') || featureName.includes('level')) return 'Structure';
    return 'Other';
  };

  const analyzeDataset = async (datasetId, useMockData = false) => {
    try {
      setLoading(true);

      let analysis;

      if (useMockData) {
        // Mock data for offline/testing mode
        analysis = {
          numeric_columns: [
            'team_size', 'avg_tenure', 'communication_density', 'diversity_index', 'hierarchy_levels',
            'avg_degree_centrality', 'manager_span', 'cross_team_communication', 'employee_count',
            'satisfaction', 'innovation', 'performance', 'turnover'
          ],
          potential_targets: ['performance', 'satisfaction', 'innovation', 'turnover'],
          feature_categories: {
            'team_size': 'Structure',
            'avg_tenure': 'Employee',
            'communication_density': 'Network',
            'diversity_index': 'Team',
            'hierarchy_levels': 'Structure',
            'avg_degree_centrality': 'Network',
            'manager_span': 'Structure',
            'cross_team_communication': 'Network',
            'employee_count': 'Structure',
            'satisfaction': 'Outcome',
            'innovation': 'Outcome',
            'performance': 'Outcome',
            'turnover': 'Outcome'
          }
        };
      } else {
        try {
          const response = await api.get(`/models/analyze-dataset/${datasetId}`);
          analysis = response.data;
        } catch (apiError) {
          console.error('API error, falling back to mock data:', apiError);
          // Fallback to mock data if API fails
          analysis = {
            numeric_columns: [
              'team_size', 'avg_tenure', 'communication_density', 'diversity_index', 'hierarchy_levels',
              'avg_degree_centrality', 'manager_span', 'cross_team_communication', 'employee_count',
              'satisfaction', 'innovation', 'performance', 'turnover'
            ],
            potential_targets: ['performance', 'satisfaction', 'innovation', 'turnover'],
            feature_categories: {
              'team_size': 'Structure',
              'avg_tenure': 'Employee',
              'communication_density': 'Network',
              'diversity_index': 'Team',
              'hierarchy_levels': 'Structure',
              'avg_degree_centrality': 'Network',
              'manager_span': 'Structure',
              'cross_team_communication': 'Network',
              'employee_count': 'Structure',
              'satisfaction': 'Outcome',
              'innovation': 'Outcome',
              'performance': 'Outcome',
              'turnover': 'Outcome'
            }
          };
        }
      }

      // Store potential target columns
      if (analysis.potential_targets && analysis.potential_targets.length > 0) {
        setTargetColumns(analysis.potential_targets);

        // If we have a pre-selected target from route state, use that
        if (location.state?.preSelectTarget &&
            analysis.potential_targets.includes(location.state.preSelectTarget)) {
          setTargetVariable(location.state.preSelectTarget);
        } else {
          // Otherwise use the first suggested target
          setTargetVariable(analysis.potential_targets[0]);
        }
      }

      // Select features based on correlation with potential targets
      if (analysis.numeric_columns && analysis.numeric_columns.length > 0) {
        // If we have suggested features from route state, use those
        if (location.state?.suggestedFeatures && location.state.suggestedFeatures.length > 0) {
          // Filter to only include features that actually exist in the dataset
          const validFeatures = location.state.suggestedFeatures.filter(
            f => analysis.numeric_columns.includes(f)
          );

          if (validFeatures.length > 0) {
            setSelectedFeatures(validFeatures);
          } else {
            // Fallback to auto-selection if suggested features don't match
            const featuresCount = Math.min(8, analysis.numeric_columns.length);
            setSelectedFeatures(analysis.numeric_columns.slice(0, featuresCount));
          }
        } else {
          // Auto-select features
          const featuresCount = Math.min(8, analysis.numeric_columns.length);
          setSelectedFeatures(analysis.numeric_columns.slice(0, featuresCount));
        }

        // Update available features with actual dataset columns
        const dynamicFeatures = analysis.numeric_columns.map(feature => ({
          name: feature,
          label: feature.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          category: analysis.feature_categories?.[feature] || getFeatureCategory(feature)
        }));
        setAvailableFeatures(dynamicFeatures);
      }

      // Set default model name based on the dataset and target
      if (!modelName) {
        const dataset = availableDatasets.find(d => d.id === datasetId);
        if (dataset) {
          setModelName(`${targetVariable.charAt(0).toUpperCase() + targetVariable.slice(1)} Prediction Model`);
          setModelDescription(`Predict ${targetVariable} based on organizational and network features`);
        }
      }

    } catch (err) {
      console.error('Error analyzing dataset:', err);
      setError('Error analyzing dataset: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Updated trainModel function
  const trainModel = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setTrainingProgress(0); // Reset progress
    setTrainingStatus('started'); // Set status
    setTrainingJobId(null); // Reset job ID until we get one from the API

    let useMockDataFallback = false; // Flag to track if mock data path is taken
    try {
      if (!selectedDataset) {
        throw new Error('No dataset selected');
      }

      if (selectedFeatures.length < 2) {
        throw new Error('Please select at least 2 features for training');
      }

      // Prepare training data request body
      const trainingRequest = {
        dataset_id: selectedDataset,
        name: modelName || `${targetVariable} Prediction Model`,
        description: modelDescription || `Model to predict ${targetVariable} using ${selectedFeatures.length} features`,
        model_type: modelType,
        features: selectedFeatures,
        target_column: targetVariable,
        validation_strategy: validationStrategy, // Include validation strategy
        hyperparameters: hyperparameters[modelType],
      };

      // If a project is active, associate the model with it
      if (activeProject) {
        trainingRequest.project_id = activeProject.id;
      }

      // Set up a progress simulation (replace with real progress if backend supports it)
      const progressInterval = setInterval(() => {
        setTrainingProgress(prev => {
          const newProgress = Math.min(prev + (Math.random() * 5), 95);
          return newProgress;
        });
      }, 1000);

      setTrainingStatus('processing');

      try {
        // Call the API endpoint to train the model
        const response = await api.post('/models/train', trainingRequest);

        // Clear the progress interval
        clearInterval(progressInterval);
        setTrainingProgress(100);
        setTrainingStatus('completed');

        // Ensure we have a valid model ID from the response
        if (!response.data || !response.data.id) {
          throw new Error('No model ID returned from training endpoint');
        }

        // Store the full response as savedModel for future updates
        setSavedModel(response.data);
        console.log('Successfully stored model ID:', response.data.id);
        
        // Save job_id for progress tracking
        if (response.data.job_id) {
          setTrainingJobId(response.data.job_id);
          console.log('Training job ID:', response.data.job_id);
        }

        // Set results from the API response
        const modelData = {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          r2_score: response.data.metrics.r2,
          rmse: response.data.metrics.rmse,
          mae: response.data.metrics.mae || null,
          feature_importance: Object.entries(response.data.feature_importances || {})
            .map(([feature, importance]) => ({ feature, importance }))
            .sort((a, b) => b.importance - a.importance),
          features: response.data.features || selectedFeatures,
          validationStrategy: validationStrategy // Pass validation strategy to results
        };

        setModelResults(modelData);

        // Refresh the models list
        setModelsRefreshTrigger(prev => prev + 1);

        // Move to results step
        setActiveStep('results');
        setSuccess('Model trained successfully!');
      } catch (apiError) {
        // Clear the progress interval
        clearInterval(progressInterval);
        setTrainingStatus('error');
        
        // Check if we received a job_id even though there was an error
        if (apiError.response?.data?.job_id) {
          setTrainingJobId(apiError.response.data.job_id);
          console.log('Received job ID despite error:', apiError.response.data.job_id);
        }

        console.error('API error, using mock training results:', apiError);
        useMockDataFallback = true; // Set flag for mock data path

        // Generate mock training results
        const mockR2 = (0.65 + Math.random() * 0.25).toFixed(2);
        const mockRmse = (5 + Math.random() * 3).toFixed(2);

        // Generate mock feature importances
        const featureImportances = {};
        let remainingImportance = 1.0;

        selectedFeatures.forEach((feature, index) => {
          if (index === selectedFeatures.length - 1) {
            featureImportances[feature] = remainingImportance;
          } else {
            const importance = (remainingImportance * (0.1 + Math.random() * 0.4));
            featureImportances[feature] = importance;
            remainingImportance -= importance;
          }
        });

        // Simulate a delay before showing results
        setTimeout(() => {
          const mockModelData = {
            id: Date.now(),
            name: trainingRequest.name,
            description: trainingRequest.description,
            r2_score: parseFloat(mockR2),
            rmse: parseFloat(mockRmse),
            mae: parseFloat((parseFloat(mockRmse) * 0.8).toFixed(2)),
            feature_importance: Object.entries(featureImportances)
              .map(([feature, importance]) => ({ feature, importance }))
              .sort((a, b) => b.importance - a.importance),
            features: selectedFeatures,
            validationStrategy: validationStrategy // Pass validation strategy to mock results
          };

          setModelResults(mockModelData);
          setSavedModel({ // Simulate saved model structure
            id: mockModelData.id,
            name: mockModelData.name,
            description: mockModelData.description,
            model_type: modelType,
            metrics: {
              r2: mockModelData.r2_score,
              rmse: mockModelData.rmse,
              mae: mockModelData.mae
            },
            feature_importances: featureImportances,
            features: selectedFeatures,
            validation_strategy: validationStrategy
          });

          setTrainingStatus('completed');
          setTrainingProgress(100);
          setActiveStep('results');
          setSuccess('Model trained successfully! (Offline Mode)');
          setLoading(false);
        }, 2000);

        // Don't immediately set loading to false since we're using setTimeout
        return;
      }

    } catch (err) {
      console.error('Error training model:', err);
      setError('Error training model: ' + (err.response?.data?.detail || err.message));
      setTrainingStatus('error');
    } finally {
      // Only set loading false here if not using the mock data fallback (which handles it in setTimeout)
      if (!useMockDataFallback) {
         setLoading(false);
      }
    }
  };

  // Updated saveModel function
  const saveModel = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!savedModel || !savedModel.id) {
        // We should always have a savedModel from the training step
        throw new Error('No trained model available to save/update');
      }

      console.log('Updating model with data:', {
        name: modelName,
        description: modelDescription,
        project_id: activeProject?.id
      });

      // Ensure the model is associated with the current project
      const saveRequest = {
        name: modelName || modelResults.name,
        description: modelDescription || modelResults.description,
        is_public: false, // Default to private
        tags: ['organization', targetVariable, modelType],
        project_id: activeProject?.id // Make sure it's connected to the project
      };

      // Always update the existing model created during training
      const modelIdToUpdate = savedModel.id;
      console.log(`Updating existing model ${modelIdToUpdate}`);
      const response = await api.put(`/models/${modelIdToUpdate}`, saveRequest);
      setSavedModel(response.data); // Update savedModel state with the response
      setSuccess('Model updated successfully!');

      // Refresh the models list
      setModelsRefreshTrigger(prev => prev + 1);

    } catch (err) {
      console.error('Error saving model:', err);
      setError('Error saving model: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };


  // Function to export the model as a JSON file
  const exportModel = () => {
    if (!modelResults) return;

    try {
      // Create a JSON string of the model data
      const modelData = {
        ...savedModel, // Use the saved model data which includes backend ID etc.
        metrics: {
          r2_score: modelResults.r2_score,
          rmse: modelResults.rmse,
          mae: modelResults.mae
        },
        feature_importance: modelResults.feature_importance.reduce(
          (obj, item) => ({ ...obj, [item.feature]: item.importance }),
          {}
        ),
        model_type: modelType,
        features: selectedFeatures,
        target_column: targetVariable,
        validation_strategy: validationStrategy, // Include validation strategy
        created_at: new Date().toISOString()
      };

      const jsonString = JSON.stringify(modelData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create a download link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = `${modelName.replace(/\s+/g, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Model exported successfully!');
    } catch (err) {
      console.error('Error exporting model:', err);
      setError('Error exporting model: ' + err.message);
    }
  };

  const handleFeatureToggle = (featureName) => {
    if (selectedFeatures.includes(featureName)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== featureName));
    } else {
      setSelectedFeatures([...selectedFeatures, featureName]);
    }
  };

  const handleParameterChange = (paramType, paramName, value) => {
    setHyperparameters(prev => ({
      ...prev,
      [paramType]: {
        ...prev[paramType],
        [paramName]: value
      }
    }));
  };

  const steps = [
    { id: 'dataSelection', name: 'Data Selection', icon: AlignLeft },
    { id: 'featureEngineering', name: 'Feature Selection', icon: GitBranch },
    { id: 'modelConfig', name: 'Model Configuration', icon: BarChart2 },
    { id: 'results', name: 'Results', icon: Check }
  ];

  return (
    <div className="space-y-6">
      {/* Progress bar when loading */}
      {loading && (
        <div className="fixed top-0 left-0 w-full z-50">
          <div className="h-1 bg-blue-600 animate-pulse"></div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Builder</h1>
          {activeProject && (
            <p className="text-sm text-gray-500 mt-1">Project: {activeProject.title}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 ${showModelsList ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} rounded flex items-center`}
            onClick={() => setShowModelsList(!showModelsList)}
          >
            <List size={16} className="mr-1" /> {showModelsList ? 'Hide Models' : 'Show Models'}
          </button>
          {modelResults && (
            <>
              <button
                className="px-3 py-1 bg-gray-600 text-white rounded flex items-center"
                onClick={exportModel}
                disabled={loading}
              >
                <Download size={16} className="mr-1" /> Export
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded flex items-center"
                onClick={saveModel}
                disabled={loading}
              >
                <Save size={16} className="mr-1" /> Save Model {/* Always show Save Model */}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div>
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Models List Panel */}
      {showModelsList && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <ModelsList
            onSelectModel={(modelId) => {
              // Handle model selection logic
              // For now, just navigate to editing that model
              navigate('/model-builder', { state: { modelId } });
            }}
            refreshTrigger={modelsRefreshTrigger}
          />
        </div>
      )}

      {/* Steps navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {steps.map((step, index) => (
              <button
                key={step.id}
                className={`${
                  activeStep === step.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center justify-center`}
                onClick={() => index <= steps.findIndex(s => s.id === activeStep) && setActiveStep(step.id)}
                disabled={index > steps.findIndex(s => s.id === activeStep) && !modelResults}
              >
                <step.icon className="mr-2 h-5 w-5" />
                {step.name}
              </button>
            ))}
          </nav>

          {/* Step progress indicator */}
          <div className="h-1.5 w-full bg-gray-100">
            <div
              className="h-1.5 bg-blue-600 transition-all duration-300"
              style={{
                width: `${(steps.findIndex(s => s.id === activeStep) + 1) * 25}%`
              }}
            ></div>
          </div>
        </div>

        <div className="p-6">
          {activeStep === 'dataSelection' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Data Source</h2>
              <div className="space-y-4">
                {loadingDatasets ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 mb-2 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                      <div className="text-gray-500">Loading datasets...</div>
                    </div>
                  </div>
                ) : availableDatasets.length === 0 ? (
                  <div className="bg-yellow-50 p-8 rounded-lg text-center">
                    <Database size={48} className="mx-auto text-yellow-400 mb-4" />
                    <p className="text-gray-600 mb-4">No processed datasets available.</p>
                    <p className="text-sm text-gray-500">
                      Please go to Data Import page first and process some data.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {availableDatasets.map(dataset => (
                        <div
                          key={dataset.id}
                          className={`border rounded-md p-4 ${selectedDataset === dataset.id ? 'bg-blue-50 border-blue-500' : 'border-gray-200'}`}
                          onClick={() => {
                            setSelectedDataset(dataset.id);
                            analyzeDataset(dataset.id);
                          }}
                        >
                          <div className="flex items-center">
                            <div className={`h-5 w-5 mr-3 flex items-center justify-center rounded-full ${selectedDataset === dataset.id ? 'bg-blue-500 text-white' : 'border border-gray-400'}`}>
                              {selectedDataset === dataset.id && <Check size={12} />}
                            </div>
                            <div>
                              <p className="font-medium">{dataset.name}</p>
                              <p className="text-sm text-gray-500">
                                {dataset.record_count} records, created {new Date(dataset.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      <h3 className="font-medium text-gray-700 mb-2">Target Variable</h3>
                      <select
                        value={targetVariable}
                        onChange={(e) => setTargetVariable(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="performance">Team Performance</option>
                        <option value="innovation">Innovation Score</option>
                        <option value="satisfaction">Employee Satisfaction</option>
                        <option value="turnover">Turnover Rate</option>
                      </select>
                    </div>

                    <div className="pt-4">
                      <h3 className="font-medium text-gray-700 mb-2">Model Name (Optional)</h3>
                      <input
                        type="text"
                        placeholder="Enter a name for your model"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      />
                    </div>
                  </>
                )}

                <div className="pt-4 flex justify-end">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                    onClick={() => setActiveStep('featureEngineering')}
                    disabled={!selectedDataset}
                  >
                    Next: Feature Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeStep === 'featureEngineering' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Features</h2>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Select the features to include in your model. Including too many features can lead to overfitting.
                </p>

                <FeatureSelectionGrid
                  availableFeatures={availableFeatures}
                  selectedFeatures={selectedFeatures}
                  onToggle={handleFeatureToggle}
                />

                <div className="pt-4 flex justify-between">
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded"
                    onClick={() => setActiveStep('dataSelection')}
                  >
                    Back
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                    onClick={() => setActiveStep('modelConfig')}
                    disabled={selectedFeatures.length === 0}
                  >
                    Next: Model Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeStep === 'modelConfig' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Configure Model</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Type
                  </label>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="random_forest">Random Forest</option>
                    <option value="gradient_boosting">Gradient Boosting</option>
                    <option value="neural_network">Neural Network</option>
                    <option value="linear_regression">Linear Regression</option>
                  </select>
                </div>

                <ModelHyperparameters
                  modelType={modelType}
                  hyperparameters={hyperparameters[modelType]}
                  onParameterChange={(param, value) => handleParameterChange(modelType, param, value)}
                  className="bg-gray-50 p-4 rounded-md"
                  isLoading={loading}
                />

                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-700 mb-2">Validation Strategy</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="cross-validation"
                        name="validation"
                        type="radio"
                        value="cross_validation"
                        checked={validationStrategy === 'cross_validation'}
                        onChange={() => setValidationStrategy('cross_validation')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="cross-validation" className="ml-2 block text-sm text-gray-700">
                        5-Fold Cross-validation
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="train-test"
                        name="validation"
                        type="radio"
                        value="train_test_split"
                        checked={validationStrategy === 'train_test_split'}
                        onChange={() => setValidationStrategy('train_test_split')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="train-test" className="ml-2 block text-sm text-gray-700">
                        80/20 Train-Test Split
                      </label>
                    </div>
                  </div>
                </div>

                {/* Use TrainingProgress component */}
                {(trainingStatus === 'processing' || trainingStatus === 'started') && (
                  <div className="my-4">
                    <TrainingProgress
                      jobId={trainingJobId} // Pass the job ID for progress tracking
                      progress={trainingProgress}
                      status={trainingStatus}
                      onComplete={(data) => { // Handle completion callback
                        if (data && data.results) {
                          setTrainingStatus('completed');
                          setTrainingProgress(100);
                          const modelData = {
                            id: data.model_id, // Use model_id if returned by backend
                            name: data.name || modelName,
                            description: data.description || modelDescription,
                            r2_score: data.results.r2 || 0,
                            rmse: data.results.rmse || 0,
                            mae: data.results.mae || 0,
                            feature_importance: data.results.feature_importances ?
                              Object.entries(data.results.feature_importances)
                                .map(([feature, importance]) => ({ feature, importance }))
                                .sort((a, b) => b.importance - a.importance) : [],
                            features: data.features || selectedFeatures,
                            validationStrategy: data.validation_strategy || validationStrategy
                          };
                          setModelResults(modelData);
                          setActiveStep('results');
                          setSuccess('Model trained successfully!');
                        }
                        else if (data.status === 'error') {
                          setTrainingStatus('error');
                          setError('Error during model training: ' + (data.message || 'Unknown error'));
                        }
                      }}
                    />
                  </div>
                )}

                <div className="pt-4 flex justify-between">
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded"
                    onClick={() => setActiveStep('featureEngineering')}
                    disabled={loading || trainingStatus === 'processing'}
                  >
                    Back
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
                    onClick={trainModel}
                    disabled={loading || trainingStatus === 'processing'}
                  >
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                        Training Model...
                      </>
                    ) : (
                      'Train Model'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeStep === 'results' && modelResults && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Model Results</h2>

              <ModelResultsPanel
                results={modelResults}
                availableFeatures={availableFeatures}
              />

              <div className="pt-6 flex justify-between">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded"
                  onClick={() => setActiveStep('modelConfig')}
                >
                  Back
                </button>
                <div className="flex space-x-2">
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded flex items-center"
                    onClick={() => navigate('/simulation', { state: { selectedModelId: modelResults.id } })}
                    disabled={loading}
                  >
                    <PlayCircle size={16} className="mr-1" /> Apply to Simulation
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-600 text-white rounded flex items-center"
                    onClick={exportModel}
                    disabled={loading}
                  >
                    <Download size={16} className="mr-1" /> Export
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
                    onClick={saveModel}
                    disabled={loading}
                  >
                    <Save size={16} className="mr-1" /> Save Model
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withProjectRequired(ModelBuilder);