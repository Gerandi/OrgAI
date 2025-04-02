import React from 'react';
import { FileText } from 'lucide-react';

const TemplateFileItem = ({ fileName, onDownload }) => {
  return (
    <div className="flex items-center p-2 bg-gray-50 rounded">
      <FileText size={20} className="text-gray-500 mr-2" />
      <span className="text-sm">{fileName}</span>
      <button
        className="ml-auto text-blue-600 text-sm"
        onClick={onDownload}
      >
        Download
      </button>
    </div>
  );
};

export default TemplateFileItem;