import React from 'react';
import { CheckCircle } from 'lucide-react';

const FeatureSelectionGrid = ({
  availableFeatures = [],
  selectedFeatures = [],
  onToggle,
  className = ''
}) => {
  return (
    <div className={`mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${className}`}>
      {availableFeatures.map((feature) => (
        <div
          key={feature.name}
          className={`border rounded-md p-3 flex items-center cursor-pointer ${
            selectedFeatures.includes(feature.name) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}
          onClick={() => onToggle(feature.name)}
        >
          <div className={`h-5 w-5 mr-3 flex items-center justify-center rounded-full ${
            selectedFeatures.includes(feature.name)
              ? 'bg-blue-500 text-white'
              : 'border border-gray-400'
          }`}>
            {selectedFeatures.includes(feature.name) && <CheckCircle size={12} />}
          </div>
          <div>
            <p className="font-medium">{feature.label}</p>
            <p className="text-xs text-gray-500">
              <span className="inline-block px-2 py-0.5 bg-gray-100 rounded-full">
                {feature.category}
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeatureSelectionGrid;