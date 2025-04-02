import React from 'react';
import { Building2 } from 'lucide-react'; // Import Building2
import Card from '../ui/Card';

const OrgOverview = ({ data, className = '' }) => {
  // Check if we have real data by checking if any key metric is greater than 0
  const hasData = data && (data.employees > 0 || data.teams > 0 || data.departments > 0);

  // Destructure with defaults, even if data is null/undefined
  const {
    name = 'Sample Organization',
    employees = 0,
    teams = 0,
    departments = 0,
    avgPerformance = 0,
    trendingUp = false
  } = data || {}; // Use empty object as fallback

  return (
    <Card
      className={className}
      title={<h3 className="text-lg font-semibold">Organization Overview</h3>}
    >
      {hasData ? ( // Show data if available
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Employees</span>
            <span className="font-semibold">{employees}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Teams</span>
            <span className="font-semibold">{teams}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Departments</span>
            <span className="font-semibold">{departments}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average Performance</span>
            <span className="font-semibold">{avgPerformance}%</span>
          </div>
          <div className="pt-2 mt-2 border-t">
            <div className="flex items-center text-sm">
              <span className={trendingUp ? "text-green-600" : "text-red-600"}>
                {trendingUp ? "↑ Improving" : "↓ Declining"}
              </span>
              <span className="text-gray-500 ml-2">vs. Last Quarter</span>
            </div>
          </div>
        </div>
      ) : (
        // Fallback UI when no data is available
        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
          <Building2 size={48} className="mb-4" />
          <p>No organization data available</p>
        </div>
      )}
    </Card>
  );
};

export default OrgOverview;