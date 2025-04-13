import React, { useState, useEffect } from 'react';
import { Sliders, AlertTriangle, Check, Lightbulb } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { getParameterGuidance } from '../../../services/simulation/simulationServices';

const ParameterGuidance = ({ datasetId, currentParams, onApplyParams }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGuidance, setShowGuidance] = useState(false);
  const [parameterGuides, setParameterGuides] = useState([]);
  const [derivedParameters, setDerivedParameters] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const loadGuidance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getParameterGuidance(datasetId);
      setParameterGuides(response.parameters || []);
      setDerivedParameters(response.derived_parameters || null);
      setWarnings(response.warnings || []);
      
      setShowGuidance(true);
    } catch (err) {
      console.error('Error loading parameter guidance:', err);
      setError('Failed to load parameter guidance: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Apply parameter recommendations
  const applyRecommendedParameters = () => {
    if (!parameterGuides.length) return;
    
    const newParams = {};
    
    parameterGuides.forEach(param => {
      if (param.default_value !== undefined) {
        // Convert parameter name from snake_case to camelCase
        const paramName = param.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newParams[paramName] = param.default_value;
      }
    });
    
    if (onApplyParams && Object.keys(newParams).length > 0) {
      onApplyParams(newParams);
    }
  };

  // Check if current parameters are within recommended ranges
  const getParameterValidity = (paramName, currentValue) => {
    const guide = parameterGuides.find(p => {
      const camelCaseName = p.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      return camelCaseName === paramName || p.name === paramName;
    });
    
    if (!guide) return 'unknown';
    
    // For options-based parameters
    if (guide.options) {
      return guide.options.includes(currentValue) ? 'valid' : 'invalid';
    }
    
    // For numeric parameters
    if (guide.min_value !== undefined && guide.max_value !== undefined) {
      if (currentValue < guide.min_value || currentValue > guide.max_value) {
        return 'invalid';
      }
      
      // Check if close to min/max (within 10% of range)
      const range = guide.max_value - guide.min_value;
      const buffer = range * 0.1;
      
      if (currentValue <= guide.min_value + buffer || currentValue >= guide.max_value - buffer) {
        return 'warning';
      }
      
      return 'valid';
    }
    
    return 'unknown';
  };

  // Format parameter name for display
  const formatParamName = (name) => {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="mt-4">
      {!showGuidance ? (
        <Button
          variant="outline"
          onClick={loadGuidance}
          disabled={loading}
          className="mb-4"
          size="sm"
        >
          <Sliders size={16} className="mr-2" />
          {loading ? 'Loading Guidance...' : 'Get Parameter Guidance'}
        </Button>
      ) : (
        <Card className="bg-white border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Parameter Guidance</h3>
            <div className="flex space-x-2">
              <Button 
                size="sm"
                onClick={applyRecommendedParameters}
                disabled={!parameterGuides.length}
              >
                Apply Recommendations
              </Button>
              <Button 
                variant="text" 
                size="sm" 
                onClick={() => setShowGuidance(false)}
              >
                Hide
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <AlertTriangle size={20} className="text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {warnings && warnings.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
              <div className="flex">
                <AlertTriangle size={20} className="text-amber-500 mr-2" />
                <div>
                  <p className="font-medium text-amber-700">Warnings</p>
                  <ul className="mt-1 text-amber-700 list-disc list-inside">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {derivedParameters && Object.keys(derivedParameters).length > 0 && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <div className="flex">
                <Lightbulb size={20} className="text-green-600 mr-2" />
                <div>
                  <p className="font-medium text-green-700">Parameters Derived From Data</p>
                  <p className="text-sm text-green-600 mt-1">
                    These parameters have been derived from your dataset to ensure realistic simulation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parameter Guidance Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parameter
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recommended Range
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parameterGuides.map(param => {
                  // Convert snake_case to camelCase for matching with current params
                  const paramCamelCase = param.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                  const currentValue = currentParams?.[paramCamelCase];
                  const status = currentValue !== undefined ? getParameterValidity(paramCamelCase, currentValue) : 'unknown';
                  
                  return (
                    <tr key={param.name}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatParamName(param.name)}</div>
                        <div className="text-xs text-gray-500">{param.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {currentValue !== undefined ? (
                            typeof currentValue === 'number' ? 
                              currentValue.toString() : 
                              currentValue
                          ) : 'Not Set'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {param.options ? (
                            <span>{param.options.join(', ')}</span>
                          ) : (
                            <span>
                              {param.min_value} - {param.max_value}
                              {param.default_value !== undefined && ` (default: ${param.default_value})`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status === 'valid' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            <Check size={14} className="mr-1" /> Valid
                          </span>
                        )}
                        {status === 'warning' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <AlertTriangle size={14} className="mr-1" /> Borderline
                          </span>
                        )}
                        {status === 'invalid' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            <AlertTriangle size={14} className="mr-1" /> Out of Range
                          </span>
                        )}
                        {status === 'unknown' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Not Set
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ParameterGuidance;
