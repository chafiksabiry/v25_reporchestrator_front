import React from 'react';
import { BookOpen, Download, Eye, ThumbsUp, MessageSquare } from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  description: string;
  author: {
    name: string;
    avatar: string;
  };
  type: 'guide' | 'template' | 'video' | 'document';
  stats: {
    downloads: number;
    views: number;
    likes: number;
    comments: number;
  };
  tags: string[];
}

interface KnowledgeShareProps {
  resources: Resource[];
  onDownload: (resourceId: string) => void;
  onLike: (resourceId: string) => void;
  onComment: (resourceId: string) => void;
}

export function KnowledgeShare({ resources, onDownload, onLike, onComment }: KnowledgeShareProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {resources.map((resource) => (
        <div key={resource.id} className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{resource.title}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <img
                    src={resource.author.avatar}
                    alt={resource.author.name}
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-sm text-gray-500">{resource.author.name}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onDownload(resource.id)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-3 text-sm text-gray-600">{resource.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {resource.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{resource.stats.views}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Download className="w-4 h-4" />
                <span>{resource.stats.downloads}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onLike(resource.id)}
                className="flex items-center space-x-1 hover:text-blue-600"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{resource.stats.likes}</span>
              </button>
              <button
                onClick={() => onComment(resource.id)}
                className="flex items-center space-x-1 hover:text-blue-600"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{resource.stats.comments}</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}