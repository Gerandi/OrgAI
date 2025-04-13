import api from '../api';

// Simulation parameter guidance
export const getParameterGuidance = async (datasetId = null) => {
  try {
    let url = '/simulations/parameter-guidance';
    if (datasetId) {
      url += `?dataset_id=${datasetId}`;
    }
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching parameter guidance:', error);
    throw error;
  }
};

// Model explanations for a simulation
export const getSimulationExplanations = async (simulationId) => {
  try {
    const response = await api.get(`/simulations/${simulationId}/explanations`);
    return response.data;
  } catch (error) {
    console.error('Error fetching simulation explanations:', error);
    throw error;
  }
};

// Community detection
export const getCommunityDetectionAlgorithms = async () => {
  try {
    const response = await api.get('/communities/algorithms');
    return response.data.algorithms;
  } catch (error) {
    console.error('Error fetching community detection algorithms:', error);
    throw error;
  }
};

export const detectCommunitiesFromSimulation = async (simulationId, algorithm, parameters = {}) => {
  try {
    const response = await api.post('/communities/detect-from-simulation', {
      simulation_id: simulationId,
      algorithm,
      parameters
    });
    return response.data;
  } catch (error) {
    console.error('Error detecting communities:', error);
    throw error;
  }
};

export const compareAlgorithms = async (simulationId, algorithms, parametersList = null) => {
  try {
    const response = await api.post('/communities/compare-algorithms', {
      simulation_id: simulationId,
      algorithms,
      parameters_list: parametersList
    });
    return response.data;
  } catch (error) {
    console.error('Error comparing community detection algorithms:', error);
    throw error;
  }
};

// Feature identification
export const identifyFeatures = async (datasetId, userMappings = null) => {
  const formData = new FormData();
  formData.append('dataset_id', datasetId);
  
  if (userMappings) {
    formData.append('user_mappings', JSON.stringify(userMappings));
  }
  
  try {
    const response = await api.post('/feature-identification/identify', formData);
    return response.data;
  } catch (error) {
    console.error('Error identifying features:', error);
    throw error;
  }
};

export const saveColumnMappings = async (datasetId, columnMappings) => {
  try {
    const response = await api.post('/feature-identification/save-mappings', {
      dataset_id: datasetId,
      column_mappings: columnMappings
    });
    return response.data;
  } catch (error) {
    console.error('Error saving column mappings:', error);
    throw error;
  }
};
