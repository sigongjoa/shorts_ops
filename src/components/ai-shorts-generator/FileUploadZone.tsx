import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadIcon } from './icons';

interface FileUploadZoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  accept: { [key: string]: string[] };
  title: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onDrop, accept, title }) => {
  const onDropCallback = useCallback((acceptedFiles: File[]) => {
    onDrop(acceptedFiles);
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onDropCallback, accept });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-brand-blue bg-blue-50' : 'border-border-light bg-bg-light hover:border-gray-400'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center text-text-secondary">
        <UploadIcon className="w-10 h-10 mb-2" />
        <p className="font-semibold">{title}</p>
        <p className="text-sm">Drag & drop files here, or click to select</p>
      </div>
    </div>
  );
};
