import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react'; // Import PieChartIcon
import Card from '../ui/Card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const TeamComposition = ({ data = [], title = 'Team Composition', className = '' }) => {
  return (
    <Card
      className={className}
      title={<h3 className="text-lg font-semibold">{title}</h3>}
    >
      <div className="h-64">
        {data && data.length > 0 ? ( // Check if data exists and is not empty
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          // Fallback UI when no data is available
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <PieChartIcon size={48} className="mb-4" />
            <p>No team composition data available</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TeamComposition;