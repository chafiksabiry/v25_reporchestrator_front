import React from 'react';
import { Rep } from '../../../types/scheduler';
import { Users } from 'lucide-react';

interface RepSelectorProps {
    reps: Rep[];
    selectedRepId: string;
    onSelectRep: (repId: string) => void;
}

export function RepSelector({ reps, selectedRepId, onSelectRep }: RepSelectorProps) {
    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-800">Select Team Member</h2>
            </div>
            <div className="space-y-2">
                {reps.map((rep) => (
                    <button
                        key={rep.id}
                        onClick={() => onSelectRep(rep.id)}
                        className={`w-full flex items-center p-3 rounded-lg transition-colors ${selectedRepId === rep.id
                                ? 'bg-blue-50 border-blue-500 border'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                    >
                        {rep.avatar ? (
                            <img
                                src={rep.avatar}
                                alt={rep.name}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                {rep.name.charAt(0)}
                            </div>
                        )}
                        <div className="ml-3 text-left">
                            <div className="font-medium text-gray-900">{rep.name}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">
                                {rep.specialties.join(', ')}
                            </div>
                        </div>
                        {selectedRepId === rep.id && (
                            <div className="ml-auto">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
