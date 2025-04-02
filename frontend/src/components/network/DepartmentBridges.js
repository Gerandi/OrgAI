import React from 'react';
import Card from '../ui/Card';

const DepartmentBridges = ({
  bridges = [],
  className = '',
  title = 'Cross-Departmental Bridges'
}) => {
  const defaultBridges = [
    { connection: 'Cooper - Johnson', departments: 'Engineering - Product', strength: 0.92 },
    { connection: 'Scott - Wilson', departments: 'Sales - Marketing', strength: 0.88 },
    { connection: 'Johnson - Wilson', departments: 'Product - Marketing', strength: 0.76 },
    { connection: 'Chen - Smith', departments: 'Engineering - Support', strength: 0.72 },
    { connection: 'Taylor - Davis', departments: 'Product - Sales', strength: 0.68 }
  ];

  const dataToShow = bridges.length > 0 ? bridges : defaultBridges;

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
                Connection
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Departments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Strength
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataToShow.map((bridge, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{bridge.connection}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{bridge.departments}</td>
                <td className="px-6 py-4 whitespace-nowrap">{bridge.strength.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DepartmentBridges;