import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X } from 'lucide-react';

interface AIResponsePanelProps {
  response: string;
  loading: boolean;
  title: string;
  onClose: () => void;
}

const AIResponsePanel: React.FC<AIResponsePanelProps> = ({ response, loading, title, onClose }) => {
  if (!loading && !response) return null;

  return (
    <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-lg border border-purple-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white" />
          <h3 className="text-white font-semibold text-sm">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
            Claude Haiku 4.5
          </span>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-3 animate-pulse-slow">
            <div className="h-4 bg-purple-200 rounded w-3/4"></div>
            <div className="h-4 bg-purple-200 rounded w-full"></div>
            <div className="h-4 bg-purple-200 rounded w-5/6"></div>
            <div className="h-4 bg-purple-200 rounded w-2/3"></div>
            <div className="h-4 bg-purple-200 rounded w-4/5"></div>
          </div>
        ) : (
          <div className="prose max-w-none">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIResponsePanel;
