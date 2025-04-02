import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react'; // Import BarChart2
import Card from '../ui/Card';

const TeamPerformanceBar = ({ data = [], title = 'Team Performance', className = '' }) => {
  return (
    <Card
      className={className}
      title={<h3 className="text-lg font-semibold">{title}</h3>}
    >
      <div className="h-64">
        {data && data.length > 0 ? ( // Check if data exists and is not empty
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="performance" fill="#0088FE" />
              <Bar dataKey="innovation" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          // Fallback UI when no data is available
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <BarChart2 size={48} className="mb-4" />
            <p>No team performance data available</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TeamPerformanceBar;