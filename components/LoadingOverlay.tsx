import React from 'react';
import { LoaderIcon } from './Icons';

export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = "Analyzing receipt..." }) => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center max-w-sm w-full">
        <LoaderIcon className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-slate-800">Processing with Gemini</h3>
        <p className="text-slate-500 mt-2 text-sm">{message}</p>
      </div>
    </div>
  );
};
