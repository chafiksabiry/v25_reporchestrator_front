import React from 'react';
import { Star, Calendar, Clock, Award } from 'lucide-react';

interface MentorCardProps {
  mentor: {
    name: string;
    avatar: string;
    role: string;
    expertise: string[];
    rating: number;
    reviews: number;
    availability: {
      nextSlot: string;
      timeZone: string;
    };
    achievements: string[];
  };
  onRequestMentoring: () => void;
}

export function MentorCard({ mentor, onRequestMentoring }: MentorCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-start space-x-4">
        <img src={mentor.avatar} alt={mentor.name} className="w-16 h-16 rounded-full" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{mentor.name}</h3>
              <p className="text-sm text-gray-500">{mentor.role}</p>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-gray-900">{mentor.rating}</span>
              <span className="text-sm text-gray-500">({mentor.reviews} reviews)</span>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Expertise:</p>
            <div className="flex flex-wrap gap-2">
              {mentor.expertise.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Next available: {mentor.availability.nextSlot}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Timezone: {mentor.availability.timeZone}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {mentor.achievements.map((achievement) => (
              <div
                key={achievement}
                className="flex items-center space-x-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs"
              >
                <Award className="w-3 h-3" />
                <span>{achievement}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={onRequestMentoring}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Request Mentoring Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}