import React from 'react';
import { Coffee, Heart, Music, Camera, Book, Gamepad } from 'lucide-react';

interface SocialSpaceProps {
  onJoinSpace: (spaceId: string) => void;
}

export function SocialSpace({ onJoinSpace }: SocialSpaceProps) {
  const spaces = [
    {
      id: 'hobby-corner',
      name: 'Hobby Corner',
      description: 'Share and discuss your favorite hobbies and interests',
      icon: Coffee,
      members: 234,
      active: true,
      categories: ['Photography', 'Reading', 'Gaming', 'Music'],
    },
    {
      id: 'wellness-club',
      name: 'Wellness Club',
      description: 'Connect with others focused on health and wellness',
      icon: Heart,
      members: 156,
      active: true,
      categories: ['Fitness', 'Meditation', 'Nutrition', 'Mental Health'],
    },
    {
      id: 'creative-hub',
      name: 'Creative Hub',
      description: 'A space for sharing creative projects and inspiration',
      icon: Camera,
      members: 189,
      active: true,
      categories: ['Art', 'Writing', 'Design', 'DIY'],
    },
  ];

  const categories = [
    { name: 'Music & Arts', icon: Music, count: 45 },
    { name: 'Books & Reading', icon: Book, count: 32 },
    { name: 'Gaming', icon: Gamepad, count: 28 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {spaces.map((space) => (
            <div key={space.id} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <space.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{space.name}</h3>
                    <span className="text-sm text-gray-500">{space.members} members</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{space.description}</p>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {space.categories.map((category, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                      >
                        {category}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <img
                          key={i}
                          className="w-8 h-8 rounded-full border-2 border-white"
                          src={`https://i.pravatar.cc/150?img=${i}`}
                          alt="Member"
                        />
                      ))}
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                        <span className="text-xs text-gray-600">+{space.members - 3}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onJoinSpace(space.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Join Space
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Categories</h2>
            <div className="space-y-3">
              {categories.map((category, index) => (
                <button
                  key={index}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <category.icon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{category.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{category.count} spaces</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-2">Create Your Space</h2>
            <p className="text-purple-100 text-sm">
              Start your own community space and connect with like-minded individuals.
            </p>
            <button className="mt-4 w-full bg-white text-purple-600 py-2 rounded-lg hover:bg-purple-50 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}