import React, { useState, useEffect } from 'react';
import { Database, Check, X, Edit, Save, Info, Search, AlertTriangle } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { identifyFeatures, saveColumnMappings } from '../../../services/simulation/simulationServices';

const FeatureIdentifier = ({ datasetId, onFeatureIdentified }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [columnMappings, setColumnMappings] = useState(null);
  const [identificationResults, setIdentificationResults] = useState(null);
  const [editMapping, setEditMapping] = useState(null);
  const [userMappings, setUserMappings] = useState({});

  const loadFeatureIdentification = async () => {
    if (!datasetId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await identifyFeatures(datasetId);
      setColumnMappings(response.column_mappings);
      setIdentificationResults(response.identification_results);
      
      // Notify parent component if callback provided
      if (onFeatureIdentified) {
        onFeatureIdentified(response);
      }
      
      setSuccess('Feature identification completed successfully');
    } catch (err) {
      console.error('Error identifying features:', err);
      setError('Failed to identify features: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMappings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Merge suggested mappings with user mappings
      const mappingsToSave = {
        ...columnMappings.suggested_mappings,
        ...userMappings
      };
      
      await saveColumnMappings(datasetId, {
        suggested_mappings: mappingsToSave,
        confidence: columnMappings.confidence
      });
      
      setSuccess('Column mappings saved successfully');
      setEditMapping(null);
    } catch (err) {
      console.error('Error saving mappings:', err);
      setError('Failed to save mappings: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const startEditMapping = (columnName, currentType) => {
    setEditMapping({
      column: columnName,
      type: currentType
    });
  };

  const cancelEdit = () => {
    setEditMapping(null);
  };

  const saveEdit = () => {
    if (!editMapping) return;
    
    setUserMappings({
      ...userMappings,
      [editMapping.column]: editMapping.type
    });
    
    setEditMapping(null);
  };

  const getColumnTypeDisplay = (type) => {
    switch(type) {
      case 'employee_id': return 'Employee ID';
      case 'employee_name': return 'Employee Name';
      case 'department': return 'Department';
      case 'team': return 'Team';
      case 'role': return 'Role';
      case 'manager_id': return 'Manager ID';
      case 'salary': return 'Salary';
      case 'performance': return 'Performance';
      case 'satisfaction': return 'Satisfaction';
      case 'communication': return 'Communication';
      case 'tenure': return 'Tenure';
      case 'skills': return 'Skills';
      case 'training': return 'Training';
      case 'innovation': return 'Innovation';
      case 'date': return 'Date';
      case 'timestamp': return 'Timestamp';
      case 'location': return 'Location';
      case 'numerical': return 'Numerical';
      case 'categorical': return 'Categorical';
      case 'text': return 'Text';
      case 'boolean': return 'Boolean';
      case 'target': return 'Target Variable';
      case 'ignore': return 'Ignore';
      default: return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };

  const getConfidenceDisplay = (confidence) => {
    if (confidence === 'user_defined') {
      return <span className="text-blue-600 font-medium">User Defined</span>;
    }
    
    if (typeof confidence === 'number') {
      if (confidence >= 0.9) {
        return <span className="text-green-600 font-medium">High ({(confidence * 100).toFixed(0)}%)</span>;
      } else if (confidence >= 0.7) {
        return <span className="text-yellow-600">Medium ({(confidence * 100).toFixed(0)}%)</span>;
      } else {
        return <span className="text-red-600">Low ({(confidence * 100).toFixed(0)}%)</span>;
      }
    }
    
    return <span className="text-gray-500">Unknown</span>;
  };

  const columnTypes = [
    'employee_id', 'employee_name', 'department', 'team', 'role', 'manager_id',
    'salary', 'performance', 'satisfaction', 'communication', 'tenure',
    'skills', 'training', 'innovation', 'date', 'timestamp', 'location',
    'numerical', 'categorical', 'text', 'boolean', 'target', 'ignore'
  ];

  return (
    <Card className="bg-white border mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Feature Identification</h3>
        <div className="flex space-x-2">
          {columnMappings ? (
            <Button
              onClick={handleSaveMappings}
              disabled={saving}
              size="sm"
            >
              <Save size={16} className="mr-2" />
              {saving ? 'Saving...' : 'Save Mappings'}
            </Button>
          ) : (
            <Button
              onClick={loadFeatureIdentification}
              disabled={loading || !datasetId}
              size="sm"
            >
              <Search size={16} className="mr-2" />
              {loading ? 'Identifying...' : 'Identify Features'}
            </Button>
          )}
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

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <Check size={20} className="text-green-500 mr-2" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : columnMappings ? (
        <div>
          <div className="bg-blue-50 border border-blue-100 rounded p-4 mb-4">
            <div className="flex">
              <Info size={20} className="text-blue-500 mr-2" />
              <div>
                <p className="text-blue-700 font-medium">Feature Identification Results</p>
                <p className="text-blue-600 text-sm mt-1">
                  Feature identification analyzed {Object.keys(columnMappings.suggested_mappings).length} columns. 
                  You can review and edit the identified column types before saving.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Column Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identified Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(columnMappings.suggested_mappings).map(([column, type]) => {
                  const actualType = userMappings[column] || type;
                  const confidence = columnMappings.confidence?.[column] || 'unknown';
                  const isEditing = editMapping && editMapping.column === column;
                  
                  return (
                    <tr key={column}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{column}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editMapping.type}
                            onChange={(e) => setEditMapping({...editMapping, type: e.target.value})}
                            className="border rounded p-1 text-sm w-full"
                          >
                            {columnTypes.map(colType => (
                              <option key={colType} value={colType}>
                                {getColumnTypeDisplay(colType)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {userMappings[column] ? (
                              <span className="flex items-center">
                                {getColumnTypeDisplay(actualType)}
                                <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-1 py-0.5 rounded">
                                  user edited
                                </span>
                              </span>
                            ) : (
                              <span>{getColumnTypeDisplay(actualType)}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {getConfidenceDisplay(confidence)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {isEditing ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={saveEdit}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-red-600 hover:text-red-900"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditMapping(column, actualType)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Statistical Analysis Results (if available) */}
          {identificationResults && identificationResults.statistical_analysis && (
            <div className="mt-6">
              <h4 className="text-lg font-medium mb-4">Statistical Analysis</h4>
              
              {/* Correlations */}
              {identificationResults.statistical_analysis.correlations && (
                <div className="mb-6">
                  <h5 className="text-md font-medium mb-2">Top Correlations</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {identificationResults.statistical_analysis.correlations.slice(0, 6).map((item, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border">
                        <div className="flex justify-between">
                          <div className="text-sm font-medium">
                            {item.feature1} ↔ {item.feature2}
                          </div>
                          <div className={`text-sm font-bold ${
                            Math.abs(item.correlation) > 0.7 ? 'text-green-600' : 
                            Math.abs(item.correlation) > 0.4 ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {item.correlation.toFixed(2)}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {Math.abs(item.correlation) > 0.7 ? 'Strong correlation' : 
                           Math.abs(item.correlation) > 0.4 ? 'Moderate correlation' : 'Weak correlation'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feature Importance */}
              {identificationResults.statistical_analysis.feature_importance && (
                <div className="mb-6">
                  <h5 className="text-md font-medium mb-2">Potential Target Variables</h5>
                  <div className="bg-blue-50 border border-blue-100 rounded p-4">
                    <p className="text-blue-700 mb-2">
                      Based on statistical analysis, these columns are likely candidates for target variables:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {identificationResults.statistical_analysis.potential_targets.map((target, index) => (
                        <span key={index} className="bg-white px-3 py-1 rounded-full text-sm border border-blue-200 text-blue-800">
                          {target}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          <Database size={48} className="mx-auto mb-3 text-gray-300" />
          <p>Select a dataset and click "Identify Features" to analyze column types</p>
        </div>
      )}
    </Card>
  );
};

export default FeatureIdentifier;
