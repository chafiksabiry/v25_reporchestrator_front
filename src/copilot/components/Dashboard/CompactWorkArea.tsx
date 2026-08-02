import React, { useState } from 'react';

interface WorkItem {
  id: string;
  title: string;
  type: 'call' | 'task' | 'note';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: string;
}

interface CompactWorkAreaProps {
  workItems?: WorkItem[];
  onItemClick?: (itemId: string) => void;
  onItemStatusChange?: (itemId: string, status: WorkItem['status']) => void;
}

export const CompactWorkArea: React.FC<CompactWorkAreaProps> = ({
  workItems = [],
  onItemClick,
  onItemStatusChange
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  const filteredItems = workItems.filter(item => 
    filter === 'all' ? true : item.status === filter
  );

  const getPriorityColor = (priority: WorkItem['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: WorkItem['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: WorkItem['type']) => {
    switch (type) {
      case 'call': return '📞';
      case 'task': return '📋';
      case 'note': return '📝';
      default: return '📄';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Work Area</h2>
        <div className="flex space-x-2">
          {(['all', 'pending', 'in-progress', 'completed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-1 rounded text-sm ${
                filter === filterOption
                  ? 'bg-harx-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No items found
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-white rounded-lg border border-gray-200 hover:border-harx-300 cursor-pointer transition-colors"
              onClick={() => onItemClick?.(item.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-lg">{getTypeIcon(item.type)}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{item.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      {item.dueDate && (
                        <span className="text-xs text-gray-500">
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <select
                  value={item.status}
                  onChange={(e) => onItemStatusChange?.(item.id, e.target.value as WorkItem['status'])}
                  onClick={(e) => e.stopPropagation()}
                  className={`text-xs px-2 py-1 rounded border-0 ${getStatusColor(item.status)}`}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

