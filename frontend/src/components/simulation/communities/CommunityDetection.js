import React, { useState, useEffect } from 'react';
import { Network, AlertTriangle, BarChart2, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { 
  getCommunityDetectionAlgorithms, 
  detectCommunitiesFromSimulation, 
  compareAlgorithms 
} from '../../../services/simulation/simulationServices';

const CommunityDetection = ({ simulationId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetection, setShowDetection] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('');
  const [algorithms, setAlgorithms] = useState([]);
  const [communityResults, setCommunityResults] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState(null);

  // Colors for communities
  const COMMUNITY_COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
    '#82CA9D', '#FFC658', '#A4DE6C', '#D0ED57', '#FAA43A'
  ];

  useEffect(() => {
    // Load available algorithms when component mounts
    const loadAlgorithms = async () => {
      try {
        const availableAlgorithms = await getCommunityDetectionAlgorithms();
        setAlgorithms(availableAlgorithms);
        if (availableAlgorithms.length > 0) {
          // Set default algorithm to Louvain
          const defaultAlgo = availableAlgorithms.find(a => a.id === 'louvain') || availableAlgorithms[0];
          setSelectedAlgorithm(defaultAlgo.id);
        }
      } catch (err) {
        console.error('Error loading algorithms:', err);
        setError('Failed to load community detection algorithms');
      }
    };

    if (showDetection) {
      loadAlgorithms();
    }
  }, [showDetection]);

  // Detect communities with selected algorithm
  const detectCommunities = async () => {
    if (!simulationId || !selectedAlgorithm) return;
    
    try {
      setLoading(true);
      setError(null);
      setCommunityResults(null);
      
      const results = await detectCommunitiesFromSimulation(simulationId, selectedAlgorithm);
      setCommunityResults(results);
    } catch (err) {
      console.error('Error detecting communities:', err);
      setError('Failed to detect communities: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Compare different community detection algorithms
  const runAlgorithmComparison = async () => {
    if (!simulationId) return;
    
    try {
      setComparing(true);
      setError(null);
      
      // Choose algorithms to compare - limit to 3 for simplicity
      const algorithmsToCompare = algorithms
        .filter(a => a.id !== 'custom')
        .slice(0, 3)
        .map(a => a.id);
      
      const results = await compareAlgorithms(simulationId, algorithmsToCompare);
      setComparison(results);
    } catch (err) {
      console.error('Error comparing algorithms:', err);
      setError('Failed to compare algorithms: ' + (err.response?.data?.detail || err.message));
    } finally {
      setComparing(false);
    }
  };

  // Prepare data for community size chart
  const prepareCommunityData = () => {
    if (!communityResults?.results?.communities) return [];
    
    return Object.entries(communityResults.results.communities)
      .map(([id, members], index) => ({
        id: `Community ${id}`,
        value: members.length,
        color: COMMUNITY_COLORS[index % COMMUNITY_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Prepare data for metrics comparison chart
  const prepareComparisonData = () => {
    if (!comparison?.comparison) return [];
    
    const metrics = ['modularity', 'coverage', 'performance'];
    return comparison.algorithms.map(algorithm => {
      const result = {
        name: algorithm.charAt(0).toUpperCase() + algorithm.slice(1),
      };
      
      metrics.forEach(metric => {
        if (comparison.comparison[algorithm] && comparison.comparison[algorithm][metric] !== undefined) {
          result[metric] = parseFloat((comparison.comparison[algorithm][metric] * 100).toFixed(1));
        } else {
          result[metric] = 0;
        }
      });
      
      return result;
    });
  };

  return (
    <div className="mt-6">
      {!showDetection ? (
        <Button
          onClick={() => setShowDetection(true)}
          disabled={!simulationId}
          className="mb-4"
        >
          <Network size={16} className="mr-2" />
          Detect Communities
        </Button>
      ) : (
        <Card className="bg-white border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Community Detection</h3>
            <Button 
              variant="text" 
              size="sm" 
              onClick={() => setShowDetection(false)}
            >
              Hide
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <AlertTriangle size={20} className="text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-grow">
                <label className="block text-sm text-gray-600 mb-1">Algorithm</label>
                <select
                  value={selectedAlgorithm}
                  onChange={(e) => setSelectedAlgorithm(e.target.value)}
                  className="w-full p-2 border rounded"
                  disabled={loading || comparing}
                >
                  <option value="">Select Algorithm</option>
                  {algorithms.map(algo => (
                    <option key={algo.id} value={algo.id}>
                      {algo.name} - {algo.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <Button
                onClick={detectCommunities}
                disabled={loading || !selectedAlgorithm || comparing}
                className="mb-0"
              >
                {loading ? 'Detecting...' : 'Detect Communities'}
              </Button>
              
              <Button
                variant="outline"
                onClick={runAlgorithmComparison}
                disabled={comparing || loading || algorithms.length === 0}
                className="mb-0"
              >
                <BarChart2 size={16} className="mr-2" />
                {comparing ? 'Comparing...' : 'Compare Algorithms'}
              </Button>
            </div>
            
            {selectedAlgorithm && algorithms.find(a => a.id === selectedAlgorithm)?.description && (
              <p className="mt-2 text-sm text-gray-500">
                {algorithms.find(a => a.id === selectedAlgorithm)?.description}
              </p>
            )}
          </div>

          {/* Community Detection Results */}
          {communityResults && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Community Pie Chart */}
              <div>
                <h4 className="font-medium mb-3">Community Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareCommunityData()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepareCommunityData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Members']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Communities Stats */}
              <div>
                <h4 className="font-medium mb-3">Community Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded border border-blue-100">
                    <div className="text-sm text-gray-700">Number of Communities</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {communityResults.results.num_communities || 
                       (communityResults.results.communities ? 
                        Object.keys(communityResults.results.communities).length : 0)}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded border border-green-100">
                    <div className="text-sm text-gray-700">Modularity Score</div>
                    <div className="text-2xl font-bold text-green-700">
                      {communityResults.results.modularity ? 
                        communityResults.results.modularity.toFixed(3) : 'N/A'}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-3 rounded border border-purple-100">
                    <div className="text-sm text-gray-700">Algorithm</div>
                    <div className="text-xl font-medium text-purple-700">
                      {communityResults.algorithm.charAt(0).toUpperCase() + 
                       communityResults.algorithm.slice(1)}
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 p-3 rounded border border-amber-100">
                    <div className="text-sm text-gray-700">Avg. Community Size</div>
                    <div className="text-2xl font-bold text-amber-700">
                      {communityResults.results.communities ? 
                        (Object.values(communityResults.results.communities)
                          .reduce((sum, members) => sum + members.length, 0) / 
                         Object.keys(communityResults.results.communities).length).toFixed(1) : 
                        'N/A'}
                    </div>
                  </div>
                </div>
                
                {/* Community Insights */}
                {communityResults.results.insights && (
                  <div className="mt-4 bg-indigo-50 p-3 rounded border border-indigo-100">
                    <h5 className="font-medium text-indigo-800 mb-2">Insights</h5>
                    <p className="text-indigo-700 text-sm">
                      {communityResults.results.insights}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Algorithm Comparison Results */}
          {comparison && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Algorithm Comparison</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareComparisonData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${value}%`, '']} />
                    <Legend />
                    <Bar dataKey="modularity" name="Modularity" fill="#0088FE" />
                    <Bar dataKey="coverage" name="Coverage" fill="#00C49F" />
                    <Bar dataKey="performance" name="Performance" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Comparison Summary */}
              {comparison.comparison && (
                <div className="mt-4 bg-blue-50 p-4 rounded border border-blue-100">
                  <h5 className="font-medium text-blue-800 mb-2">Comparison Summary</h5>
                  <p className="text-blue-700">
                    {comparison.comparison.summary || 
                    `The ${comparison.algorithms.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')} algorithms were compared on this organizational network. 
                    Each algorithm detects communities in a different way, potentially revealing different organizational structures and communication patterns.`}
                  </p>
                  
                  {comparison.comparison.recommendation && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex">
                        <Activity size={18} className="text-blue-800 mr-2 mt-0.5" />
                        <p className="text-blue-800 font-medium">
                          Recommendation: {comparison.comparison.recommendation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default CommunityDetection;
