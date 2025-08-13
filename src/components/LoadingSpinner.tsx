import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400 text-lg">Loading concepts...</p>
      </div>
    </div>
  );
};