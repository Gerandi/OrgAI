import React from 'react';

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const variants = {
  spinner: ({ className, size }) => (
    <svg className={`animate-spin ${className} ${sizes[size]}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  dots: ({ className, size }) => (
    <div className={`flex space-x-2 ${className}`}>
      <div className={`${sizes[size]} bg-current rounded-full animate-pulse`}></div>
      <div className={`${sizes[size]} bg-current rounded-full animate-pulse delay-75`}></div>
      <div className={`${sizes[size]} bg-current rounded-full animate-pulse delay-150`}></div>
    </div>
  ),
};

const Loading = ({
  size = 'md',
  variant = 'spinner',
  className = '',
  text = null,
  fullScreen = false,
  ...props
}) => {
  const LoadingIcon = variants[variant];

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        <div className="text-center">
          <LoadingIcon size={size} className={`text-blue-600 mx-auto ${className}`} />
          {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center" {...props}>
      <LoadingIcon size={size} className={`text-blue-600 ${className}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

export default Loading;