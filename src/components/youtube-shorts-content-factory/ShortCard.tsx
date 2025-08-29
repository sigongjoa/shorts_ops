import React from 'react';
import type { Short } from '../../types/youtube-shorts-content-factory/types'; // Adjusted to import type
import { StatusBadge } from './common/StatusBadge';

interface ShortCardProps {
  short: Short;
  onClick: () => void;
  onDelete: (shortId: string) => void; // New prop for delete
}

export const ShortCard: React.FC<ShortCardProps> = ({ short, onClick, onDelete }) => {
  return (
    <div 
      className="bg-white rounded-lg p-4 transition-all duration-200 border border-gray-200 hover:border-indigo-500 shadow-lg flex flex-col"
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-lg font-semibold text-gray-900 truncate flex-grow cursor-pointer" onClick={onClick}>{short.title}</h4>
        <StatusBadge status={short.status} />
      </div>
      <p className="text-sm text-gray-600 mt-2 truncate flex-grow cursor-pointer" onClick={onClick}>
        {short.script.idea || 'No idea yet...'}
      </p>
      <div className="mt-4 flex justify-end">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(short.id); }}
          className="text-red-500 hover:text-red-700 text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
};