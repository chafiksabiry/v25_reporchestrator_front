import React from 'react';
import { Book, Star, Clock, Users, ChevronRight } from 'lucide-react';

interface Skill {
  id: string;
  title: string;
  provider: {
    name: string;
    avatar: string;
    rating: number;
    reviews: number;
  };
  description: string;
  category: string;
  duration: string;
  participants: number;
  price: number | 'Free';
}

interface SkillExchangeProps {
  skills: Skill[];
  onSkillSelect: (skillId: string) => void;
}

export function SkillExchange({ skills, onSkillSelect }: SkillExchangeProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map((skill) => (
          <div key={skill.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Book className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{skill.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <img
                      src={skill.provider.avatar}
                      alt={skill.provider.name}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-sm text-gray-500">{skill.provider.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium">{skill.provider.rating}</span>
              </div>
            </div>

            <p className="mt-3 text-sm text-gray-600">{skill.description}</p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{skill.duration}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{skill.participants} enrolled</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="font-medium text-gray-900">
                {typeof skill.price === 'number' ? `$${skill.price}` : skill.price}
              </span>
              <button
                onClick={() => onSkillSelect(skill.id)}
                className="flex items-center text-blue-600 hover:text-blue-700"
              >
                <span className="text-sm font-medium">Learn More</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}