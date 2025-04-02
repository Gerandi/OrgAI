import React from 'react';
import Card from '../ui/Card';

const ModelHyperparameters = ({
  modelType = 'random_forest',
  hyperparameters = {},
  onParameterChange,
  className = '',
  isLoading = false // Added isLoading prop
}) => {
  // Default hyperparameters for different model types
  const defaultHyperparameters = {
    random_forest: {
      n_estimators: 100,
      max_depth: 20,
      min_samples_split: 5
    },
    gradient_boosting: {
      n_estimators: 100,
      learning_rate: 0.1,
      max_depth: 5
    },
    neural_network: {
      hidden_layers: 1,
      neurons_per_layer: 50,
      activation: 'relu',
      alpha: 0.001
    },
    linear_regression: {
      fit_intercept: true,
      regularization: 'none',
      alpha: 0.01
    }
  };

  // Use provided hyperparameters or defaults
  const params = hyperparameters || defaultHyperparameters[modelType];

  // Render hyperparameter controls based on model type
  const renderHyperparameters = () => {
    switch (modelType) {
      case 'random_forest':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Number of Trees: {params.n_estimators}
              </label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={params.n_estimators}
                onChange={(e) => onParameterChange('n_estimators', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Max Depth: {params.max_depth === null ? 'None' : params.max_depth}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={params.max_depth === null ? 50 : params.max_depth}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  onParameterChange('max_depth', value === 50 ? null : value);
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Min Samples Split: {params.min_samples_split}
              </label>
              <input
                type="range"
                min="2"
                max="20"
                value={params.min_samples_split}
                onChange={(e) => onParameterChange('min_samples_split', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        );

      case 'gradient_boosting':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Number of Estimators: {params.n_estimators}
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={params.n_estimators}
                onChange={(e) => onParameterChange('n_estimators', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Learning Rate: {params.learning_rate}
              </label>
              <input
                type="range"
                min="0.01"
                max="0.3"
                step="0.01"
                value={params.learning_rate}
                onChange={(e) => onParameterChange('learning_rate', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Max Depth: {params.max_depth}
              </label>
              <input
                type="range"
                min="3"
                max="10"
                value={params.max_depth}
                onChange={(e) => onParameterChange('max_depth', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        );

      case 'neural_network':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Hidden Layers: {params.hidden_layers}
              </label>
              <input
                type="range"
                min="1"
                max="3"
                value={params.hidden_layers}
                onChange={(e) => onParameterChange('hidden_layers', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Neurons Per Layer: {params.neurons_per_layer}
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={params.neurons_per_layer}
                onChange={(e) => onParameterChange('neurons_per_layer', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Activation Function
              </label>
              <select
                value={params.activation}
                onChange={(e) => onParameterChange('activation', e.target.value)}
                className="w-full p-2 border rounded mt-1"
              >
                <option value="relu">ReLU</option>
                <option value="tanh">Tanh</option>
                <option value="sigmoid">Sigmoid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Regularization Strength: {params.alpha}
              </label>
              <input
                type="range"
                min="0.0001"
                max="0.01"
                step="0.0001"
                value={params.alpha}
                onChange={(e) => onParameterChange('alpha', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        );

      case 'linear_regression':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Fit Intercept
              </label>
              <div className="mt-1">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={params.fit_intercept}
                    onChange={(e) => onParameterChange('fit_intercept', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Include intercept term</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Regularization Type
              </label>
              <select
                value={params.regularization}
                onChange={(e) => onParameterChange('regularization', e.target.value)}
                className="w-full p-2 border rounded mt-1"
              >
                <option value="none">None</option>
                <option value="l1">L1 (Lasso)</option>
                <option value="l2">L2 (Ridge)</option>
                <option value="elasticnet">ElasticNet</option>
              </select>
            </div>
            {params.regularization !== 'none' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Alpha (Regularization Strength): {params.alpha}
                </label>
                <input
                  type="range"
                  min="0.001"
                  max="1"
                  step="0.001"
                  value={params.alpha}
                  onChange={(e) => onParameterChange('alpha', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        );

      default:
        return (
          <p className="text-gray-500 text-sm">
            Advanced hyperparameter options will appear based on the selected model type.
          </p>
        );
    }
  };

  return (
    <Card className={className}>
      <h3 className="font-medium text-gray-700 mb-2">Hyperparameters</h3>
      {/* Added conditional rendering for loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        renderHyperparameters()
      )}
    </Card>
  );
};

export default ModelHyperparameters;