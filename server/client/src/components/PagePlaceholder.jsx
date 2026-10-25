import React from 'react';
import { Layers } from 'lucide-react';

const PagePlaceholder = ({ title, description, phase }) => {
  return (
    <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
      <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
        <Layers className="w-3.5 h-3.5" />
        <span>{phase}</span>
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
      <p className="text-slate-400 max-w-xl mx-auto text-sm">{description}</p>
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-sm">
        This module is scheduled for implementation in {phase}. All underlying schemas and models are already established.
      </div>
    </div>
  );
};

export default PagePlaceholder;
