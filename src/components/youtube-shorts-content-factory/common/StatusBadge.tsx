import React from 'react';
import { ShortStatus } from '../../../types/youtube-shorts-content-factory/types'; // ShortStatus is an enum, so regular import

interface StatusBadgeProps {
  status: ShortStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: Record<ShortStatus, { bg: string, text: string, dot: string }> = {
    [ShortStatus.IDEA]: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
    [ShortStatus.SCRIPTING]: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    [ShortStatus.DRAFT_GENERATED]: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
    [ShortStatus.REVISED]: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
    [ShortStatus.UPLOADED]: { bg: 'bg-gray-200', text: 'text-gray-800', dot: 'bg-gray-500' },
  };

  const style = statusStyles[status];

  if (!style) {
    // Fallback for unknown statuses
    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}>
        <span className={`w-2 h-2 mr-1.5 rounded-full bg-gray-500`}></span>
        {status || 'Unknown'}
      </div>
    );
  }

  const { bg, text, dot } = style;

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span className={`w-2 h-2 mr-1.5 rounded-full ${dot}`}></span>
      {status}
    </div>
  );
};