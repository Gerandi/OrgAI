import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card';
import { Settings, Save, BarChart2 } from 'lucide-react'; // Import BarChart2

const PerformanceChart = ({ data = [], title = 'Performance Trends', className = '' }) => {
  return (
    <Card
      className={className}
      title={
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex space-x-2">
            <button className="text-gray-500 hover:text-gray-700">
              <Settings size={18} />
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <Save size={18} />
            </button>
          </div>
        </div>
      }
    >
      <div className="h-64">
        {data && data.length > 0 ? ( // Check if data exists and is not empty
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="performance" stroke="#0088FE" strokeWidth={2} />
              <Line type="monotone" dataKey="innovation" stroke="#00C49F" strokeWidth={2} />
              {data[0]?.target && (
                <Line type="monotone" dataKey="target" stroke="#FF8042" strokeDasharray="5 5" />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          // Fallback UI when no data is available
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <BarChart2 size={48} className="mb-4" />
            <p>No performance data available</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PerformanceChart;