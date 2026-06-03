import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { vertexApi, callsApi } from "../../utils/client.tsx";
import { formatBilledMinutesFromSeconds } from '../../utils/billingMinutes';
import { Info, Target, Volume2, BookOpen, User, Phone, Clock, Calendar, CheckCircle, XCircle, FileText, ClipboardList, ArrowRight, ArrowLeft, Play, Pause, ChevronDown, ChevronRight } from 'lucide-react';

// Define the Call interface locally
export interface Call {
    _id: string;
    recording_url: string;
    recording_url_cloudinary?: string;
    duration?: number;
    status: string;
    createdAt: string;
    updatedAt?: string;
    agent: {
        personalInfo: {
            name: string;
        };
    };
    lead?: {
        name: string;
        phone: string;
    };
    ai_call_score?: any;
}

interface CallReport {
    "Agent fluency": { score: number; feedback: string };
    "Sentiment analysis": { score: number; feedback: string };
    "Fraud detection": { score: number; feedback: string };
    "Script adherence"?: { score: number; feedback: string };
    "overall": { score: number; feedback: string };
}

const initialReport: CallReport = {
    "Agent fluency": { score: 0, feedback: '' },
    "Sentiment analysis": { score: 0, feedback: '' },
    "Fraud detection": { score: 0, feedback: '' },
    "overall": { score: 0, feedback: '' }
};

const AccordionHeader = ({ title, isOpen, onClick }: { title: string, isOpen: boolean, onClick: () => void }) => (
    <div 
        className="flex items-center cursor-pointer py-3 text-[#1e1b4b] hover:text-[#3730a3] transition-colors gap-2"
        onClick={onClick}
    >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <h3 className="font-semibold text-sm">{title}</h3>
    </div>
);

function CallReportCard() {
    const location = useLocation();
    const navigate = useNavigate();
    const callPased = location.state?.call; // Retrieve passed call object

    const [call, setCall] = useState<Call | null>(callPased || null);
    const [report, setReport] = useState<CallReport>(callPased?.ai_call_score || initialReport);

    const [transcription, setTranscription] = useState<any[] | string | null>(null);
    const [summary, setSummary] = useState<{ "key-ideas": Array<Record<string, string>> }>({ "key-ideas": [] });
    const [callPostActions, setCallPostActions] = useState<string[]>([]);

    const [loadingReport, setLoadingReport] = useState<boolean>(true);
    const [loadingTranscription, setLoadingTranscription] = useState<boolean>(true);
    const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
    const [loadingPostActions, setLoadingPostActions] = useState<boolean>(true);

    const [errorReport, setErrorReport] = useState<string | null>(null);
    const [errorTranscription, setErrorTranscription] = useState<string | null>(null);
    const [errorSummary, setErrorSummary] = useState<string | null>(null);
    const [errorPostActions, setErrorPostActions] = useState<string | null>(null);

    // Audio Player State
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const [expanded, setExpanded] = useState({
        keyPoints: true,
        transcription: true,
        details: false,
        actions: false,
        scoring: false
    });

    const toggleAccordion = (section: keyof typeof expanded) => {
        setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' • ' + date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
    };

    useEffect(() => {
        if (!call) return; // Ensure the call object exists

        if (call.ai_call_score && Object.keys(call.ai_call_score).length > 0) {
            setReport(call.ai_call_score);
            setLoadingReport(false);
        } else {
            const fetchScoring = async () => {
                try {
                    setLoadingReport(true);
                    const response = await vertexApi.getCallScoring({ file_uri: (call.recording_url_cloudinary) ? call.recording_url_cloudinary : call.recording_url });
                    setReport(response);
                    await callsApi.update(call._id, { ai_call_score: response });
                    setCall({ ...call, ai_call_score: response });
                } catch (err) {
                    setErrorReport("Failed to analyze the call.");
                } finally {
                    setLoadingReport(false);
                }
            };
            fetchScoring();
        }

        const fetchTranscription = async () => {
            try {
                setLoadingTranscription(true);
                const response = await vertexApi.getCallTranscription({ file_uri: (call.recording_url_cloudinary) ? call.recording_url_cloudinary : call.recording_url });
                setTranscription(response.transcription);
            } catch (err) {
                setErrorTranscription("Failed to transcribe the call.");
            } finally {
                setLoadingTranscription(false);
            }
        };

        const fetchSummary = async () => {
            try {
                setLoadingSummary(true);
                const response = await vertexApi.getCallSummary({ file_uri: (call.recording_url_cloudinary) ? call.recording_url_cloudinary : call.recording_url });
                setSummary(response);
            } catch (err) {
                setErrorSummary("Failed to generate call summary.");
            } finally {
                setLoadingSummary(false);
            }
        };

        const fetchCallPostActions = async () => {
            try {
                setLoadingPostActions(true);
                const response = await vertexApi.getCallPostActions({ file_uri: (call.recording_url_cloudinary) ? call.recording_url_cloudinary : call.recording_url });
                setCallPostActions(response.plan_actions);
            } catch (err) {
                setErrorPostActions("Failed to generate call post actions.");
            } finally {
                setLoadingPostActions(false);
            }
        };

        fetchTranscription();
        fetchSummary();
        fetchCallPostActions();
    }, [call]);

    const LoadingSpinner = ({ text }: { text: string }) => (
        <div className="flex flex-col items-center py-4">
            <svg className="animate-spin h-8 w-8 text-[#8b5cf6] mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <p className="text-sm text-gray-500">{text}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FAFAFD] p-6 md:p-10 -m-6 w-[calc(100%+3rem)]">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Calls</span>
            </button>

            {/* Header */}
            <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-[#1e1b4b] tracking-tight">{call?.lead?.name || call?.agent?.personalInfo?.name || 'Unknown'}</h1>
                    <div className="flex items-center text-gray-400 text-sm font-medium">
                        <Clock className="w-4 h-4 mr-1.5" />
                        <span>{formatDate(call?.createdAt)}</span>
                    </div>
                </div>
                
                <div className="flex flex-col items-end">
                    <button 
                        onClick={togglePlay}
                        disabled={!call?.recording_url && !call?.recording_url_cloudinary}
                        className="bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl flex items-center shadow-sm transition-all font-medium"
                    >
                        {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {isPlaying ? 'Pause Audio' : 'Play Audio'}
                    </button>
                    <span className="text-xs text-gray-400 mt-2 font-medium tracking-wide">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <audio 
                        ref={audioRef}
                        src={(call?.recording_url_cloudinary) ? call.recording_url_cloudinary : call?.recording_url} 
                        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                </div>
            </div>

            <h2 className="text-2xl font-bold text-[#1e1b4b] mb-4">Call Analysis</h2>

            <div className="space-y-2">
                {/* Key Points */}
                <div>
                    <AccordionHeader title="Key Points" isOpen={expanded.keyPoints} onClick={() => toggleAccordion('keyPoints')} />
                    {expanded.keyPoints && (
                        <div className="space-y-3 mb-6">
                            {loadingSummary ? <LoadingSpinner text="Generating call summary ..." /> : errorSummary ? <p className="text-red-500 ml-6">{errorSummary}</p> : (
                                summary["key-ideas"]?.length === 0 ? <p className="text-gray-500 ml-6">Unable to generate summary!</p> : (
                                    summary["key-ideas"].map((ideaObj, index) => {
                                        const [idea, details] = Object.entries(ideaObj)[0];
                                        return (
                                            <div key={index} className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] ml-6">
                                                <h4 className="font-semibold text-gray-900 text-[15px] mb-2">{idea}</h4>
                                                <p className="text-gray-500 text-sm leading-relaxed">{details}</p>
                                            </div>
                                        );
                                    })
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Transcription */}
                <div>
                    <AccordionHeader title="Transcription" isOpen={expanded.transcription} onClick={() => toggleAccordion('transcription')} />
                    {expanded.transcription && (
                        <div className="space-y-3 mb-6">
                            {loadingTranscription ? <LoadingSpinner text="Generating call transcription ..." /> : errorTranscription ? <p className="text-red-500 ml-6">{errorTranscription}</p> : (
                                <div className="space-y-3 ml-6">
                                    {Array.isArray(transcription) && transcription.length > 0 ? (
                                        transcription.map((item, idx) => (
                                            <div key={idx} className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-gray-400 text-sm font-medium">{item.timestamp}</span>
                                                    <span className="text-gray-500 text-sm">{item.speaker}</span>
                                                </div>
                                                <p className="text-gray-700 text-[15px] leading-relaxed">{item.text}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 ml-6">{typeof transcription === 'string' ? transcription : 'No transcription available.'}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Follow Up Actions */}
                <div>
                    <AccordionHeader title="Follow Up Actions" isOpen={expanded.actions} onClick={() => toggleAccordion('actions')} />
                    {expanded.actions && (
                        <div className="space-y-3 mb-6 ml-6">
                            {loadingPostActions ? <LoadingSpinner text="Generating call Follow Up Actions ..." /> : errorPostActions ? <p className="text-red-500">{errorPostActions}</p> : (
                                callPostActions.length === 0 ? <p className="text-gray-500">There are no Follow up actions !</p> : (
                                    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                                        <ul className="space-y-4">
                                            {callPostActions.map((action, index) => (
                                                <li key={index} className="flex items-start text-sm">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6] mt-2 mr-3 flex-shrink-0"></div>
                                                    <span className="text-gray-600 leading-relaxed">{action}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Call Scoring Metrics */}
                <div>
                    <AccordionHeader title="Scoring Metrics" isOpen={expanded.scoring} onClick={() => toggleAccordion('scoring')} />
                    {expanded.scoring && (
                        <div className="space-y-3 mb-6 ml-6">
                            {loadingReport ? <LoadingSpinner text="Generating call scoring ..." /> : errorReport ? <p className="text-red-500">{errorReport}</p> : (
                                <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        {Object.entries(report)
                                            .filter(([category]) => category !== "overall")
                                            .map(([category, data]) => (
                                                <div key={category}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-sm font-medium text-gray-700">{category}</label>
                                                        <div className="text-xl font-bold text-gray-900">{data?.score || 0}</div>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                                                        <div
                                                            className={`h-2 rounded-full ${data?.score >= 80 ? "bg-[#10b981]" :
                                                                data?.score >= 60 ? "bg-[#f59e0b]" : "bg-[#ef4444]"
                                                                }`}
                                                            style={{ width: `${data?.score || 0}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500">{data?.feedback || 'No feedback'}</p>
                                                </div>
                                            ))}
                                    </div>

                                    <div className="flex flex-col justify-center items-center bg-[#f8f8fc] rounded-2xl p-8 border border-gray-100">
                                        <h4 className="text-sm font-medium text-gray-500 mb-4">Overall Score</h4>
                                        <div className="text-5xl font-bold tracking-tight text-[#8b5cf6] mb-4">
                                            {report?.overall?.score || 0}%
                                        </div>
                                        <p className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">{report?.overall?.feedback || 'No overall feedback available.'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Call Details */}
                <div>
                    <AccordionHeader title="Call Details" isOpen={expanded.details} onClick={() => toggleAccordion('details')} />
                    {expanded.details && (
                        <div className="space-y-3 mb-6 ml-6">
                            <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-medium">Agent</span>
                                        <div className="flex items-center space-x-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900">{call?.agent?.personalInfo?.name || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-medium">Phone</span>
                                        <div className="flex items-center space-x-2">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900">{call?.lead?.phone || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-medium">Duration</span>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900">
                                              {call?.duration
                                                ? formatBilledMinutesFromSeconds(call.duration)
                                                : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-medium">Status</span>
                                        <div className="flex items-center space-x-2">
                                            {call?.status === 'completed' ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className="text-sm font-medium text-gray-900 capitalize">{call?.status || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-12 text-xs text-gray-400">
                Last updated: {call?.updatedAt ? new Date(call.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })}
            </div>
        </div>
    );
}

export default CallReportCard; 