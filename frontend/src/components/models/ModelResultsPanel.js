import React from 'react';
import Card from '../ui/Card';
import Alert from '../ui/Alert';

const ModelResultsPanel = ({
  results = null,
  availableFeatures = [],
  className = ''
}) => {
  if (!results) {
    return null;
  }

  // Format feature names for better display
  const formatFeatureName = (featureName) => {
    // Get proper label from available features if possible
    const featureData = availableFeatures.find(f => f.name === featureName);
    if (featureData && featureData.label) {
      return featureData.label;
    }

    // Format from snake_case to Title Case
    return featureName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Alert variant="success" title="Training Complete">
        <p>
          Your model has been trained successfully!
        </p>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border">
          <h3 className="font-medium text-gray-700 mb-2">R² Score</h3>
          <p className="text-3xl font-bold text-blue-600">{results.r2_score >= 0 ? results.r2_score.toFixed(2) : 0}</p>
          <p className="text-sm text-gray-500 mt-1">
            {results.r2_score >= 0
              ? `Explains ${(results.r2_score * 100).toFixed(0)}% of variance`
              : "Model needs improvement"}
          </p>
        </Card>

        <Card className="bg-white border">
          <h3 className="font-medium text-gray-700 mb-2">RMSE</h3>
          <p className="text-3xl font-bold text-blue-600">{results.rmse.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Average prediction error</p>
        </Card>

        {/* Dynamically display validation strategy */}
        <Card className="bg-white border">
          <h3 className="font-medium text-gray-700 mb-2">{results.validationStrategy === 'train_test_split' ? 'Train-Test Split' : 'Cross-Validation'}</h3>
          <p className="text-3xl font-bold text-blue-600">{results.validationStrategy === 'train_test_split' ? '80/20' : '5-fold'}</p>
          <p className="text-sm text-gray-500 mt-1">{results.validationStrategy === 'train_test_split' ? 'Train-test validation' : 'Consistent performance across folds'}</p>
        </Card>
      </div>

      <Card className="bg-white border">
        <h3 className="font-medium text-gray-700 mb-4">Feature Importance</h3>
        <div className="space-y-3">
          {results.feature_importance && results.feature_importance.length > 0 ? (
            results.feature_importance.map((feature) => (
              <div key={feature.feature}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{formatFeatureName(feature.feature)}</span>
                  <span className="font-medium">{(feature.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${feature.importance * 100}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
             <p className="text-gray-500">No feature importance data available.</p>
          )}
        </div>

        {/* Display Features Used */}
        {results.features && results.features.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Features Used</h4>
            <div className="flex flex-wrap gap-1">
              {results.features.map(feature => (
                <span key={feature} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                  {formatFeatureName(feature)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="bg-white border">
        <h3 className="font-medium text-gray-700 mb-2">Model Insights</h3>
        <div className="prose max-w-none text-gray-700">
          {results.feature_importance && results.feature_importance.length >= 2 ? (
            <p>
              Based on the feature importance, we can see that
              <strong> {formatFeatureName(results.feature_importance[0].feature)}</strong> and
              <strong> {formatFeatureName(results.feature_importance[1].feature)}</strong> have
              the most significant impact on the predicted outcome.
            </p>
          ) : (
             <p>Feature importance analysis is limited due to the number of features.</p>
          )}
          <p>
            {results.r2_score >= 0 ? (
              <>The model performs well with an R² score of {results.r2_score.toFixed(2)}, indicating that it
              explains a significant portion of the variance in the data.</>
            ) : (
              <>The model's R² score indicates it needs further refinement or additional features.</>
            )} The RMSE of {results.rmse.toFixed(2)}
            suggests {results.rmse < 10 ? "a good" : "a moderate"} level of prediction accuracy.
          </p>
          <p>
            Consider using this model to:
          </p>
          <ul>
            <li>Identify high-performing team configurations</li>
            <li>Predict the impact of organizational changes</li>
            <li>Optimize resource allocation across teams</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default ModelResultsPanel;