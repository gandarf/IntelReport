import React from 'react';
import { AnalyzedArticle } from '../types';
import { ExternalLink, Tag, AlertCircle } from 'lucide-react';

interface ArticleCardProps {
  article: AnalyzedArticle;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const getRelevanceColor = (score: number) => {
    if (score >= 8) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getRelevanceColor(article.relevanceScore)}`}>
            중요도: {article.relevanceScore}/10
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1">
            <Tag size={12} />
            {article.category}
          </span>
        </div>
        {article.originalLink && (
          <a 
            href={article.originalLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ExternalLink size={18} />
          </a>
        )}
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight font-serif">
        {article.title}
      </h3>

      <p className="text-gray-600 mb-4 text-sm leading-relaxed">
        {article.summary}
      </p>

      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <AlertCircle size={12} />
          주요 사실
        </h4>
        <ul className="space-y-1">
          {article.keyPoints.map((point, idx) => (
            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-blue-500 mt-1.5 text-[6px]">●</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ArticleCard;