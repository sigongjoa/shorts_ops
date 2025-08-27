import React from 'react';
import type { Short } from '../../types/youtube-shorts-content-factory/types'; // Adjusted to import type
import { StatusBadge } from './common/StatusBadge';

interface ShortCardProps {
  short: Short;
  onClick: () => void;
}

export const ShortCard: React.FC<ShortCardProps> = ({ short, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-indigo-500 shadow-lg"
    >
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-gray-900 truncate">{short.title}</h4>
        <StatusBadge status={short.status} />
      </div>
      <p className="text-sm text-gray-600 mt-2 truncate">
        {short.script.idea || 'No idea yet...'}
      </p>
    </div>
  );
};