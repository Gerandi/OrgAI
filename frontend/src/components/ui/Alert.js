import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const variants = {
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-700',
    icon: Info,
  },
  success: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    textColor: 'text-green-700',
    icon: CheckCircle,
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-700',
    icon: AlertCircle,
  },
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    textColor: 'text-red-700',
    icon: AlertCircle,
  },
};

const Alert = ({
  children,
  variant = 'info',
  title = null,
  className = '',
  dismissible = false,
  onDismiss = null,
  ...props
}) => {
  const { bgColor, borderColor, textColor, icon: Icon } = variants[variant];

  return (
    <div
      className={`${bgColor} border-l-4 ${borderColor} p-4 ${className}`}
      role="alert"
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${textColor}`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${textColor}`}>{title}</h3>
          )}
          <div className={`text-sm ${textColor}`}>{children}</div>
        </div>
        {dismissible && (
          <div className="pl-3">
            <button
              type="button"
              className={`inline-flex rounded-md p-1.5 ${textColor} hover:${bgColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${variant}-50 focus:ring-${variant}-500`}
              onClick={onDismiss}
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;