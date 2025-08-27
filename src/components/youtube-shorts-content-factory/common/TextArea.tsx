import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  className?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = '', id, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea
        id={id}
        className={`w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px] disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
        {...props}
      ></textarea>
    </div>
  );
};