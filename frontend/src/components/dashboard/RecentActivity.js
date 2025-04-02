import React from 'react';
import { FileText, Upload, BarChart2 } from 'lucide-react';

const RecentActivity = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-gray-500">No recent activity.</div>;
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'dataset_upload': return <Upload className="h-5 w-5 text-blue-500" />;
      case 'model_trained': return <BarChart2 className="h-5 w-5 text-green-500" />;
      case 'report_generated': return <FileText className="h-5 w-5 text-purple-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <ul className="space-y-3">
        {data.map((item, index) => (
          <li key={index} className="flex items-center">
            <div className="bg-gray-100 p-2 rounded-full mr-3">
              {getActivityIcon(item.type)}
            </div>
            <div>
              <p className="text-sm font-medium">{item.description}</p>
              <p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivity;