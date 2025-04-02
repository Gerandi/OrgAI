import React from 'react';
import { Play, Save, Settings } from 'lucide-react';

const ModelTrainingForm = ({
  config,
  onConfigChange,
  onHyperparameterChange,
  onTrain,
  onSave,
  isTraining,
  isTrained,
  isDisabled
}) => {

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onConfigChange(prev => ({ ...prev, [name]: value }));
  };

  const handleHyperparamChange = (e) => {
    const { name, value, type } = e.target;
    let processedValue = value;
    if (type === 'number') {
      processedValue = Number(value);
    } else if (value === 'None') {
      processedValue = null; // Handle 'None' string for max_depth
    }
    onHyperparameterChange(name, processedValue);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3 flex items-center">
        <Settings size={18} className="mr-2 text-blue-600" />
        Model Configuration
      </h3>

      <div className="space-y-4">
        {/* Model Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
          <input
            type="text"
            name="name"
            value={config.name}
            onChange={handleInputChange}
            className="input-field"
            placeholder="e.g., Performance Prediction Model"
            disabled={isDisabled}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={config.description}
            onChange={handleInputChange}
            className="input-field"
            placeholder="Describe the model's purpose"
            rows="2"
            disabled={isDisabled}
          ></textarea>
        </div>

        {/* Model Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model Type</label>
          <select
            name="modelType"
            value={config.modelType}
            onChange={handleInputChange}
            className="input-field"
            disabled={isDisabled}
          >
            <option value="random_forest">Random Forest</option>
            <option value="gradient_boosting">Gradient Boosting</option>
            <option value="linear_regression">Linear Regression</option>
            <option value="logistic_regression">Logistic Regression</option>
            <option value="support_vector_machine">Support Vector Machine (SVM)</option>
            {/* Add other model types as supported by backend */}
          </select>
        </div>

        {/* Test Set Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Test Set Size</label>
          <div className="flex items-center">
            <input
              type="range"
              name="testSize"
              min="0.1"
              max="0.5"
              step="0.05"
              value={config.testSize}
              onChange={handleInputChange} // Direct change is fine for range
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mr-3"
              disabled={isDisabled}
            />
            <span className="text-sm w-12 text-right">
              {(config.testSize * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Hyperparameters Section */}
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Hyperparameters</h4>

          {/* Random Forest Hyperparameters */}
          {config.modelType === 'random_forest' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Number of Trees (n_estimators)</label>
                <input
                  type="number"
                  name="n_estimators"
                  value={config.hyperparameters.n_estimators || 100}
                  onChange={handleHyperparamChange}
                  className="input-field-sm"
                  min="10" max="1000" step="10"
                  disabled={isDisabled}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Max Depth (max_depth)</label>
                <select
                  name="max_depth"
                  value={config.hyperparameters.max_depth === null ? 'None' : config.hyperparameters.max_depth || 'None'}
                  onChange={handleHyperparamChange}
                  className="input-field-sm"
                  disabled={isDisabled}
                >
                  <option value="None">Auto</option>
                  {[5, 10, 15, 20, 25, 30].map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Gradient Boosting Hyperparameters */}
          {config.modelType === 'gradient_boosting' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Learning Rate (learning_rate)</label>
                <select
                  name="learning_rate"
                  value={config.hyperparameters.learning_rate || 0.1}
                  onChange={handleHyperparamChange}
                  className="input-field-sm"
                  disabled={isDisabled}
                >
                  {[0.001, 0.01, 0.05, 0.1, 0.2, 0.3].map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Number of Estimators (n_estimators)</label>
                <input
                  type="number"
                  name="n_estimators"
                  value={config.hyperparameters.n_estimators || 100}
                  onChange={handleHyperparamChange}
                  className="input-field-sm"
                  min="10" max="500" step="10"
                  disabled={isDisabled}
                />
              </div>
            </div>
          )}
          {/* Add inputs for other model types as needed */}
        </div>

        {/* Action Buttons */}
        <div className="flex pt-4 space-x-2 border-t">
          <button
            type="button"
            className="btn btn-primary flex-1 flex items-center justify-center"
            onClick={onTrain}
            disabled={isDisabled || isTraining}
          >
            <Play size={16} className="mr-1" />
            {isTraining ? 'Training...' : 'Train Model'}
          </button>
          <button
            type="button"
            className="btn btn-success flex-1 flex items-center justify-center"
            onClick={onSave}
            disabled={isDisabled || !isTrained || isTraining} // Disable if not trained or currently training/saving
          >
            <Save size={16} className="mr-1" />
            Save Model
          </button>
        </div>
      </div>
    </div>
  );
};

// Basic Input Field Styles (replace or integrate with your UI library/CSS)
const InputField = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 ${className}`}
  />
);
const InputFieldSm = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-1 px-2 ${className}`}
  />
);

// Basic Button Styles (replace or integrate with your UI library/CSS)
const Button = ({ children, className = '', ...props }) => (
  <button {...props} className={`inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

const BtnPrimary = ({ children, ...props }) => (
  <Button {...props} className="border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500">
    {children}
  </Button>
);

const BtnSuccess = ({ children, ...props }) => (
    <Button {...props} className="border-transparent bg-green-600 text-white hover:bg-green-700 focus:ring-green-500">
        {children}
    </Button>
);

// Add these styles to your global CSS or Tailwind config if needed:
// .input-field { /* styles */ }
// .input-field-sm { /* smaller input styles */ }
// .btn { /* base button styles */ }
// .btn-primary { /* primary button styles */ }
// .btn-success { /* success button styles */ }


export default ModelTrainingForm;