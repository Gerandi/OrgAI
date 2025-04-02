import React, { useState, useEffect } from 'react';
import PerformanceChart from '../components/dashboard/PerformanceChart';
import OrgOverview from '../components/dashboard/OrgOverview';
import TeamPerformanceBar from '../components/dashboard/TeamPerformanceBar';
import TeamComposition from '../components/dashboard/TeamComposition';
import PerformanceDrivers from '../components/dashboard/PerformanceDrivers';
import { Settings, Save, PlayCircle, BarChart2, Download, Layers, Network, Database } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [orgData, setOrgData] = useState({}); // Initialize as empty object
  const [teamData, setTeamData] = useState([]);
  const [teamComposition, setTeamComposition] = useState([]);
  const [performanceDrivers, setPerformanceDrivers] = useState([]);

  // Data for available datasets and models
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [recentModels, setRecentModels] = useState([]);
  const [recentSimulations, setRecentSimulations] = useState([]);

  // Data availability status
  const [hasPerformanceData, setHasPerformanceData] = useState(false);
  const [hasOrgData, setHasOrgData] = useState(false);
  const [hasTeamData, setHasTeamData] = useState(false);
  const [hasDriversData, setHasDriversData] = useState(false);
  const [hasProjectData, setHasProjectData] = useState(false);

  // Dashboard state is managed in this component and passed to child components

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Clear all data when fetching to ensure we don't show stale data
        setPerformanceData([]);
        setOrgData({}); // Clear org data
        setTeamData([]);
        setTeamComposition([]);
        setPerformanceDrivers([]);
        setHasPerformanceData(false);
        setHasOrgData(false);
        setHasTeamData(false);
        setHasDriversData(false);

        // Track if we've successfully fetched any real data
        let hasRealData = false;

        // Centralized async fetch function to reduce repetition
        const fetchMetric = async (endpoint, setter, statusSetter) => {
          try {
            const response = await api.get(`/metrics/${endpoint}`);
            // Check if data exists and is not empty (for arrays) or has keys (for objects)
            if (response.data && (Array.isArray(response.data) ? response.data.length > 0 : Object.keys(response.data).length > 0)) {
              setter(response.data);
              statusSetter(true);
              hasRealData = true;
              return true;
            }
          } catch (error) {
            console.log(`Could not fetch ${endpoint} data:`, error);
            statusSetter(false); // Ensure status is false on error
          }
          return false;
        };

        // Fetch primary dashboard data
        await Promise.all([
          fetchMetric('performance', setPerformanceData, setHasPerformanceData),
          fetchMetric('organization', setOrgData, setHasOrgData),
          fetchMetric('teams', (data) => {
            setTeamData(data);
            // Also construct team composition data from team data
            if (data && data.length > 0) {
              const compositionData = data.map(team => ({
                name: team.name,
                value: team.size || 0 // Ensure value is a number
              }));
              setTeamComposition(compositionData);
              setHasTeamData(true); // Set status only if data is valid
            } else {
               setHasTeamData(false); // Explicitly set false if no valid team data
            }
          }, setHasTeamData), // Pass status setter here
          fetchMetric('drivers', setPerformanceDrivers, setHasDriversData)
        ]);

        // Fetch project-specific data if we have an active project
        if (activeProject) {
          try {
            let projectDataFound = false;
            const params = { project_id: activeProject.id };

            const datasetsResponse = await api.get('/datasets', { params });
            if (datasetsResponse.data && datasetsResponse.data.length > 0) {
              setAvailableDatasets(datasetsResponse.data);
              projectDataFound = true;
              hasRealData = true; // Consider project data as real data
            } else {
              setAvailableDatasets([]);
            }

            const modelsResponse = await api.get('/models', { params });
            if (modelsResponse.data && modelsResponse.data.length > 0) {
              setRecentModels(modelsResponse.data.slice(0, 3)); // Get most recent 3
              projectDataFound = true;
              hasRealData = true; // Consider project data as real data
            } else {
              setRecentModels([]);
            }

            const simulationsResponse = await api.get('/simulations', { params });
            if (simulationsResponse.data && simulationsResponse.data.length > 0) {
              setRecentSimulations(simulationsResponse.data.slice(0, 3)); // Get most recent 3
              projectDataFound = true;
              hasRealData = true; // Consider project data as real data
            } else {
              setRecentSimulations([]);
            }

            setHasProjectData(projectDataFound);
          } catch (error) {
            console.log('Could not fetch project data:', error);
            setHasProjectData(false);
          }
        } else {
           // If no active project, clear project-specific data
           setAvailableDatasets([]);
           setRecentModels([]);
           setRecentSimulations([]);
           setHasProjectData(false);
        }

        // Log real data status
        if (hasRealData || hasProjectData) { // Check both general and project data
          console.log('Successfully fetched dashboard data from API');
        } else {
          console.log('No real data found for dashboard');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching dashboard data:', err);
        // Ensure all status flags are false on major error
        setHasPerformanceData(false);
        setHasOrgData(false);
        setHasTeamData(false);
        setHasDriversData(false);
        setHasProjectData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeProject]); // Only depend on activeProject change

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-500">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
        <div className="flex">
          <div>
            <p className="text-red-700">Error loading dashboard data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if any data is available to show the main grid
  const isDataAvailable = hasPerformanceData || hasOrgData || hasTeamData || hasDriversData;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Organization Dashboard</h1>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 bg-green-600 text-white rounded flex items-center"
            onClick={() => navigate('/data-import')}
          >
            <Layers size={16} className="mr-1" /> Import Data
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded flex items-center">
            <Download size={16} className="mr-1" /> Export Report
          </button>
        </div>
      </div>

      {/* Show data grid or placeholder */}
      {isDataAvailable ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Performance Overview Card */}
          {hasPerformanceData ? (
            <PerformanceChart
              data={performanceData}
              className="col-span-1 md:col-span-2 lg:col-span-2"
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center col-span-1 md:col-span-2 lg:col-span-2 h-64">
              <BarChart2 className="h-12 w-12 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-500">No Performance Data Available</h3>
              <p className="text-gray-400 mt-1">Import organization data to see performance metrics</p>
              <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded flex items-center"
                onClick={() => navigate('/data-import')}
              >
                <Layers size={16} className="mr-1" /> Import Data
              </button>
            </div>
          )}

          {/* Organization Summary Card */}
          {hasOrgData ? (
            <OrgOverview
              data={orgData}
              className="col-span-1"
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center col-span-1 h-64">
              <Settings className="h-12 w-12 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-500">No Organization Data</h3>
              <p className="text-gray-400 mt-1 text-center">Import your organization structure</p>
            </div>
          )}

          {/* Team Performance Card */}
          {hasTeamData ? (
            <TeamPerformanceBar
              data={teamData}
              className="col-span-1 lg:col-span-2"
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center col-span-1 lg:col-span-2 h-64">
              <Network className="h-12 w-12 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-500">No Team Data Available</h3>
              <p className="text-gray-400 mt-1">Import team performance data to visualize team metrics</p>
            </div>
          )}

          {/* Team Composition Card */}
          {hasTeamData && teamComposition.length > 0 ? ( // Check teamComposition specifically
            <TeamComposition
              data={teamComposition}
              className="col-span-1"
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center col-span-1 h-64">
              <Layers className="h-12 w-12 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-500">No Composition Data</h3>
              <p className="text-gray-400 mt-1 text-center">Import team structure data</p>
            </div>
          )}

          {/* Performance Drivers Card */}
          {hasDriversData ? (
            <PerformanceDrivers
              data={performanceDrivers}
              className="col-span-1 md:col-span-2 lg:col-span-3"
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center col-span-1 md:col-span-2 lg:col-span-3 h-64">
              <BarChart2 className="h-12 w-12 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-500">No Driver Analysis Available</h3>
              <p className="text-gray-400 mt-1">Train models to identify key performance drivers</p>
              <button
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded flex items-center"
                onClick={() => navigate('/model-builder')}
              >
                <BarChart2 size={16} className="mr-1" /> Build Models
              </button>
            </div>
          )}
        </div>
      ) : (
        // Placeholder when no data is available at all
        <div className="bg-white rounded-lg shadow p-10 text-center">
          <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">No Data Available</h2>
          <p className="text-gray-500 mb-6">
            Your dashboard is currently empty. Start by importing your organization data or creating a research project.
          </p>
          <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded flex items-center justify-center"
              onClick={() => navigate('/data-import')}
            >
              <Layers size={18} className="mr-2" /> Import Organization Data
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded flex items-center justify-center"
              onClick={() => navigate('/research')}
            >
              <Settings size={18} className="mr-2" /> Create Research Project
            </button>
          </div>
        </div>
      )}

      {/* Research Workflow Panel */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">Research Workflow</h3>
        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-blue-50 flex flex-col items-center justify-center text-center">
            <Layers className="h-10 w-10 text-blue-600 mb-2" />
            <h4 className="font-medium">1. Data Import</h4>
            <p className="text-sm text-gray-600 mb-3">Upload and process organization data files</p>
            <button
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded"
              onClick={() => navigate('/data-import')}
            >
              Import Data
            </button>
          </div>

          <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-indigo-50 flex flex-col items-center justify-center text-center">
            <Network className="h-10 w-10 text-indigo-600 mb-2" />
            <h4 className="font-medium">2. Network Analysis</h4>
            <p className="text-sm text-gray-600 mb-3">Visualize organization structure and communication</p>
            <button
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded"
              onClick={() => navigate('/network')}
            >
              View Networks
            </button>
          </div>

          <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-purple-50 flex flex-col items-center justify-center text-center">
            <BarChart2 className="h-10 w-10 text-purple-600 mb-2" />
            <h4 className="font-medium">3. Model Building</h4>
            <p className="text-sm text-gray-600 mb-3">Create predictive models from your data</p>
            <button
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded"
              onClick={() => navigate('/model-builder')}
            >
              Build Models
            </button>
          </div>

          <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-green-50 flex flex-col items-center justify-center text-center">
            <PlayCircle className="h-10 w-10 text-green-600 mb-2" />
            <h4 className="font-medium">4. Simulation</h4>
            <p className="text-sm text-gray-600 mb-3">Test interventions and predict outcomes</p>
            <button
              className="px-3 py-1 bg-green-600 text-white text-sm rounded"
              onClick={() => navigate('/simulation')}
            >
              Run Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Integration Cards for Model Building and Simulation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Building Card */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Predictive Models</h3>
            <button
              className="text-blue-600 text-sm font-medium flex items-center"
              onClick={() => navigate('/model-builder')}
            >
              <BarChart2 size={16} className="mr-1" /> Build New Model
            </button>
          </div>

          {recentModels.length > 0 ? (
            <div className="space-y-3">
              {recentModels.map(model => (
                <div key={model.id} className="border border-gray-200 rounded p-3">
                  <div className="flex justify-between">
                    <h4 className="font-medium">{model.name}</h4>
                    <span className="text-xs text-gray-500">{new Date(model.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span>Target: {model.target_column || 'N/A'}</span>
                    <span className="ml-4">Accuracy: {model.r2_score ? Math.round(model.r2_score * 100) + '%' : 'N/A'}</span>
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <button
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded"
                      onClick={() => navigate(`/model-builder`, { state: { modelId: model.id }})}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-gray-200 rounded text-center">
              <p className="text-gray-500">No models available yet.</p>
              <button
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded"
                onClick={() => navigate('/model-builder')}
              >
                Create First Model
              </button>
            </div>
          )}
        </div>

        {/* Simulation Card */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Organizational Simulations</h3>
            <button
              className="text-green-600 text-sm font-medium flex items-center"
              onClick={() => navigate('/simulation')}
            >
              <PlayCircle size={16} className="mr-1" /> Run New Simulation
            </button>
          </div>

          {recentSimulations.length > 0 ? (
            <div className="space-y-3">
              {recentSimulations.map(sim => (
                <div key={sim.id} className="border border-gray-200 rounded p-3">
                  <div className="flex justify-between">
                    <h4 className="font-medium">{sim.name}</h4>
                    <span className="text-xs text-gray-500">{new Date(sim.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span>Duration: {sim.months || 'N/A'} months</span>
                    <span className="ml-4">Avg. Perf: {sim.avg_performance || 'N/A'}%</span>
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <button
                      className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded"
                      onClick={() => navigate(`/simulation`, { state: { simulationId: sim.id }})}
                    >
                      View Results
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-gray-200 rounded text-center">
              <p className="text-gray-500">No simulations run yet.</p>
              <button
                className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded"
                onClick={() => navigate('/simulation')}
              >
                Run First Simulation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;