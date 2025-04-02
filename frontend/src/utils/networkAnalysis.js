/** 
* Utility functions for network analysis and parameter extraction 
*/ 

/** 
* Extract simulation parameters from network analysis data 
* @param {Object} networkData - Network analysis data from API 
* @returns {Object} Recommended simulation parameters 
*/ 
export const extractSimulationParameters = (networkData) => { 
if (!networkData) return null; 

const params = {}; 

// Extract team size 
if (networkData.avgTeamSize) { 
params.teamSize = Math.round(networkData.avgTeamSize); 
} else if (networkData.nodes && networkData.communities) { 
// Estimate team size from community structure 
const avgCommunitySize = networkData.nodes / networkData.communities; 
params.teamSize = Math.min(15, Math.max(3, Math.round(avgCommunitySize))); 
} 

// Extract communication density 
if (networkData.density !== undefined) { 
// Round to 1 decimal place (0.1 step) 
params.communicationDensity = Math.round(networkData.density * 10) / 10; 
// Ensure it's within valid range 
params.communicationDensity = Math.min(1, Math.max(0.2, params.communicationDensity)); 
} 

// Extract hierarchy levels 
if (networkData.hierarchyDepth) { 
params.hierarchyLevels = Math.min(5, Math.max(2, networkData.hierarchyDepth)); 
} else if (networkData.avgPathLength) { 
// Estimate hierarchy from path length 
params.hierarchyLevels = Math.min(5, Math.max(2, Math.round(networkData.avgPathLength))); 
} 

// Extract turnover rate if available 
if (networkData.turnoverRate !== undefined) { 
// Convert decimal to percentage (0-20) 
params.turnoverRate = Math.min(20, Math.max(0, Math.round(networkData.turnoverRate * 100))); 
} 

return params; 
}; 

/**  
* Extract feature importance data from network metrics 
* @param {Object} networkData - Network analysis data from API 
* @returns {Array} Feature importance array for model building 
*/ 
export const extractNetworkFeatures = (networkData) => { 
if (!networkData) return []; 

const features = []; 

// Core network metrics as features 
if (networkData.density !== undefined) { 
features.push({ 
name: 'communication_density', 
importance: 0.85, 
value: networkData.density 
}); 
} 

if (networkData.avgPathLength !== undefined) { 
features.push({ 
name: 'avg_path_length', 
importance: 0.75, 
value: networkData.avgPathLength 
}); 
} 

if (networkData.clusterCoefficient !== undefined) { 
features.push({ 
name: 'clustering_coefficient', 
importance: 0.68, 
value: networkData.clusterCoefficient 
}); 
} 

// Team structure features 
if (networkData.avgTeamSize !== undefined) { 
features.push({ 
name: 'team_size', 
importance: 0.72, 
value: networkData.avgTeamSize 
}); 
} 

if (networkData.hierarchyDepth !== undefined) { 
features.push({ 
name: 'hierarchy_levels', 
importance: 0.65, 
value: networkData.hierarchyDepth 
}); 
} 

// Sort by importance 
return features.sort((a, b) => b.importance - a.importance); 
}; 

/** 
* Generate descriptive insights from network analysis 
* @param {Object} networkData - Network analysis data 
* @returns {Array} Array of insight strings 
*/ 
export const generateNetworkInsights = (networkData) => { 
if (!networkData) return []; 

const insights = []; 

// Communication density insights 
if (networkData.density !== undefined) { 
const density = networkData.density; 
if (density > 0.8) { 
insights.push("High communication density indicates potential information overload. Consider more targeted communication patterns."); 
} else if (density < 0.4) { 
insights.push("Low communication density suggests limited information flow. Consider interventions to increase cross-team collaboration."); 
} else { 
insights.push("Balanced communication density indicates healthy information flow across the organization."); 
} 
} 

// Path length insights 
if (networkData.avgPathLength !== undefined) { 
const pathLength = networkData.avgPathLength; 
if (pathLength > 4) { 
insights.push("High average path length indicates organizational silos. Consider creating bridge connections between distant teams."); 
} else if (pathLength < 2) { 
insights.push("Very short path lengths suggest an overly connected network which may lead to coordination overhead."); 
} 
} 

// Community structure insights 
if (networkData.communities !== undefined) { 
const communities = networkData.communities; 
if (communities > 10) { 
insights.push("Large number of distinct communities indicates fragmentation. Consider integrative projects across community boundaries."); 
} 
} 

// Add insights about central teams 
if (networkData.centralTeams && networkData.centralTeams.length > 0) { 
insights.push(`Teams ${networkData.centralTeams.join(', ')} have high centrality and serve as information hubs. Consider their workload and strategic importance.`); 
} 

return insights; 
};