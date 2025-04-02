import React from 'react';
import Card from '../ui/Card';

const NetworkMetrics = ({
  metrics = {
    nodes: 0,
    edges: 0,
    density: 0,
    avgClusteringCoefficient: 0,
    avgDegree: 0,
    diameter: 0
  },
  className = ''
}) => {
  return (
    <Card
      className={className}
      title={<h3 className="text-lg font-semibold">Network Statistics</h3>}
    >
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Basic Metrics</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Nodes:</span>
              <span className="font-semibold">{metrics.nodes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Edges:</span>
              <span className="font-semibold">{metrics.edges}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Density:</span>
              <span className="font-semibold">{metrics.density.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg. Degree:</span>
              <span className="font-semibold">{metrics.avgDegree.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Structural Metrics</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Clustering:</span>
              <span className="font-semibold">{metrics.avgClusteringCoefficient.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Diameter:</span>
              <span className="font-semibold">{metrics.diameter}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Analysis Options</h4>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm">
              Find Communities
            </button>
            <button className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm">
              Centrality Analysis
            </button>
            <button className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm">
              Information Flow
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NetworkMetrics;