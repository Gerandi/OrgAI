import React, { useState, useEffect } from 'react';
import { Info, HelpCircle, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { getSimulationExplanations } from '../../../services/simulation/simulationServices';

const ModelExplainer = ({ simulationId, selectedModel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [explanations, setExplanations] = useState(null);
  const [showExplanations, setShowExplanations] = useState(false);

  const loadExplanations = async () => {
    if (!simulationId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getSimulationExplanations(simulationId);
      setExplanations(data.explanations);
      setShowExplanations(true);
    } catch (err) {
      console.error('Error loading model explanations:', err);
      setError('Could not load model explanations: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Format feature names for display
  const formatFeatureName = (name) => {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Prepare feature importance data for chart
  const prepareFeatureImportanceData = () => {
    if (!explanations?.feature_importance) return [];
    
    return explanations.feature_importance.map(item => ({
      feature: formatFeatureName(item.feature),
      importance: parseFloat((item.importance * 100).toFixed(2))
    })).sort((a, b) => b.importance - a.importance);
  };

  // Generate color gradient for bars
  const getBarColor = (index, total) => {
    const colors = ['#0088FE', '#00C49F', '#00A7C4', '#4747A1'];
    return colors[index % colors.length];
  };

  return (
    <div className="mt-6">
      {!showExplanations ? (
        <Button
          onClick={loadExplanations}
          disabled={loading || !simulationId}
          className="mb-4"
        >
          <Info size={16} className="mr-2" />
          {loading ? 'Loading Explanations...' : 'Show Model Explanations'}
        </Button>
      ) : (
        <Card className="bg-white border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Model Explanations</h3>
            <Button 
              variant="text" 
              size="sm" 
              onClick={() => setShowExplanations(false)}
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

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : explanations ? (
            <div className="space-y-6">
              {/* Feature Importance Chart */}
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  Feature Importance
                  <HelpCircle size={16} className="ml-1 text-gray-400" title="Influence of each feature on model predictions" />
                </h4>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareFeatureImportanceData()}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <YAxis dataKey="feature" type="category" width={120} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Importance']} />
                      <Legend />
                      <Bar
                        dataKey="importance"
                        name="Relative Importance"
                        fill="#0088FE"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Decision Path */}
              {explanations.decision_path && (
                <div>
                  <h4 className="font-medium mb-2">Key Decision Factors</h4>
                  <div className="bg-blue-50 p-4 rounded">
                    <ul className="list-disc pl-5 space-y-2">
                      {explanations.decision_path.map((item, index) => (
                        <li key={index} className="text-blue-800">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Prediction Confidence */}
              {explanations.prediction_confidence && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded border">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Performance Prediction Confidence</h5>
                    <div className="flex items-end space-x-1">
                      <span className="text-2xl font-bold">
                        {(explanations.prediction_confidence.performance * 100).toFixed(0)}%
                      </span>
                      <span className="text-sm text-gray-500 mb-1">confidence</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded border">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Innovation Prediction Confidence</h5>
                    <div className="flex items-end space-x-1">
                      <span className="text-2xl font-bold">
                        {(explanations.prediction_confidence.innovation * 100).toFixed(0)}%
                      </span>
                      <span className="text-sm text-gray-500 mb-1">confidence</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded border">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Satisfaction Prediction Confidence</h5>
                    <div className="flex items-end space-x-1">
                      <span className="text-2xl font-bold">
                        {(explanations.prediction_confidence.satisfaction * 100).toFixed(0)}%
                      </span>
                      <span className="text-sm text-gray-500 mb-1">confidence</span>
                    </div>
                  </div>
                </div>
              )}

              {/* What-If Analysis */}
              {explanations.what_if_scenarios && (
                <div>
                  <h4 className="font-medium mb-2">What-If Scenarios</h4>
                  <div className="space-y-3">
                    {Object.entries(explanations.what_if_scenarios).map(([scenario, impact], index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border">
                        <h5 className="font-medium text-sm mb-1">{formatFeatureName(scenario)}</h5>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(impact).map(([metric, value], idx) => (
                            <div key={idx} className="bg-white px-2 py-1 rounded border text-sm">
                              <span className="font-medium">{formatFeatureName(metric)}:</span>{' '}
                              <span className={value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : ''}>
                                {value > 0 ? '+' : ''}{value.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Insights Summary */}
              {explanations.insights && (
                <div className="bg-green-50 p-4 rounded border border-green-100">
                  <h4 className="font-medium text-green-800 mb-2">Model Insights</h4>
                  <p className="text-green-800">{explanations.insights}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <Info size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Select a model and run a simulation to see explanations</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default ModelExplainer;
