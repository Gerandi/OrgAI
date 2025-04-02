import React from 'react';
import { Network, Activity, Users, Filter } from 'lucide-react';

const NetworkMetrics = ({ data }) => {
  if (!data) {
    return <div className="text-gray-500">Loading network metrics...</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Network Health</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center">
          <Network className="h-5 w-5 text-blue-500 mr-2" />
          <div>
            <p className="text-sm text-gray-500">Density</p>
            <p className="font-semibold">{data.density?.toFixed(3) || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Activity className="h-5 w-5 text-green-500 mr-2" />
          <div>
            <p className="text-sm text-gray-500">Avg. Degree</p>
            <p className="font-semibold">{data.avg_degree?.toFixed(1) || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Users className="h-5 w-5 text-purple-500 mr-2" />
          <div>
            <p className="text-sm text-gray-500">Avg. Clustering</p>
            <p className="font-semibold">{data.avg_clustering?.toFixed(3) || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Filter className="h-5 w-5 text-yellow-500 mr-2" />
          <div>
            <p className="text-sm text-gray-500">Components</p>
            <p className="font-semibold">{data.connected_components || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkMetrics;