import React, { useState } from 'react';
import { Send, Paperclip, Mic, Image } from 'lucide-react';

interface Message {
  id: string;
  sender: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'voice';
}

interface ChatRoomProps {
  roomName: string;
  participants: {
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
  }[];
  messages: Message[];
  onSendMessage: (message: string) => void;
}

export function ChatRoom({ roomName, participants, messages, onSendMessage }: ChatRoomProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{roomName}</h2>
        <div className="flex items-center space-x-2 mt-2">
          <div className="flex -space-x-2">
            {participants.slice(0, 3).map((participant) => (
              <img
                key={participant.name}
                src={participant.avatar}
                alt={participant.name}
                className="w-6 h-6 rounded-full border-2 border-white"
              />
            ))}
          </div>
          {participants.length > 3 && (
            <span className="text-sm text-gray-500">
              +{participants.length - 3} more
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-2 ${
              message.sender.name === 'You' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <img
              src={message.sender.avatar}
              alt={message.sender.name}
              className="w-8 h-8 rounded-full"
            />
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender.name === 'You'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm font-medium mb-1">{message.sender.name}</p>
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <Paperclip className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <Image className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <Mic className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}