import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const DatasetStatusPanel = ({
  datasets = {
    organization: null,
    communication: null,
    performance: null
  },
  onProcess,
  onExport,
  className = ''
}) => {
  const getStatusIcon = (dataset) => {
    if (!dataset) return <XCircle className="text-gray-400" size={20} />;
    if (dataset.status === 'error') return <AlertCircle className="text-red-500" size={20} />;
    return <CheckCircle className="text-green-500" size={20} />;
  };

  const canProcess = datasets.organization !== null;
  const canExport = datasets.organization !== null && datasets.organization.processed;

  return (
    <Card
      className={className}
      title={<h3 className="text-lg font-semibold">Dataset Status</h3>}
    >
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h4 className="font-medium mb-2">Current Dataset Status</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <div className="mr-2">
              {getStatusIcon(datasets.organization)}
            </div>
            <div>
              <p className="text-gray-600">Organization Data:</p>
              <p className="font-semibold">
                {datasets.organization
                  ? `${datasets.organization.recordCount} records`
                  : 'Not loaded'}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="mr-2">
              {getStatusIcon(datasets.communication)}
            </div>
            <div>
              <p className="text-gray-600">Communication Data:</p>
              <p className="font-semibold">
                {datasets.communication
                  ? `${datasets.communication.recordCount} records`
                  : 'Not loaded'}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="mr-2">
              {getStatusIcon(datasets.performance)}
            </div>
            <div>
              <p className="text-gray-600">Performance Data:</p>
              <p className="font-semibold">
                {datasets.performance
                  ? `${datasets.performance.recordCount} records`
                  : 'Not loaded'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Process Data</h4>
          <Button
            variant="success"
            className="mr-2"
            disabled={!canProcess}
            onClick={onProcess}
          >
            Process Uploaded Data
          </Button>
          <span className="text-sm text-gray-500">
            {!canProcess && '(Upload organization data to enable processing)'}
          </span>
        </div>

        <div>
          <h4 className="font-medium mb-2">Export Processed Data</h4>
          <Button
            variant="primary"
            className="mr-2"
            disabled={!canExport}
            onClick={onExport}
          >
            Export to CSV
          </Button>
          <span className="text-sm text-gray-500">
            {!canExport && '(Process data first to enable export)'}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default DatasetStatusPanel;