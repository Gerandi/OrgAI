import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react'; // Import BarChart2
import Card from '../ui/Card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const PerformanceDrivers = ({ data = [], title = 'Performance Drivers', className = '' }) => {
  return (
    <Card
      className={className}
      title={<h3 className="text-lg font-semibold">{title}</h3>}
    >
      <div className="h-64">
        {data && data.length > 0 ? ( // Check if data exists and is not empty
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={100} />
              <Bar dataKey="value" fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          // Fallback UI when no data is available
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <BarChart2 size={48} className="mb-4" />
            <p>No performance driver data available</p>
            <p className="text-sm mt-2">Train models to identify drivers</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PerformanceDrivers;