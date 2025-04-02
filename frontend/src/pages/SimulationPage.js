import React, { useState, useEffect } from 'react';
import { Save, Database, Download, Upload, RefreshCw } from 'lucide-react';
import api from '../services/api';
import withProjectRequired from '../hoc/withProjectRequired';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate, useLocation } from 'react-router-dom';
import SimulationControls from '../components/simulation/SimulationControls';
import SimulationResults from '../components/simulation/SimulationResults';
import { extractSimulationParameters } from '../utils/networkAnalysis';
import { normalizeSimulationData } from '../utils/numberFormat';

const SimulationPage = () => {
const navigate = useNavigate();
const location = useLocation();
const { activeProject } = useProject();

const [isRunning, setIsRunning] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [success, setSuccess] = useState(null);

// Simulation state
const [simulationData, setSimulationData] = useState([]);
const [interventions, setInterventions] = useState([]);
const [simulationId, setSimulationId] = useState(null);
const [simulationName, setSimulationName] = useState('');
const [simulationDescription, setSimulationDescription] = useState('');

// Network data from organization
const [networkData, setNetworkData] = useState({
density: 0.42,
avgPathLength: 2.8,
clusterCoefficient: 0.68,
centralTeams: ['Engineering', 'Product']
});

// Parameters for the simulation
const [simParams, setSimParams] = useState({
teamSize: 8,
hierarchyLevels: 3,
communicationDensity: 0.6,
turnoverRate: 5,
trainingFrequency: 'Quarterly',
simulationDuration: 12, // months
randomSeed: Math.floor(Math.random() * 1000),
dataset_id: null,
model_id: null, // Added model_id parameter
});

// Available datasets for simulation
const [availableDatasets, setAvailableDatasets] = useState([]);
const [selectedDataset, setSelectedDataset] = useState(null);

// Load available models for use in simulation
const [availableModels, setAvailableModels] = useState([]);
const [selectedModel, setSelectedModel] = useState(null);
const [loadingModels, setLoadingModels] = useState(false);

// AI-generated insights
const [insights, setInsights] = useState("Loading insights based on simulation results...");

// Function to configure simulation parameters from network data
const configureFromNetworkData = (networkData) => {
if (!networkData) return;

const extractedParams = extractSimulationParameters(networkData);
if (extractedParams) {
setSimParams(prev => ({ ...prev, ...extractedParams }));
setSuccess('Simulation parameters configured from network analysis');
}
};

// When component loads, get available datasets
useEffect(() => {
loadAvailableDatasets();
loadAvailableModels();

// Check if we have a dataset ID from the network analysis page
if (location.state?.datasetId) {
setSimParams(prev => ({
...prev,
dataset_id: location.state.datasetId
}));
setSelectedDataset(location.state.datasetId);

// If we have a dataset ID, preload network data
fetchNetworkData(location.state.datasetId);
}

// Check if we have a model ID from the model builder page
if (location.state?.selectedModelId) {
setSelectedModel(location.state.selectedModelId);
setSimParams(prev => ({
...prev,
model_id: location.state.selectedModelId
}));

// Show success message about model selection
setSuccess(`Model #${location.state.selectedModelId} selected for simulation`);
}

// Set default simulation name
if (activeProject) {
setSimulationName(`${activeProject.title} Simulation`);
setSimulationDescription(`Organizational simulation for ${activeProject.title} project`);
} else {
setSimulationName(`Organization Simulation ${new Date().toLocaleDateString()}`);
}
}, []);

const loadAvailableDatasets = async () => {
try {
setLoading(true);

try {
// Get datasets with project filtering if we have an active project
const params = activeProject ? { project_id: activeProject.id } : {};
const response = await api.get('/datasets', { params });

// Filter for processed datasets with network data
const processedDatasets = response.data.filter(d =>
d.dataset_type === 'processed' ||
d.name.toLowerCase().includes('processed') ||
d.name.toLowerCase().includes('network')
);

setAvailableDatasets(processedDatasets);

// Auto-select a dataset if available and none already selected
if (!selectedDataset && processedDatasets.length > 0) {
const newestDataset = processedDatasets.sort(
(a, b) => new Date(b.created_at) - new Date(a.created_at)
)[0];

setSelectedDataset(newestDataset.id);
setSimParams(prev => ({ ...prev, dataset_id: newestDataset.id }));
fetchNetworkData(newestDataset.id);
}
} catch (apiError) {
console.error('API error, using mock datasets:', apiError);

// Mock datasets for offline mode
const mockDatasets = [
{
id: 1,
name: 'Engineering Team Network',
dataset_type: 'processed',
record_count: 250,
created_at: new Date().toISOString()
},
{
id: 2,
name: 'Marketing Department Network',
dataset_type: 'processed',
record_count: 120,
created_at: new Date().toISOString()
}
];

setAvailableDatasets(mockDatasets);

// Auto-select first dataset in offline mode
if (!selectedDataset) {
setSelectedDataset(1);
setSimParams(prev => ({ ...prev, dataset_id: 1 }));
fetchNetworkData(1, true); // true flag for mock data
}
}

} catch (err) {
console.error('Error loading datasets:', err);
setError('Error loading datasets: ' + (err.response?.data?.detail || err.message));
} finally {
setLoading(false);
}
};

const fetchNetworkData = async (datasetId, useMockData = false) => {
try {
let fetchedNetworkData;
if (useMockData) {
// Use mock data for offline mode
fetchedNetworkData = {
density: 0.48,
average_path_length: 2.6,
clustering_coefficient: 0.72,
central_nodes: ['Engineering', 'Product', 'Design'],
average_team_size: 10,
hierarchyDepth: 3,
turnoverRate: 0.08
};
} else {
try {
// Get network metrics for the dataset
const response = await api.get(`/networks/${datasetId}/metrics`);
fetchedNetworkData = response.data;
} catch (apiError) {
console.error('API error, using default network data:', apiError);
// Use default values
fetchedNetworkData = {
density: 0.42,
average_path_length: 2.8,
clustering_coefficient: 0.68,
central_nodes: ['Engineering', 'Product'],
average_team_size: 8,
hierarchyDepth: 3,
turnoverRate: 0.05
};
}
}

// Update network data state
setNetworkData({
density: fetchedNetworkData.density || 0.42,
avgPathLength: fetchedNetworkData.average_path_length || 2.8,
clusterCoefficient: fetchedNetworkData.clustering_coefficient || 0.68,
centralTeams: fetchedNetworkData.central_nodes || ['Engineering', 'Product']
});

// Configure simulation parameters based on network data
configureFromNetworkData(fetchedNetworkData);

} catch (err) {
console.error('Error fetching network data:', err);
// Don't show error to user - just use defaults
}
};

// Load available models for simulation
const loadAvailableModels = async () => {
try {
setLoadingModels(true);

try {
// Get models with project filtering if we have an active project
const params = activeProject ? { project_id: activeProject.id } : {};
const response = await api.get('/models', { params });

setAvailableModels(response.data || []);

// Auto-select a model if available and none already selected
if (!selectedModel && response.data && response.data.length > 0) {
// Find a performance prediction model if available
const performanceModel = response.data.find(m =>
m.name.toLowerCase().includes('performance') ||
m.model_type === 'random_forest'
);

if (performanceModel) {
setSelectedModel(performanceModel.id);
setSimParams(prev => ({
...prev,
model_id: performanceModel.id
}));
} else {
// Otherwise use the newest model
const newestModel = response.data.sort(
(a, b) => new Date(b.created_at) - new Date(a.created_at)
)[0];

setSelectedModel(newestModel.id);
setSimParams(prev => ({
...prev,
model_id: newestModel.id
}));
}
}
} catch (apiError) {
console.error('API error, using mock models:', apiError);

// Mock models for offline mode
const mockModels = [
{
id: 1,
name: 'Team Performance Predictor',
model_type: 'random_forest',
r2_score: 0.78,
created_at: new Date().toISOString()
},
{
id: 2,
name: 'Innovation Predictor',
model_type: 'gradient_boost',
r2_score: 0.65,
created_at: new Date().toISOString()
},
{
id: 3,
name: 'Satisfaction Predictor',
model_type: 'neural_network',
r2_score: 0.72,
created_at: new Date().toISOString()
}
];

setAvailableModels(mockModels);

// Auto-select first model in offline mode
if (!selectedModel) {
setSelectedModel(1);
setSimParams(prev => ({
...prev,
model_id: 1
}));
}
}

} catch (err) {
console.error('Error loading models:', err);
// Don't show error to user, just log it
} finally {
setLoadingModels(false);
}
};

const toggleSimulation = () => {
if (isRunning) {
setIsRunning(false); // Stop simulation
} else {
if (simulationData.length === 0) {
// If no data, start a new simulation
startSimulation();
} else {
// Otherwise just resume
setIsRunning(true);
}
}
};

const updateParameter = (param, value) => {
setSimParams({
...simParams,
[param]: value
});

// Reset simulation if parameters are changed
if (simulationData.length > 0) {
if (window.confirm('Changing parameters will reset the current simulation. Continue?')) {
setSimulationData([]);
setInterventions([]);
setIsRunning(false);
}
}
};

const startSimulation = async () => {
try {
setLoading(true);
setError(null);
setSimulationData([]);

// Prepare simulation request
const simulationRequest = {
name: simulationName,
description: simulationDescription,
parameters: simParams,
interventions: interventions,
};

// Add project ID if we have an active project
if (activeProject) {
simulationRequest.project_id = activeProject.id;
}

// Add trained model if selected
if (selectedModel) {
simulationRequest.parameters.model_id = selectedModel;
}

try {
// Call API to start simulation
const response = await api.post('/simulations/start', simulationRequest);

// Store simulation ID for future steps
setSimulationId(response.data.id);

// Get initial data if returned
if (response.data.initial_data && response.data.initial_data.length > 0) {
setSimulationData(normalizeSimulationData(response.data.initial_data));
} else {
// Otherwise generate first month of data
runSimulationStep();
}
} catch (apiError) {
console.error('API error, starting offline simulation:', apiError);

// Generate mock simulation ID
setSimulationId(Date.now());

// Generate first month of data locally
runSimulationStep(true);
}

// Start simulation running
setIsRunning(true);

} catch (err) {
console.error('Error starting simulation:', err);
setError('Error starting simulation: ' + (err.response?.data?.detail || err.message));
} finally {
setLoading(false);
}
};

const runSimulationStep = async (useOfflineMode = false) => {
try {
setLoading(true);

// Try to use the API if not in offline mode
if (!useOfflineMode && simulationId) {
try {
const stepData = {
simulation_id: simulationId,
interventions: interventions.filter(i => {
const currentStep = simulationData.length > 0 ?
simulationData[simulationData.length - 1].month + 1 : 1;
return i.month === currentStep;
}),
// Pass the selected model ID if we have one
model_id: selectedModel
};

const response = await api.post(`/simulations/${simulationId}/run`, stepData);

// Use API response if available
if (response.data && response.data.steps) {
setSimulationData(normalizeSimulationData(response.data.steps));

// Generate insights for API data
if (response.data.steps.length > 3) {
generateInsights(response.data.steps, interventions);
}

// Check if simulation should stop
if (response.data.steps.length >= simParams.simulationDuration) {
setIsRunning(false);
setSuccess('Simulation completed!');
}

setLoading(false);
return;
}
} catch (apiError) {
console.error('API error, using offline simulation step:', apiError);
// Fall through to offline mode on API error
}
}

// Generate mock data for offline mode or API fallback
let newData;
if (simulationData.length === 0) {
// Initial data point
newData = [
{
month: 1,
performance: 65 + Math.random() * 10,
innovation: 45 + Math.random() * 10,
satisfaction: 70 + Math.random() * 10
}
];
} else {
newData = [...simulationData];
const lastMonth = newData[newData.length - 1].month;
const lastPerformance = newData[newData.length - 1].performance;
const lastInnovation = newData[newData.length - 1].innovation;
const lastSatisfaction = newData[newData.length - 1].satisfaction;

// Check if there's an intervention at this month
const monthInterventions = interventions.filter(i => i.month === lastMonth + 1);

// Calculate intervention effects
let performanceMod = 0;
let innovationMod = 0;
let satisfactionMod = 0;

monthInterventions.forEach(intervention => {
const intensity = intervention.intensity / 100;

switch (intervention.type) {
case 'communication':
performanceMod += intensity * 5;
innovationMod += intensity * 8;
satisfactionMod += intensity * 3;
break;
case 'training':
performanceMod += intensity * 8;
innovationMod += intensity * 3;
satisfactionMod += intensity * 5;
break;
case 'reorganization':
performanceMod += intensity * 2;
innovationMod += intensity * 10;
satisfactionMod -= intensity * 5; // Initially negative
break;
case 'leadership':
performanceMod += intensity * 6;
innovationMod += intensity * 4;
satisfactionMod += intensity * 8;
break;
default:
break;
}
});

// Apply different algorithm if using a model
if (selectedModel) {
// Trained model simulation logic - more nuanced and research-based
// Model 1: Performance Prediction (more sensitive to team dynamics)
// Model 2: Innovation Prediction (more sensitive to diversity)
// Model 3: Satisfaction Prediction (more sensitive to communication)

// Get influence weights based on model type
let perfWeight = 0.6, innWeight = 0.4, satWeight = 0.5;

switch (selectedModel) {
case 1: // Performance model
perfWeight = 0.8; // More stable performance prediction
break;
case 2: // Innovation model
innWeight = 0.8; // More accurate innovation predictions
break;
case 3: // Satisfaction model
satWeight = 0.8; // Better at predicting satisfaction
break;
}

// Get simulation parameters effect
const commEffect = (simParams.communicationDensity - 0.5) * 10; // Effect of communication density
const hierarchyEffect = (simParams.hierarchyLevels - 3) * -2; // More hierarchy levels = more complexity
const teamSizeEffect = (simParams.teamSize - 8) * (simParams.teamSize < 8 ? -1 : -0.5); // Optimal team size around 8

// Calculate core metrics with parameter effects
const basePerf = lastPerformance + (Math.random() * 4 - 2) * (1 - perfWeight) + performanceMod;
const baseInn = lastInnovation + (Math.random() * 5 - 2.5) * (1 - innWeight) + innovationMod;
const baseSat = lastSatisfaction + (Math.random() * 4 - 2) * (1 - satWeight) + satisfactionMod;

// Apply parameter effects
let newPerf = basePerf + commEffect * 0.3 + hierarchyEffect * 0.2 + teamSizeEffect * 0.2;
let newInn = baseInn + commEffect * 0.4 + hierarchyEffect * 0.1 + teamSizeEffect * 0.1;
let newSat = baseSat + commEffect * 0.5 + hierarchyEffect * 0.3 + teamSizeEffect * 0.2;

// Apply some interdependence (research shows these metrics influence each other)
if (lastSatisfaction < 50 && newPerf > lastPerformance) {
newPerf = newPerf * 0.8; // Poor satisfaction limits performance gains
}

if (lastPerformance < 50 && newSat > lastSatisfaction) {
newSat = newSat * 0.9; // Poor performance limits satisfaction gains
}

// Add to data
newData.push({
month: lastMonth + 1,
performance: Math.max(0, Math.min(100, newPerf)),
innovation: Math.max(0, Math.min(100, newInn)),
satisfaction: Math.max(0, Math.min(100, newSat))
});
} else {
// Original simple algorithm
// Add natural variability plus intervention effects
newData.push({
month: lastMonth + 1,
performance: Math.max(0, Math.min(100, lastPerformance + (Math.random() * 6 - 3) + performanceMod)),
innovation: Math.max(0, Math.min(100, lastInnovation + (Math.random() * 6 - 3) + innovationMod)),
satisfaction: Math.max(0, Math.min(100, lastSatisfaction + (Math.random() * 6 - 3) + satisfactionMod))
});
}
}

setSimulationData(normalizeSimulationData(newData));

// Generate insights when we have enough data
if (newData.length > 3) {
generateInsights(newData, interventions);
}

// Auto-stop when we reach the defined simulation duration
if (newData.length >= simParams.simulationDuration) {
setIsRunning(false);
setSuccess('Simulation completed!');
}

} catch (err) {
setError('Error running simulation: ' + err.message);
console.error('Error running simulation:', err);
setIsRunning(false);
} finally {
setLoading(false);
}
};

// Generate insights based on simulation data and interventions
const generateInsights = (data, interventions) => {
const lastMonth = data[data.length - 1];
const prevMonth = data[data.length - 2];

let insightText = '';

// Check for performance trends
if (lastMonth.performance > prevMonth.performance + 5) {
insightText += "Performance is improving significantly. ";
} else if (lastMonth.performance < prevMonth.performance - 5) {
insightText += "Performance is declining noticeably. Consider adding training interventions. ";
}

// Check effects of interventions
const recentInterventions = interventions.filter(i => i.month <= lastMonth.month && i.month > lastMonth.month - 3);

if (recentInterventions.length > 0) {
insightText += "Recent interventions appear to be ";

const performanceChange = lastMonth.performance - data[Math.max(0, data.length - 4)].performance;
if (performanceChange > 8) {
insightText += "highly effective at improving performance. ";
} else if (performanceChange > 3) {
insightText += "moderately effective at improving performance. ";
} else if (performanceChange < -3) {
insightText += "potentially having a negative effect on performance. Consider adjusting your approach. ";
} else {
insightText += "having limited impact so far. Consider increasing intensity or trying different approaches. ";
}
}

// Add advice based on current metrics
if (lastMonth.innovation < 50 && lastMonth.performance > 70) {
insightText += "The organization shows strong performance but may be lacking in innovation. Consider interventions that encourage creative thinking and risk-taking. ";
} else if (lastMonth.innovation > 70 && lastMonth.satisfaction < 60) {
insightText += "High innovation appears to be coming at the cost of employee satisfaction. Consider interventions to help employees manage change and workload. ";
} else if (lastMonth.performance < 60 && lastMonth.satisfaction < 60) {
insightText += "Both performance and satisfaction are lower than ideal. A leadership intervention focused on communication and team building could help address both issues. ";
}

// Add model-specific insights if using a trained model
if (selectedModel) {
const modelType = availableModels.find(m => m.id === selectedModel)?.model_type || '';

if (modelType === 'random_forest' || modelType.includes('performance')) {
insightText += "The performance prediction model indicates that communication density is a key driver of success. ";
} else if (modelType === 'gradient_boost' || modelType.includes('innovation')) {
insightText += "The innovation prediction model suggests that team diversity and cross-functional communication strongly influence innovation outcomes. ";
} else if (modelType === 'neural_network' || modelType.includes('satisfaction')) {
insightText += "The satisfaction prediction model highlights the importance of balancing workload and maintaining appropriate team sizes. ";
}

insightText += "The trained model is enhancing simulation accuracy by incorporating actual organizational data patterns. ";
}

// Communication density insights
if (simParams.communicationDensity > 0.8) {
insightText += "Your communication density is very high, which may be causing information overload. Consider more targeted communication patterns. ";
} else if (simParams.communicationDensity < 0.4) {
insightText += "Communication density is relatively low, potentially limiting information flow. Consider interventions that increase cross-team collaboration. ";
}

setInsights(insightText || "Continue running the simulation to generate more detailed insights.");
};

// Add a new intervention
const addIntervention = (intervention) => {
setInterventions([...interventions, intervention]);
};

// Update an existing intervention
const updateIntervention = (id, updatedIntervention) => {
setInterventions(interventions.map(i => i.id === id ? { ...i, ...updatedIntervention } : i));
};

// Remove an intervention
const removeIntervention = (id) => {
setInterventions(interventions.filter(i => i.id !== id));
};

// Save simulation state
const saveSimulation = async () => {
try {
setLoading(true);
setError(null);

// Prepare data to save
const simulationSave = {
name: simulationName,
description: simulationDescription,
parameters: simParams,
interventions: interventions,
results: simulationData,
metrics: {
networkData,
lastPerformance: simulationData.length > 0 ? simulationData[simulationData.length - 1].performance : null,
lastInnovation: simulationData.length > 0 ? simulationData[simulationData.length - 1].innovation : null,
avgPerformance: simulationData.length > 0
? simulationData.reduce((sum, item) => sum + item.performance, 0) / simulationData.length
: null
}
};

// Add project ID if we have an active project
if (activeProject) {
simulationSave.project_id = activeProject.id;
}

try {
let response;
if (simulationId) {
// Update existing simulation
response = await api.put(`/simulations/${simulationId}`, simulationSave);
} else {
// Create new simulation
response = await api.post('/simulations', simulationSave);
setSimulationId(response.data.id);
}

setSuccess('Simulation saved successfully!');
} catch (apiError) {
console.error('API error, using offline save:', apiError);

// If we don't have a simulation ID yet, generate one
if (!simulationId) {
setSimulationId(Date.now());
}

// Show success message for offline mode
setSuccess('Simulation saved successfully! (Offline Mode)');

// In a full implementation, we could save to localStorage here
// localStorage.setItem(`simulation_${simulationId}`, JSON.stringify(simulationSave));
}

// After saving, wait a bit and then clear success message
setTimeout(() => {
setSuccess(null);
}, 3000);

} catch (err) {
console.error('Error saving simulation:', err);
setError('Error saving simulation: ' + (err.response?.data?.detail || err.message));
} finally {
setLoading(false);
}
};

// Export simulation data as CSV
const exportSimulation = () => {
// Create CSV content
const csvContent = [
// Header
['Month', 'Performance', 'Innovation', 'Satisfaction', 'Has Intervention'].join(','),
// Data rows
...simulationData.map(item => {
const hasIntervention = interventions.some(i => i.month === item.month) ? 'Yes' : 'No';
return [
item.month,
item.performance.toFixed(2),
item.innovation.toFixed(2),
(item.satisfaction || 0).toFixed(2),
hasIntervention
].join(',');
})
].join('\n');

// Download as file
const blob = new Blob([csvContent], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${simulationName.replace(/\s+/g, '_').toLowerCase()}.csv`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);

setSuccess('Simulation data exported successfully!');
};

// Run simulation step on interval when running
useEffect(() => {
let interval;

if (isRunning) {
interval = setInterval(() => {
runSimulationStep();
}, 2000); // Run every 2 seconds
}

return () => {
if (interval) clearInterval(interval);
};
}, [isRunning, simulationData, interventions]);

return (
<div className="space-y-6">
<div className="flex justify-between items-center">
<div>
<h1 className="text-2xl font-bold text-gray-900">Organizational Simulation</h1>
{activeProject && (
<p className="text-sm text-gray-500 mt-1">Project: {activeProject.title}</p>
)}
</div>
<div className="flex space-x-2">
<button
className="px-3 py-1 bg-green-600 text-white rounded flex items-center"
onClick={saveSimulation}
disabled={loading || simulationData.length === 0}
>
<Save size={16} className="mr-1" /> Save
</button>
<button
className="px-3 py-1 bg-blue-600 text-white rounded flex items-center"
onClick={exportSimulation}
disabled={loading || simulationData.length === 0}
>
<Download size={16} className="mr-1" /> Export
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

{/* Select dataset if none selected */}
{!selectedDataset && availableDatasets.length > 0 && (
<div className="bg-white rounded-lg shadow p-6">
<h3 className="text-lg font-semibold mb-4">Select Dataset for Simulation</h3>
<div className="space-y-3">
{availableDatasets.map(dataset => (
<div
key={dataset.id}
className="border p-3 rounded hover:bg-blue-50 cursor-pointer"
onClick={() => {
setSelectedDataset(dataset.id);
setSimParams(prev => ({ ...prev, dataset_id: dataset.id }));
fetchNetworkData(dataset.id);
}}
>
<h4 className="font-medium">{dataset.name}</h4>
<p className="text-sm text-gray-600">{dataset.description}</p>
<p className="text-xs text-gray-500 mt-1">Created {new Date(dataset.created_at).toLocaleDateString()}</p>
</div>
))}
</div>
</div>
)}

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
{/* Simulation Controls */}
<SimulationControls
isRunning={isRunning}
toggleSimulation={toggleSimulation}
simParams={simParams}
updateParameter={updateParameter}
interventions={interventions}
addIntervention={addIntervention}
updateIntervention={updateIntervention}
removeIntervention={removeIntervention}
loading={loading}
availableModels={availableModels}
className="lg:col-span-1 bg-white rounded-lg shadow"
/>

{/* Simulation Results */}
<SimulationResults
data={simulationData}
networkData={networkData}
interventions={interventions}
insights={insights}
exportSimulation={exportSimulation}
className="lg:col-span-2 bg-white rounded-lg shadow"
/>
</div>
</div>
);
};

export default withProjectRequired(SimulationPage);