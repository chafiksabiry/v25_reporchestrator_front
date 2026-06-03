import { useState } from 'react';
import { TimeSlot, Gig } from '../../../types/scheduler';
import { Edit2, Trash2, Layout, FileText, Check, X } from 'lucide-react';

interface SlotActionPanelProps {
    slot: TimeSlot;
    maxHours: number;
    availableGigs: Gig[];
    onUpdate: (updates: Partial<TimeSlot>) => void;
    onClear: () => void;
}

export function SlotActionPanel({ slot, maxHours, availableGigs, onUpdate, onClear }: SlotActionPanelProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [gigId, setGigId] = useState(slot.gigId || '');
    const [notes, setNotes] = useState(slot.notes || '');

    const handleSave = () => {
        onUpdate({
            gigId: gigId || undefined,
            notes: notes || undefined,
            status: gigId ? 'reserved' : 'available'
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setGigId(slot.gigId || '');
        setNotes(slot.notes || '');
        setIsEditing(false);
    };

    if (!isEditing && !slot.gigId) {
        return (
            <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center group hover:bg-white hover:border-blue-200 transition-all duration-300">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Layout className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                </div>
                <p className="text-sm font-bold text-gray-400 mb-4">No gig assigned to this slot</p>
                <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                    Assign Gig
                </button>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className="p-6 bg-white rounded-2xl shadow-xl border border-blue-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Modify Session Details</h3>

                <div className="mb-6">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Target Gig</label>
                    <div className="relative">
                        <select
                            value={gigId}
                            onChange={(e) => setGigId(e.target.value)}
                            className="w-full bg-gray-50 border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-blue-500 focus:border-blue-500 py-3 pl-4 pr-10 appearance-none"
                        >
                            <option value="">Choose a gig...</option>
                            {availableGigs.map(gig => (
                                <option key={gig.id} value={gig.id}>
                                    {gig.name} • {gig.company}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <Layout className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Session Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-gray-50 border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-blue-500 focus:border-blue-500 p-4 min-h-[100px] resize-none"
                        placeholder="Internal guidelines or specific objectives..."
                    />
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                    >
                        <Check className="w-3 h-3 mr-2" />
                        Apply Changes
                    </button>
                    <button
                        onClick={handleCancel}
                        className="px-4 py-3 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center hover:bg-gray-200 transition-all"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>
        );
    }

    const gig = availableGigs.find(p => p.id === slot.gigId);

    return (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200 relative group overflow-hidden transition-all hover:shadow-lg">
            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: gig?.color || '#3b82f6' }} />

            <div className="flex justify-between items-start mb-6">
                <div className="pl-2">
                    <div className="flex items-center mb-1">
                        <div className="p-1 bg-blue-50 rounded-md mr-2">
                            <Layout className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{gig?.company}</span>
                    </div>
                    <h3 className="font-black text-xl text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{gig?.name}</h3>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Edit Details"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClear}
                        className="p-2 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Clear Slot"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {slot.notes ? (
                <div className="p-4 bg-gray-50 rounded-xl mb-6 relative group/note">
                    <FileText className="absolute top-4 right-4 w-4 h-4 text-gray-200 group-hover/note:text-blue-200 transition-colors" />
                    <p className="text-xs font-medium text-gray-600 leading-relaxed pr-8">"{slot.notes}"</p>
                </div>
            ) : (
                <div className="mb-6 h-1 w-full bg-gray-50 rounded-full" />
            )}

            <div className="flex flex-wrap gap-2">
                {gig?.skills.map(skill => (
                    <span key={skill} className="text-[9px] font-black uppercase tracking-tighter px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                        {skill}
                    </span>
                ))}
                {(!gig?.skills || gig.skills.length === 0) && (
                    <span className="text-[9px] font-bold text-gray-400 italic">No specific skills listed</span>
                )}
            </div>
        </div>
    );
}
