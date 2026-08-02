import React from 'react';
import { Calendar, Clock, Users, Video, MapPin } from 'lucide-react';

interface EventCardProps {
  event: {
    title: string;
    description: string;
    type: 'webinar' | 'workshop' | 'conference' | 'meetup';
    date: string;
    time: string;
    duration: string;
    location: {
      type: 'online' | 'physical';
      details: string;
    };
    organizer: {
      name: string;
      avatar: string;
    };
    attendees: {
      count: number;
      capacity: number;
    };
  };
  onRegister: () => void;
}

export function EventCard({ event, onRegister }: EventCardProps) {
  const getEventTypeStyles = (type: string) => {
    switch (type) {
      case 'webinar':
        return 'bg-blue-50 text-blue-700';
      case 'workshop':
        return 'bg-green-50 text-green-700';
      case 'conference':
        return 'bg-purple-50 text-purple-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{event.title}</h3>
          <div className="flex items-center space-x-2 mt-1">
            <img
              src={event.organizer.avatar}
              alt={event.organizer.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm text-gray-500">by {event.organizer.name}</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${getEventTypeStyles(event.type)}`}>
          {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
        </span>
      </div>

      <p className="mt-2 text-gray-600 text-sm">{event.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{event.date}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{event.time} ({event.duration})</span>
        </div>
        <div className="flex items-center space-x-2">
          {event.location.type === 'online' ? (
            <Video className="w-4 h-4 text-gray-400" />
          ) : (
            <MapPin className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm text-gray-600">{event.location.details}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {event.attendees.count}/{event.attendees.capacity} attending
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex -space-x-2">
          {[...Array(3)].map((_, i) => (
            <img
              key={i}
              className="w-8 h-8 rounded-full border-2 border-white"
              src={`https://i.pravatar.cc/150?img=${i + 1}`}
              alt="Attendee"
            />
          ))}
          {event.attendees.count > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-600">+{event.attendees.count - 3}</span>
            </div>
          )}
        </div>
        <button
          onClick={onRegister}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Register Now
        </button>
      </div>
    </div>
  );
}