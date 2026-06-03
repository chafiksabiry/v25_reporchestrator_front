import React, { useState } from 'react';
import { Users, Globe, Briefcase, Star, Search } from 'lucide-react';
import { ChatRoom } from './ChatRoom';

interface GroupChatProps {
  onJoinChat: (chatId: string) => void;
}

export function GroupChat({ onJoinChat }: GroupChatProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const chatGroups = [
    {
      id: 'tech-support',
      name: 'Tech Support Specialists',
      description: 'Discuss technical support best practices and challenges',
      members: 156,
      category: 'industry',
      icon: Globe,
    },
    {
      id: 'fintech',
      name: 'Fintech Support Network',
      description: 'For reps working in financial technology support',
      members: 89,
      category: 'industry',
      icon: Briefcase,
    },
    {
      id: 'top-performers',
      name: 'Elite Support Circle',
      description: 'Group for top-rated support representatives',
      members: 45,
      category: 'experience',
      icon: Star,
    },
  ];

  const filteredGroups = chatGroups.filter(group => 
    (activeCategory === 'all' || group.category === activeCategory) &&
    (group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-lg ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Groups
          </button>
          <button
            onClick={() => setActiveCategory('industry')}
            className={`px-4 py-2 rounded-lg ${
              activeCategory === 'industry'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Industry-Specific
          </button>
          <button
            onClick={() => setActiveCategory('experience')}
            className={`px-4 py-2 rounded-lg ${
              activeCategory === 'experience'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Experience Level
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <div key={group.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <group.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{group.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>{group.members} members</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">{group.description}</p>
            <button
              onClick={() => onJoinChat(group.id)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Join Chat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}