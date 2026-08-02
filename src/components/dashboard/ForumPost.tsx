import React from 'react';
import { MessageSquare, ThumbsUp, Share2, Bookmark } from 'lucide-react';

interface ForumPostProps {
  title: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  content: string;
  category: string;
  tags: string[];
  stats: {
    replies: number;
    likes: number;
    views: number;
  };
  timeAgo: string;
  onLike?: () => void;
  onReply?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
}

export function ForumPost({
  title,
  author,
  content,
  category,
  tags,
  stats,
  timeAgo,
  onLike,
  onReply,
  onShare,
  onBookmark,
}: ForumPostProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-start space-x-4">
        <img src={author.avatar} alt={author.name} className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{title}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{author.name}</span>
                <span>·</span>
                <span>{author.role}</span>
                <span>·</span>
                <span>{timeAgo}</span>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              {category}
            </span>
          </div>
          
          <p className="mt-2 text-gray-600">{content}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onLike}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{stats.likes} likes</span>
              </button>
              <button
                onClick={onReply}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{stats.replies} replies</span>
              </button>
              <span className="text-gray-500">{stats.views} views</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onShare}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onBookmark}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}