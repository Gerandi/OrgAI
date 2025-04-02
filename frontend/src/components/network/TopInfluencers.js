import React from 'react';
import Card from '../ui/Card';

const TopInfluencers = ({
  influencers = [],
  className = '',
  title = 'Top Influencers'
}) => {
  const defaultInfluencers = [
    { name: 'Jane Cooper', department: 'Engineering', centrality: 0.87 },
    { name: 'Michael Scott', department: 'Sales', centrality: 0.82 },
    { name: 'Sarah Johnson', department: 'Product', centrality: 0.79 },
    { name: 'Robert Chen', department: 'Engineering', centrality: 0.75 },
    { name: 'Emma Wilson', department: 'Marketing', centrality: 0.73 }
  ];

  const dataToShow = influencers.length > 0 ? influencers : defaultInfluencers;

  return (
    <Card
      className={className}
      title={<h3 className="text-lg font-semibold">{title}</h3>}
    >
      <div className="overflow-auto max-h-64">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Centrality
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataToShow.map((person, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{person.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{person.department}</td>
                <td className="px-6 py-4 whitespace-nowrap">{person.centrality.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TopInfluencers;