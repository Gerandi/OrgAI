import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Database, RefreshCw, Filter, List, Grid } from 'lucide-react';
import api from '../services/api';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import withProjectRequired from '../hoc/withProjectRequired';
import FeatureIdentifier from '../components/data/features/FeatureIdentifier';

const DataImport = () => {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedFileType, setSelectedFileType] = useState(null);
  const [orgFile, setOrgFile] = useState(null);
  const [commFile, setCommunicationFile] = useState(null);
  const [perfFile, setPerformanceFile] = useState(null);
  const [customFile, setCustomFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState('uploaded'); // 'uploaded' or 'processed' tabs
  const [processingDataset, setProcessingDataset] = useState(false);
  const [datasetProcessed, setDatasetProcessed] = useState(false);
  const [processedDatasetId, setProcessedDatasetId] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingDetails, setProcessingDetails] = useState(null);
  const [selectedDatasets, setSelectedDatasets] = useState({
    organization: null,
    communication: null,
    performance: null
  });
  
  // State to track selected dataset for feature identification
  const [selectedDatasetForFeatures, setSelectedDatasetForFeatures] = useState(null);

  // Refresh datasets when active project changes
  useEffect(() => {
    if (activeProject) {
      console.log(`Active project changed to ${activeProject.title}, refreshing datasets...`);
      // Reset selected datasets when project changes
      setSelectedDatasets({
        organization: null,
        communication: null,
        performance: null
      });
    }
    fetchDatasets();
  }, [activeProject]);

  // Filter datasets based on active tab
  useEffect(() => {
    if (!datasets.length) return;

    if (activeTab === 'uploaded') {
      setFilteredDatasets(datasets.filter(d =>
        !d.name.toLowerCase().includes('processed') &&
        d.dataset_type !== 'processed'
      ));
    } else if (activeTab === 'processed') {
      setFilteredDatasets(datasets.filter(d =>
        d.name.toLowerCase().includes('processed') ||
        d.dataset_type === 'processed'
      ));
    } else {
      setFilteredDatasets(datasets);
    }
  }, [datasets, activeTab]);

  const fetchDatasets = useCallback(async () => {
    try {
      setLoadingDatasets(true);
      console.log('Fetching datasets...');

      // Add project_id filter if we have an active project
      const params = activeProject ? { project_id: activeProject.id } : {};
      const response = await api.get('/datasets', { params });

      console.log(`Loaded ${response.data.length} datasets${activeProject ? ' for project: ' + activeProject.title : ''}`);
      setDatasets(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError(err.response?.data?.detail || `Error fetching datasets: ${err.message}`);
    } finally {
      setLoadingDatasets(false);
    }
  }, [activeProject]);

  const handleExportDataset = (datasetId) => {
    window.open(`${api.defaults.baseURL}/datasets/${datasetId}/export`, '_blank');
  };

  const handleRefresh = async () => {
    setSuccess(null);
    setError(null);
    await fetchDatasets();
    setSuccess('Data refreshed');

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  const handleFileChange = (setter, fileType) => (e) => {
    if (e.target.files && e.target.files[0]) {
      // Store the file
      setter(e.target.files[0]);
      // Store which type of file is being processed
      setSelectedFileType(fileType);

      // Reset progress for this file type
      setUploadProgress(prev => ({
        ...prev,
        [fileType]: 0
      }));

      // Check file size and warn if too large
      const fileSizeMB = e.target.files[0].size / (1024 * 1024);
      if (fileSizeMB > 50) {
        setError(`Warning: Selected file is ${fileSizeMB.toFixed(1)}MB. Large files may take a while to upload and process.`);
      } else {
        setError(null);
      }

      // Basic validation of file type
      const fileName = e.target.files[0].name.toLowerCase();
      const fileExtension = fileName.split('.').pop();

      if (!['csv', 'xlsx', 'xls', 'txt'].includes(fileExtension)) {
        setError(`Warning: File type .${fileExtension} may not be supported. Please use CSV or Excel files.`);
      }

      // Basic content validation based on file name patterns
      if (fileType === 'organization' && !fileName.includes('org') && !fileName.includes('employee') && !fileName.includes('structure')) {
        setSuccess(`Tip: This looks like it might not be an organization file. Make sure it contains employee data with reporting structure.`);
      } else if (fileType === 'communication' && !fileName.includes('comm') && !fileName.includes('message') && !fileName.includes('interact')) {
        setSuccess(`Tip: This looks like it might not be a communication file. Make sure it contains sender/receiver info with timestamps.`);
      } else if (fileType === 'performance' && !fileName.includes('perf') && !fileName.includes('metric') && !fileName.includes('eval')) {
        setSuccess(`Tip: This looks like it might not be a performance file. Make sure it contains evaluation scores for employees.`);
      }
    }
  };

  const handleUpload = async (fileType, file) => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    // Initialize progress for this file type
    setUploadProgress(prev => ({
      ...prev,
      [fileType]: 0
    }));

    // Generate a meaningful name based on file type and date
    const currentDate = new Date().toISOString().split('T')[0];
    const defaultName = `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} Data - ${currentDate}`;

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // If the file type is 'custom', use auto-detection
    if (fileType === 'custom') {
      formData.append('auto_detect', 'true');
    } else {
      formData.append('file_type', fileType);
    }

    // Add project_id if we have an active project
    if (activeProject) {
      formData.append('project_id', activeProject.id);
      formData.append('name', `${activeProject.title} - ${fileType} Data`);
      formData.append('description', `${fileType} data for ${activeProject.title} project`);
    } else {
      // Use default naming if no project is selected
      formData.append('name', defaultName);
      formData.append('description', `${fileType} data uploaded on ${currentDate}`);
    }

    try {
      const response = await api.post('/datasets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          // Calculate and update upload progress
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({
            ...prev,
            [fileType]: percentCompleted
          }));
        }
      });

      // Set progress to 100% on success
      setUploadProgress(prev => ({
        ...prev,
        [fileType]: 100
      }));

      setSuccess(`Successfully uploaded ${file.name}`);
      console.log('Upload succeeded, refreshing dataset list...');

      // Add small delay to ensure database has completed transaction
      setTimeout(async () => {
        await fetchDatasets(); // Refresh datasets after upload

        // Auto-select the uploaded dataset for processing if it's org/comm/perf type
        const newDatasets = await api.get('/datasets', { params: activeProject ? { project_id: activeProject.id } : {} });
        const justUploadedDataset = newDatasets.data
          .filter(d => d.name.includes(defaultName) || (activeProject && d.name.includes(`${activeProject.title} - ${fileType}`)))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        if (justUploadedDataset) {
          // Auto-select this dataset if it's one of the main types
          if (fileType === 'organization' || fileType === 'communication' || fileType === 'performance') {
            handleDatasetSelection(fileType, justUploadedDataset.id);
          }
          
          // Auto-select for feature identification if it's 'custom' or any new dataset
          if (fileType === 'custom' || activeTab === 'uploaded') {
            setSelectedDatasetForFeatures(justUploadedDataset.id);
          }
        }
      }, 500);

      // Clear file after successful upload
      switch (fileType) {
        case 'organization':
          setOrgFile(null);
          break;
        case 'communication':
          setCommunicationFile(null);
          break;
        case 'performance':
          setPerformanceFile(null);
          break;
        case 'custom':
          setCustomFile(null);
          break;
        default:
          break;
      }

      // Clear selected file type
      setSelectedFileType(null);

    } catch (err) {
      // Clear progress on error
      setUploadProgress(prev => ({
        ...prev,
        [fileType]: 0
      }));

      if (err.response?.status === 415) {
        setError('This file format is not supported. Please use CSV or Excel files.');
      } else if (err.response?.status === 413) {
        setError('File is too large. Please upload a smaller file or contact support for assistance with large datasets.');
      } else {
        setError(err.response?.data?.detail || 'Error uploading file');
      }
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = (templateType) => {
    // Direct download using API endpoint
    window.open(`${api.defaults.baseURL}/datasets/templates/${templateType}`, '_blank');
  };

  // Update dataset selection
  const handleDatasetSelection = (type, datasetId) => {
    setSelectedDatasets(prev => ({
      ...prev,
      [type]: datasetId
    }));
  };

  const [suggestion, setSuggestion] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  const handleProcessDataset = async () => {
    setProcessingDataset(true);
    setError(null);
    setSuccess(null);
    setDatasetProcessed(false);
    setErrorDetails(null);
    setSuggestion(null);
    setProcessingProgress(0);
    setProcessingDetails(null);

    // Ensure at least organization dataset is selected
    if (!selectedDatasets.organization) {
      setError('Please select an organization dataset for processing');
      setProcessingDataset(false);
      return;
    }

    try {
      // Create a simulation of progress to show user that processing is happening
      // (since the backend processing doesn't provide real-time updates)
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          // Never reach 100% automatically - that's for when we get actual completion
          const newProgress = prev + (Math.random() * 5);
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 500);

      // Create a date-based name for the processed dataset
      const currentDate = new Date().toISOString().split('T')[0];
      const processedDataName = activeProject
        ? `${activeProject.title} - Processed Data (${currentDate})`
        : `Processed Organization Data (${currentDate})`;

      // Get dataset details to better name the processed result
      const selectedOrg = datasets.find(d => d.id === selectedDatasets.organization);
      const selectedComm = selectedDatasets.communication ? datasets.find(d => d.id === selectedDatasets.communication) : null;
      const selectedPerf = selectedDatasets.performance ? datasets.find(d => d.id === selectedDatasets.performance) : null;

      // Create a more descriptive name if possible
      let smartName = '';
      if (selectedOrg) {
        // Base the name on the org dataset
        smartName = `Processed ${selectedOrg.name}`;

        // Add indication if we have communication or performance data
        if (selectedComm && selectedPerf) {
          smartName = `${smartName} with Network & Performance`;
        } else if (selectedComm) {
          smartName = `${smartName} with Network Analysis`;
        } else if (selectedPerf) {
          smartName = `${smartName} with Performance`;
        }
      } else {
        // Fallback to default name
        smartName = processedDataName;
      }

      // Set up processing options
      const processingOptions = {
        dataset_type: 'org_structure',
        build_network: true,
        communication_dataset_id: selectedDatasets.communication,
        performance_dataset_id: selectedDatasets.performance,
        output_name: smartName,
        description: activeProject
          ? `Processed data for ${activeProject.title} project combining organization${selectedComm ? ', communication' : ''}${selectedPerf ? ', performance' : ''} data`
          : `Processed organizational data created on ${currentDate}${selectedComm ? ' with network analysis' : ''}${selectedPerf ? ' and performance metrics' : ''}`,
        processing_options: {
          // Add specific processing options
          normalize_numeric: true,
          fill_missing_values: true,
          calculate_team_metrics: true,
          include_network_features: selectedDatasets.communication !== null,
          // Add timestamps for better tracking
          processed_at: new Date().toISOString(),
          processing_client: 'web-ui',
          client_version: '1.0.0'
        }
      };

      if (activeProject) {
        processingOptions.project_id = activeProject.id;
      }

      // Show user what's being processed
      setProcessingDetails({
        message: 'Processing datasets...',
        orgDataset: selectedOrg?.name || 'Organization data',
        commDataset: selectedComm?.name || null,
        perfDataset: selectedPerf?.name || null,
        startTime: new Date().toISOString()
      });

      // Call the API to process the dataset
      const response = await api.post(`/datasets/${selectedDatasets.organization}/process`, processingOptions);

      // Stop the progress simulation
      clearInterval(progressInterval);
      // Set to 100% complete
      setProcessingProgress(100);

      // Log detailed processing information
      console.log('Processing results:', response.data);

      // Update processing details with results
      setProcessingDetails(prev => ({
        ...prev,
        complete: true,
        endTime: new Date().toISOString(),
        recordCount: response.data.record_count,
        featureCount: response.data.processing_summary?.feature_count || 0,
        warnings: response.data.warnings || []
      }));

      // Set success message with more details
      setSuccess(`Dataset processed successfully! Created new dataset with ${response.data.record_count} records and ${response.data.processing_summary?.feature_count || 'multiple'} features.`);

      setDatasetProcessed(true);

      // Store the processed dataset ID for later use
      const newProcessedDatasetId = response.data.dataset_id;
      setProcessedDatasetId(newProcessedDatasetId);
      
      // Set the processed dataset for feature identification
      setSelectedDatasetForFeatures(newProcessedDatasetId);

      // Add a small delay to ensure database has time to complete the transaction
      setTimeout(() => {
        fetchDatasets(); // Refresh dataset list
        setActiveTab('processed'); // Switch to processed tab to show the newly processed dataset
      }, 500);

      // Determine which suggestion to show based on the processing summary and dataset types
      const hasNetworkFeatures = response.data.processing_summary?.network_features?.length > 0 ||
        selectedDatasets.communication ||
        response.data.processing_summary?.has_network_data ||
        response.data.processing_summary?.feature_names?.some(f =>
          f.toLowerCase().includes('centrality') ||
          f.toLowerCase().includes('community') ||
          f.toLowerCase().includes('network'));

      if (hasNetworkFeatures) {
        setSuggestion({
          type: 'network',
          message: 'Network features detected. View network analysis to explore organizational structure and communication patterns.',
          details: selectedComm ?
            `Includes communication data from ${selectedComm.name} with ${response.data.processing_summary?.network_features?.length || 'multiple'} network metrics.` :
            'Network structure extracted from organizational hierarchy.',
          action: () => navigate('/network', {
            state: {
              datasetId: newProcessedDatasetId
            }
          })
        });
      } else {
        // Get the most likely target variables
        const targets = response.data.processing_summary?.potential_targets || [];
        const targetSuggestion = targets.length > 0 ? targets[0] : 'performance';

        // Suggest model building
        setSuggestion({
          type: 'model',
          message: 'Data processed successfully. Continue to model building to train predictive models.',
          details: selectedPerf ?
            `Performance metrics detected. You can build models to predict ${targetSuggestion}.` :
            `You might want to use organizational metrics to predict business outcomes.`,
          action: () => navigate('/model-builder', {
            state: {
              datasetId: newProcessedDatasetId,
              // Get actual features from processing summary if available
              suggestedFeatures: response.data.processing_summary?.org_metrics ||
                response.data.processing_summary?.feature_names?.filter(f => !f.includes('_id')) ||
                ['team_size', 'management_level', 'direct_reports_count'],
              preSelectTarget: targetSuggestion
            }
          })
        });
      }

    } catch (err) {
      console.error('Error processing dataset:', err);
      setError(err.response?.data?.detail || 'Error processing dataset');

      // Stop any progress simulation
      setProcessingProgress(0);

      // Provide more helpful error messages based on the error
      if (err.response?.status === 400) {
        setErrorDetails('The data format may be incorrect or missing required columns. Check that your CSV files match the expected templates.');
      } else if (err.response?.status === 500) {
        setErrorDetails('A server error occurred during processing. This might be due to incompatible data formats or memory limitations.');
      } else if (err.response?.status === 422) {
        setErrorDetails('Invalid processing options or dataset format. The schema validation failed.');
      } else if (err.response?.status === 413) {
        setErrorDetails('The dataset is too large for processing. Try using a smaller subset of your data.');
      } else {
        setErrorDetails('An unexpected error occurred. Please check your data format and try again.');
      }
    } finally {
      setProcessingDataset(false);
    }
  };

  // Handle feature identification results
  const handleFeatureIdentified = (results) => {
    console.log('Feature identification complete:', results);
    // Could update UI state based on the results if needed
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
        <div className="flex items-center">
          {activeProject && (
            <div className="mr-3 bg-blue-50 px-3 py-1 rounded text-blue-800 text-sm font-medium">
              Project: {activeProject.title}
            </div>
          )}
          <button
            className="flex items-center px-3 py-1 bg-blue-600 text-white rounded"
            onClick={handleRefresh}
            disabled={loadingDatasets}
          >
            <RefreshCw size={16} className={`mr-1 ${loadingDatasets ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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

      {suggestion && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-1">
              <p className="text-blue-700">{suggestion.message}</p>
              <button
                className="mt-2 text-blue-600 font-medium"
                onClick={suggestion.action}
              >
                {suggestion.type === 'network' ? 'Go to Network Analysis' : 'Go to Model Builder'} →
              </button>
            </div>
          </div>
        </div>
      )}

      {errorDetails && (
        <div className="mt-2 text-sm text-red-600">
          <p>{errorDetails}</p>
          <p className="mt-1">Try downloading and checking our template files to ensure your data matches the expected format.</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Data Import</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Structure */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
            <Upload size={40} className="text-gray-400 mb-4" />
            <h4 className="font-medium mb-2">Organizational Structure</h4>
            <p className="text-sm text-gray-500 text-center mb-4">
              Upload CSV file with employee structure, roles, and hierarchy information
            </p>
            <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
                onChange={handleFileChange(setOrgFile, 'organization')}
                disabled={uploading}
              />
              Select File
            </label>
            {orgFile && (
              <div className="mt-2 text-sm">
                <p className="text-gray-700">{orgFile.name}</p>
                {uploadProgress.organization > 0 && uploadProgress.organization < 100 ? (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress.organization}%` }}></div>
                    <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress.organization}%</p>
                  </div>
                ) : (
                  <button
                    className="text-blue-600 mt-1"
                    onClick={() => handleUpload('organization', orgFile)}
                    disabled={uploading}
                  >
                    {uploading && selectedFileType === 'organization' ? 'Uploading...' : 'Upload'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Communication Data */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
            <Upload size={40} className="text-gray-400 mb-4" />
            <h4 className="font-medium mb-2">Communication Data</h4>
            <p className="text-sm text-gray-500 text-center mb-4">
              Upload CSV file with communication patterns and interaction frequency
            </p>
            <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
                onChange={handleFileChange(setCommunicationFile, 'communication')}
                disabled={uploading}
              />
              Select File
            </label>
            {commFile && (
              <div className="mt-2 text-sm">
                <p className="text-gray-700">{commFile.name}</p>
                {uploadProgress.communication > 0 && uploadProgress.communication < 100 ? (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress.communication}%` }}></div>
                    <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress.communication}%</p>
                  </div>
                ) : (
                  <button
                    className="text-blue-600 mt-1"
                    onClick={() => handleUpload('communication', commFile)}
                    disabled={uploading}
                  >
                    {uploading && selectedFileType === 'communication' ? 'Uploading...' : 'Upload'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
            <Upload size={40} className="text-gray-400 mb-4" />
            <h4 className="font-medium mb-2">Performance Metrics</h4>
            <p className="text-sm text-gray-500 text-center mb-4">
              Upload CSV file with team and individual performance data
            </p>
            <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
                onChange={handleFileChange(setPerformanceFile, 'performance')}
                disabled={uploading}
              />
              Select File
            </label>
            {perfFile && (
              <div className="mt-2 text-sm">
                <p className="text-gray-700">{perfFile.name}</p>
                {uploadProgress.performance > 0 && uploadProgress.performance < 100 ? (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress.performance}%` }}></div>
                    <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress.performance}%</p>
                  </div>
                ) : (
                  <button
                    className="text-blue-600 mt-1"
                    onClick={() => handleUpload('performance', perfFile)}
                    disabled={uploading}
                  >
                    {uploading && selectedFileType === 'performance' ? 'Uploading...' : 'Upload'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Custom Data */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
            <Upload size={40} className="text-gray-400 mb-4" />
            <h4 className="font-medium mb-2">Custom Data</h4>
            <p className="text-sm text-gray-500 text-center mb-4">
              Upload any custom organizational data for specialized analysis
            </p>
            <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt,.json"
                className="hidden"
                onChange={handleFileChange(setCustomFile, 'custom')}
                disabled={uploading}
              />
              Select File
            </label>
            {customFile && (
              <div className="mt-2 text-sm">
                <p className="text-gray-700">{customFile.name}</p>
                {uploadProgress.custom > 0 && uploadProgress.custom < 100 ? (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress.custom}%` }}></div>
                    <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress.custom}%</p>
                  </div>
                ) : (
                  <button
                    className="text-blue-600 mt-1"
                    onClick={() => handleUpload('custom', customFile)}
                    disabled={uploading}
                  >
                    {uploading && selectedFileType === 'custom' ? 'Uploading...' : 'Upload'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h4 className="font-medium mb-4">Template Files</h4>
          <div className="space-y-2">
            <div className="flex items-center p-2 bg-gray-50 rounded">
              <FileText size={20} className="text-gray-500 mr-2" />
              <span className="text-sm">organization_structure_template.csv</span>
              <button
                className="ml-auto text-blue-600 text-sm"
                onClick={() => handleDownloadTemplate('organization_structure')}
              >
                Download
              </button>
            </div>
            <div className="flex items-center p-2 bg-gray-50 rounded">
              <FileText size={20} className="text-gray-500 mr-2" />
              <span className="text-sm">communication_data_template.csv</span>
              <button
                className="ml-auto text-blue-600 text-sm"
                onClick={() => handleDownloadTemplate('communication_data')}
              >
                Download
              </button>
            </div>
            <div className="flex items-center p-2 bg-gray-50 rounded">
              <FileText size={20} className="text-gray-500 mr-2" />
              <span className="text-sm">performance_metrics_template.csv</span>
              <button
                className="ml-auto text-blue-600 text-sm"
                onClick={() => handleDownloadTemplate('performance_metrics')}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Datasets</h3>

          {/* Tabs for filtering datasets */}
          <div className="flex border border-gray-200 rounded overflow-hidden">
            <button
              className={`px-4 py-2 text-sm ${activeTab === 'uploaded' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'}`}
              onClick={() => setActiveTab('uploaded')}
            >
              <Upload size={14} className="inline mr-1" /> Raw Data
            </button>
            <button
              className={`px-4 py-2 text-sm ${activeTab === 'processed' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'}`}
              onClick={() => setActiveTab('processed')}
            >
              <Grid size={14} className="inline mr-1" /> Processed Data
            </button>
            <button
              className={`px-4 py-2 text-sm ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'}`}
              onClick={() => setActiveTab('all')}
            >
              <List size={14} className="inline mr-1" /> All Data
            </button>
          </div>
        </div>

        {/* Tab description */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          {activeTab === 'uploaded' && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Raw Datasets:</span> These are the original data files you've uploaded. Select these for processing.
            </p>
          )}
          {activeTab === 'processed' && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Processed Datasets:</span> These are datasets that have been enhanced with calculated metrics, merged features, and network analysis. Use these for modeling and visualization.
            </p>
          )}
          {activeTab === 'all' && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">All Datasets:</span> Showing both raw uploads and processed datasets.
            </p>
          )}
        </div>

        {loadingDatasets ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-500">Loading datasets...</div>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <Database size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">
              {activeTab === 'processed'
                ? 'No processed datasets available. Process raw data to create enhanced datasets.'
                : 'No datasets have been uploaded yet. Upload organization data to get started.'}
            </p>
            {activeTab === 'processed' && (
              <button
                onClick={() => setActiveTab('uploaded')}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                View Raw Datasets
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDatasets.map((dataset) => {
                  // Determine dataset type based on dataset_type field or name/description
                  let datasetType = 'custom';
                  const isProcessed = dataset.name.toLowerCase().includes('processed') ||
                    dataset.dataset_type === 'processed';

                  if (dataset.dataset_type) {
                    // Use the backend-provided dataset_type if available
                    datasetType = dataset.dataset_type;
                  } else {
                    // Fall back to guessing from name/description
                    const isOrgDataset = dataset.name.toLowerCase().includes('organization') || dataset.description.toLowerCase().includes('organization');
                    const isCommDataset = dataset.name.toLowerCase().includes('communication') || dataset.description.toLowerCase().includes('communication');
                    const isPerfDataset = dataset.name.toLowerCase().includes('performance') || dataset.description.toLowerCase().includes('performance');

                    if (isOrgDataset) datasetType = 'organization';
                    if (isCommDataset) datasetType = 'communication';
                    if (isPerfDataset) datasetType = 'performance';
                  }

                  // Check if this dataset is selected
                  const isSelected = selectedDatasets[datasetType] === dataset.id;
                  // Check if this dataset is selected for feature identification
                  const isSelectedForFeatures = selectedDatasetForFeatures === dataset.id;

                  return (
                    <tr key={dataset.id} className={isSelectedForFeatures ? 'bg-green-50' : (isSelected ? 'bg-blue-50' : (isProcessed ? 'bg-purple-50' : ''))}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {dataset.name}
                          {isProcessed && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Processed
                            </span>
                          )}
                          {isSelectedForFeatures && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Selected for Features
                            </span>
                          )}
                        </div>
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
                        {/* Dataset type badge with improved visual distinction */}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${isProcessed ? 'bg-purple-100 text-purple-800' : ''}
                          ${datasetType === 'organization' && !isProcessed ? 'bg-green-100 text-green-800' : ''}
                          ${datasetType === 'communication' && !isProcessed ? 'bg-pink-100 text-pink-800' : ''}
                          ${datasetType === 'performance' && !isProcessed ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${datasetType === 'custom' && !isProcessed ? 'bg-gray-100 text-gray-800' : ''}
                        `}>
                          {isProcessed ? 'Processed' : datasetType}
                        </span>
                        {isProcessed && dataset.dataset_type !== 'processed' && (
                          <div className="mt-1 text-xs text-gray-500">
                            Based on: {datasetType}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {!isProcessed && (
                            <button
                              className={`px-2 py-1 text-white rounded ${isSelected ? 'bg-blue-600' : 'bg-gray-400 hover:bg-blue-500'}`}
                              onClick={() => handleDatasetSelection(datasetType, isSelected ? null : dataset.id)}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          )}
                          <button
                            className={`px-2 py-1 text-white rounded ${isSelectedForFeatures ? 'bg-green-600' : 'bg-gray-400 hover:bg-green-500'}`}
                            onClick={() => setSelectedDatasetForFeatures(isSelectedForFeatures ? null : dataset.id)}
                          >
                            {isSelectedForFeatures ? 'Analyze' : 'Features'}
                          </button>
                          <button
                            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            onClick={() => handleExportDataset(dataset.id)}
                          >
                            Export
                          </button>
                          <button
                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${dataset.name}?`)) {
                                api.delete(`/datasets/${dataset.id}`)
                                  .then(() => {
                                    fetchDatasets();
                                    setSuccess(`Successfully deleted ${dataset.name}`);

                                    // If this dataset was selected, unselect it
                                    if (selectedDatasets[datasetType] === dataset.id) {
                                      handleDatasetSelection(datasetType, null);
                                    }
                                    
                                    // If this dataset was selected for feature identification, unselect it
                                    if (selectedDatasetForFeatures === dataset.id) {
                                      setSelectedDatasetForFeatures(null);
                                    }
                                  })
                                  .catch(err => {
                                    setError(err.response?.data?.detail || 'Error deleting dataset');
                                  });
                              }
                            }}
                          >
                            Delete
                          </button>
                          {isProcessed && (
                            <button
                              className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              onClick={() => {
                                if (datasetType === 'organization' || dataset.dataset_type === 'processed') {
                                  if (dataset.name.toLowerCase().includes('network') ||
                                    dataset.description.toLowerCase().includes('network') ||
                                    dataset.description.toLowerCase().includes('communication')) {
                                    navigate('/network', { state: { datasetId: dataset.id } });
                                  } else {
                                    navigate('/model-builder', { state: { datasetId: dataset.id } });
                                  }
                                }
                              }}
                            >
                              Use
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8">
          <h4 className="font-medium mb-4">Data Processing</h4>

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h5 className="font-medium text-blue-800 mb-2">What Does Processing Do?</h5>
            <p className="text-sm text-blue-700 mb-3">
              Processing transforms your raw data into feature-rich datasets that can be used for analysis and modeling:
            </p>
            <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
              <li>Calculates organizational metrics (team size, management level, span of control)</li>
              <li>If communication data is included, builds a network graph and extracts network metrics</li>
              <li>If performance data is included, merges it with other features for predictive modeling</li>
              <li>Handles missing values and normalizes data for consistent analysis</li>
              <li>Creates a single unified dataset that can be used for visualization and modeling</li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Organization Data:</p>
                <p className="font-semibold">
                  {datasets.some(d => d.name.toLowerCase().includes('organization') || d.description.toLowerCase().includes('organization'))
                    ? 'Loaded'
                    : 'Not loaded'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Communication Data:</p>
                <p className="font-semibold">
                  {datasets.some(d => d.name.toLowerCase().includes('communication') || d.description.toLowerCase().includes('communication'))
                    ? 'Loaded'
                    : 'Not loaded'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Performance Data:</p>
                <p className="font-semibold">
                  {datasets.some(d => d.name.toLowerCase().includes('performance') || d.description.toLowerCase().includes('performance'))
                    ? 'Loaded'
                    : 'Not loaded'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Selected Datasets for Processing</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded">
                <div className={`${selectedDatasets.organization ? 'bg-green-50 p-3 rounded-lg border border-green-200' : ''}`}>
                  <p className="text-gray-600">Organization Data (Required):</p>
                  <p className="font-semibold">
                    {selectedDatasets.organization ?
                      datasets.find(d => d.id === selectedDatasets.organization)?.name || 'Selected' :
                      'Not selected'}
                  </p>
                  {selectedDatasets.organization && (
                    <p className="text-xs text-gray-500 mt-1">
                      {datasets.find(d => d.id === selectedDatasets.organization)?.record_count || 0} records
                    </p>
                  )}
                </div>
                <div className={`${selectedDatasets.communication ? 'bg-blue-50 p-3 rounded-lg border border-blue-200' : ''}`}>
                  <p className="text-gray-600">Communication Data (Optional):</p>
                  <p className="font-semibold">
                    {selectedDatasets.communication ?
                      datasets.find(d => d.id === selectedDatasets.communication)?.name || 'Selected' :
                      'Not selected'}
                  </p>
                  {selectedDatasets.communication && (
                    <p className="text-xs text-gray-500 mt-1">
                      {datasets.find(d => d.id === selectedDatasets.communication)?.record_count || 0} interactions
                    </p>
                  )}
                </div>
                <div className={`${selectedDatasets.performance ? 'bg-yellow-50 p-3 rounded-lg border border-yellow-200' : ''}`}>
                  <p className="text-gray-600">Performance Data (Optional):</p>
                  <p className="font-semibold">
                    {selectedDatasets.performance ?
                      datasets.find(d => d.id === selectedDatasets.performance)?.name || 'Selected' :
                      'Not selected'}
                  </p>
                  {selectedDatasets.performance && (
                    <p className="text-xs text-gray-500 mt-1">
                      {datasets.find(d => d.id === selectedDatasets.performance)?.record_count || 0} evaluations
                    </p>
                  )}
                </div>
              </div>

              {/* Processing button with better status indication */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex-grow">
                  <h4 className="font-medium mb-1">Process Selected Data</h4>
                  <p className="text-sm text-gray-500">
                    {selectedDatasets.organization
                      ? 'Combine selected datasets into a feature-rich dataset ready for analysis.'
                      : 'Select an organization dataset to begin processing.'}
                  </p>
                </div>

                <button
                  className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 ${!selectedDatasets.organization ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  disabled={!selectedDatasets.organization || processingDataset}
                  onClick={handleProcessDataset}
                >
                  {processingDataset ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Filter size={18} />
                      <span>Process Datasets</span>
                    </>
                  )}
                </button>
              </div>

              {/* Processing progress bar */}
              {processingProgress > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {processingProgress >= 100 ? 'Processing complete!' : 'Processing datasets...'}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${processingProgress >= 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Preparing data</span>
                    <span>Building features</span>
                    <span>Finalizing</span>
                  </div>

                  {/* Processing details */}
                  {processingDetails && (
                    <div className="mt-3 text-sm text-gray-600">
                      <p><span className="font-medium">Processing:</span> {processingDetails.orgDataset}</p>
                      {processingDetails.commDataset && (
                        <p><span className="font-medium">With communication data:</span> {processingDetails.commDataset}</p>
                      )}
                      {processingDetails.perfDataset && (
                        <p><span className="font-medium">With performance data:</span> {processingDetails.perfDataset}</p>
                      )}
                      {processingDetails.complete && (
                        <p className="mt-1">
                          <span className="font-medium">Result:</span> {processingDetails.recordCount} records with {processingDetails.featureCount} features
                        </p>
                      )}
                      {processingDetails.warnings && processingDetails.warnings.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium text-amber-600">Warnings:</p>
                          <ul className="list-disc pl-5 text-xs text-amber-600 mt-1">
                            {processingDetails.warnings.slice(0, 3).map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                            {processingDetails.warnings.length > 3 && (
                              <li>...and {processingDetails.warnings.length - 3} more warnings</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Advanced processing options (collapsed by default) */}
              <div className="mt-4">
                <details className="text-sm">
                  <summary className="font-medium cursor-pointer text-blue-600">Advanced Processing Options</summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" defaultChecked={true} />
                        <span className="ml-2">Normalize numeric features</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" defaultChecked={true} />
                        <span className="ml-2">Fill missing values</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" defaultChecked={true} />
                        <span className="ml-2">Calculate team metrics</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" defaultChecked={true} />
                        <span className="ml-2">Calculate management hierarchy</span>
                      </label>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex-grow">
                <h4 className="font-medium mb-1">Export Processed Data</h4>
                <p className="text-sm text-gray-500">
                  {datasetProcessed
                    ? 'Download the processed dataset as a CSV file for external analysis.'
                    : 'Process data first to enable export.'}
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 ${!datasetProcessed ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  disabled={!datasetProcessed}
                  onClick={() => {
                    if (processedDatasetId) {
                      handleExportDataset(processedDatasetId);
                    } else {
                      // Find the most recent processed dataset
                      const processedDataset = datasets
                        .filter(d => d.name.includes('Processed') || d.dataset_type === 'processed')
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

                      if (processedDataset) {
                        handleExportDataset(processedDataset.id);
                      } else {
                        setError('No processed dataset found');
                      }
                    }
                  }}
                >
                  <FileText size={18} />
                  <span>Export to CSV</span>
                </button>

                {suggestion && (
                  <div className="flex space-x-2">
                    <button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-2"
                      onClick={suggestion.action}
                    >
                      {suggestion.type === 'network' ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                          </svg>
                          <span>View Network Visualization</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                          </svg>
                          <span>Build Predictive Model</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Feature Identification Component */}
      {selectedDatasetForFeatures && (
        <FeatureIdentifier 
          datasetId={selectedDatasetForFeatures} 
          onFeatureIdentified={handleFeatureIdentified}
        />
      )}
    </div>
  );
};

export default withProjectRequired(DataImport);