import React from 'react';
import { Briefcase, Clock, DollarSign, Star, Users } from 'lucide-react';

interface MarketplaceGigProps {
  gig: {
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
    price: number;
    skills: string[];
    availability: string;
  };
  onContact: (gigId: string) => void;
}

export function MarketplaceGig({ gig, onContact }: MarketplaceGigProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{gig.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <img
                src={gig.provider.avatar}
                alt={gig.provider.name}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm text-gray-500">{gig.provider.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium">{gig.provider.rating}</span>
          <span className="text-sm text-gray-500">({gig.provider.reviews})</span>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600">{gig.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {gig.skills.map((skill, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="w-4 h-4 mr-2" />
          <span>{gig.duration}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Users className="w-4 h-4 mr-2" />
          <span>{gig.availability}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <DollarSign className="w-5 h-5 text-gray-700" />
          <span className="text-lg font-semibold text-gray-900">{gig.price}/hr</span>
        </div>
        <button
          onClick={() => onContact(gig.id)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Contact Provider
        </button>
      </div>
    </div>
  );
}