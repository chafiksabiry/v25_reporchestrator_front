import React from 'react';
import { Video, Play, Square, RotateCcw, Trash2, Calendar, X, Plus, Info, Clock, MapPin, Mail, Phone, Camera, RefreshCw } from 'lucide-react';
import { Industry, Activity } from '../../../../ProfileEditView';

interface EditProfileTabProps {
  profile: any;
  setProfile: (profile: any) => void;
  setModifiedSections: (modified: any) => void;
  
  // Video Recording Props
  showVideoRecorder: boolean;
  recordedVideo: string | null;
  existingVideoDeleted: boolean;
  cameraPermission: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  previewVideoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  recordingTime: number;
  formatTime: (s: number) => string;
  startCamera: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  deleteVideo: () => void;
  setShowDeleteConfirmation: (show: boolean) => void;
  showTimeWarning: boolean;
  videoUploaded: boolean;
  uploadingVideo: boolean;
  uploadProgress: number;
  stream: MediaStream | null;
  
  // Identity Props
  handleProfileChange: (field: string, value: any) => void;
  validationErrors: Record<string, string>;
  renderError: (field: string) => React.ReactNode;
  imagePreview: string | null;
  isPhotoMarkedForDeletion: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  setImageToShow: (img: string | null) => void;
  setShowImageModal: (show: boolean) => void;
  countrySearchTerm: string;
  setCountrySearchTerm: (s: string) => void;
  isCountryDropdownOpen: boolean;
  setIsCountryDropdownOpen: (open: boolean) => void;
  filteredCountries: any[];
  setSelectedCountry: (country: any) => void;
  selectedCountryIndex: number;
  setSelectedCountryIndex: (idx: number) => void;
  checkingCountryMismatch: boolean;
  showLoadingSpinner: boolean;
  countryMismatch: boolean;
}

export const EditProfileTab: React.FC<EditProfileTabProps> = ({
  profile,
  setProfile,
  setModifiedSections,
  showVideoRecorder,
  recordedVideo,
  existingVideoDeleted,
  cameraPermission,
  videoRef,
  previewVideoRef,
  isRecording,
  recordingTime,
  formatTime,
  startCamera,
  startRecording,
  stopRecording,
  deleteVideo,
  setShowDeleteConfirmation,
  showTimeWarning,
  videoUploaded,
  uploadingVideo,
  uploadProgress,
  stream,
  handleProfileChange,
  validationErrors,
  renderError,
  imagePreview,
  isPhotoMarkedForDeletion,
  fileInputRef,
  handleImageChange,
  handleRemoveImage,
  setImageToShow,
  setShowImageModal,
  countrySearchTerm,
  setCountrySearchTerm,
  isCountryDropdownOpen,
  setIsCountryDropdownOpen,
  filteredCountries,
  setSelectedCountry,
  selectedCountryIndex,
  setSelectedCountryIndex,
  checkingCountryMismatch,
  showLoadingSpinner,
  countryMismatch
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Properties Section (Twilio Style) */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-10 items-start">
          {/* Photo management */}
          <div className="relative group shrink-0">
            <div 
              className="w-40 h-40 rounded-[32px] shadow-lg border-4 border-white bg-gray-50 overflow-hidden relative cursor-pointer group-hover:scale-[1.02] transition-all"
              onClick={() => {
                const imageUrl = imagePreview || profile.personalInfo?.photo?.url;
                if (!isPhotoMarkedForDeletion && imageUrl) {
                  setImageToShow(imageUrl);
                  setShowImageModal(true);
                } else {
                  fileInputRef.current?.click();
                }
              }}
            >
              {!isPhotoMarkedForDeletion && (imagePreview || profile.personalInfo?.photo?.url) ? (
                <img 
                  src={imagePreview || profile.personalInfo?.photo?.url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-gray-200 bg-gray-50 uppercase tracking-tighter">
                  {profile.personalInfo?.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                <Camera className="text-white w-10 h-10" />
              </div>
            </div>
            
            {(imagePreview || profile.personalInfo?.photo?.url) && !isPhotoMarkedForDeletion && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                className="absolute -top-3 -right-3 p-3 bg-white text-rose-500 rounded-2xl shadow-xl border border-gray-100 hover:bg-rose-50 transition-colors z-10"
                title="Remove photo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Properties Grid */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Public Properties</h2>
              <div className="px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                Identification Info
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Friendly Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.personalInfo?.name || ''}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-100 rounded-none text-sm font-bold text-gray-900 focus:border-harx-500 transition-all outline-none"
                    placeholder="Enter full name"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Info className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
                {renderError('name')}
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Professional Role</label>
                <input
                  type="text"
                  value={profile.professionalSummary?.currentRole || ''}
                  onChange={(e) => handleProfileChange('currentRole', e.target.value)}
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-100 rounded-none text-sm font-bold text-gray-900 focus:border-harx-500 transition-all outline-none"
                  placeholder="Enter role"
                />
              </div>

              {/* Country */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location / Country</label>
                <div className="relative">
                  <input
                    type="text"
                    value={countrySearchTerm || (profile.personalInfo?.country?.countryName || '')}
                    onChange={(e) => {
                      setCountrySearchTerm(e.target.value);
                      setIsCountryDropdownOpen(true);
                      setSelectedCountryIndex(-1);
                      if (e.target.value === '') {
                        setSelectedCountry('');
                        handleProfileChange('country', '');
                      }
                    }}
                    onFocus={() => setIsCountryDropdownOpen(true)}
                    className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-100 rounded-none text-sm font-bold text-gray-900 focus:border-harx-500 transition-all outline-none"
                    placeholder="Search country..."
                  />
                  <MapPin className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                </div>

                {isCountryDropdownOpen && (
                  <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-48 overflow-auto py-2">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((country, index) => (
                        <button
                          key={country.countryCode}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country.countryCode);
                            setCountrySearchTerm(country.countryName);
                            setIsCountryDropdownOpen(false);
                            handleProfileChange('country', country._id);
                          }}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-xs transition-colors ${
                            index === selectedCountryIndex ? 'bg-harx-50 text-harx-600 font-black' : 'hover:bg-gray-50 font-bold'
                          }`}
                        >
                          <span>{country.countryName}</span>
                          <span className="text-[9px] text-gray-400 uppercase">{country.countryCode}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-xs font-bold text-gray-400 italic">No results</div>
                    )}
                  </div>
                )}
                {renderError('country')}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={profile.personalInfo?.email || ''}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-100 rounded-none text-sm font-bold text-gray-900 focus:border-harx-500 transition-all outline-none"
                    placeholder="email@example.com"
                  />
                  <Mail className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                </div>
                {renderError('email')}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={profile.personalInfo?.phone || ''}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-100 rounded-none text-sm font-bold text-gray-900 focus:border-harx-500 transition-all outline-none"
                    placeholder="+0 (000) 000-0000"
                  />
                  <Phone className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                </div>
                {renderError('phone')}
              </div>
            </div>

            {/* Mismatch warnings */}
            {(countryMismatch?.hasMismatch || checkingCountryMismatch) && (
              <div className="mt-8 flex items-center gap-3 p-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                {checkingCountryMismatch && showLoadingSpinner ? (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                )}
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                  {checkingCountryMismatch ? 'Verifying location accuracy...' : `Location mismatch: Account registered in ${countryMismatch.firstLoginCountry}.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Biography Section */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Professional Biography</h2>
          <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <textarea
          value={profile.professionalSummary?.profileDescription || ''}
          onChange={(e) => {
            setProfile((prev: any) => ({
              ...prev,
              professionalSummary: {
                ...prev.professionalSummary,
                profileDescription: e.target.value
              }
            }));
            setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
          }}
          className="w-full px-6 py-5 bg-gray-50/50 border border-gray-100 rounded-[32px] text-sm font-bold text-gray-900 focus:ring-4 focus:ring-harx-500/10 focus:border-harx-500 transition-all outline-none min-h-[200px] leading-relaxed shadow-inner"
          placeholder="Describe your professional background, key achievements, and what you bring to the table..."
        />
      </div>

      {/* Video Introduction Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Introduction Video</h2>
            <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter italic">Personalize your profile</p>
          </div>
          {!showVideoRecorder && !recordedVideo && profile.personalInfo?.presentationVideo?.url && !existingVideoDeleted && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase italic">Video Live</span>
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 mb-8 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Video className="w-8 h-8 text-harx-400" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Presentation & Persona</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm mt-1">
                  Upload or record a 60-second video. This is your chance to stand out to potential partners.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Clock className="w-3 h-3 text-harx-400" />
                Limit: 10:00 Mins
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Info className="w-3 h-3 text-harx-400" />
                High Quality Preferred
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 blur-3xl w-64 h-64 bg-harx-500 rounded-full"></div>
        </div>

        {/* Existing Video Display */}
        {profile.personalInfo?.presentationVideo?.url && !showVideoRecorder && !recordedVideo && !existingVideoDeleted && (
          <div className="space-y-4 mb-8">
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black group">
              <video controls className="w-full h-full object-cover">
                <source src={profile.personalInfo.presentationVideo.url} type="video/mp4" />
                <source src={profile.personalInfo.presentationVideo.url} type="video/webm" />
              </video>
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={startCamera} className="p-3 bg-white/90 hover:bg-white text-slate-900 rounded-2xl shadow-xl transition-all active:scale-95 group/btn">
                  <RotateCcw className="w-5 h-5 group-hover/btn:rotate-180 transition-transform duration-500" />
                </button>
                <button onClick={() => setShowDeleteConfirmation(true)} className="p-3 bg-rose-500/90 hover:bg-rose-500 text-white rounded-2xl shadow-xl transition-all active:scale-95">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recorder View */}
        {showVideoRecorder && (
          <div className="bg-slate-900 rounded-3xl p-6 mb-8 border border-white/10 shadow-2xl overflow-hidden">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6 group">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              {isRecording && (
                <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  Live Recording
                </div>
              )}
              <div className="absolute top-6 right-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white font-mono text-sm tracking-widest">
                {formatTime(recordingTime)} / 10:00
              </div>
              
              {showTimeWarning && (
                <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center animate-pulse pointer-events-none">
                  <span className="bg-rose-600 text-white px-6 py-2 rounded-full font-black uppercase italic tracking-widest text-xs shadow-2xl">
                    Time Limit Reaching!
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4">
              {!isRecording ? (
                <button onClick={startRecording} disabled={!stream} className="px-10 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-sm"></div>
                  Begin Recording
                </button>
              ) : (
                <button onClick={stopRecording} className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-white/10 transition-all active:scale-95 flex items-center gap-3">
                  <Square className="w-4 h-4 fill-current" />
                  Stop & Save
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recorded Preview View */}
        {recordedVideo && (
          <div className="space-y-6 mb-8">
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black">
              <video ref={previewVideoRef} src={recordedVideo} controls className="w-full h-full object-cover" />
              <button 
                onClick={async () => { deleteVideo(); await startCamera(); }}
                className="absolute top-6 right-6 p-3 bg-white font-black text-slate-900 rounded-2xl shadow-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-[10px] uppercase italic tracking-widest">Retake</span>
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-4 p-6 bg-indigo-50 border border-indigo-100 rounded-3xl">
              <div className="flex items-center gap-3 text-indigo-700 font-black uppercase tracking-widest text-xs italic">
                <Info className="w-5 h-5" />
                Preview Mode - Changes will be saved globally
              </div>
              
              {uploadingVideo && (
                <div className="w-full max-w-md">
                   <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                     <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                   </div>
                   <p className="text-center text-[10px] font-black text-indigo-500 mt-2 uppercase">Uploading: {uploadProgress}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Video State UI */}
        {!showVideoRecorder && !recordedVideo && (!profile.personalInfo?.presentationVideo?.url || existingVideoDeleted) && cameraPermission !== 'denied' && (
          <div className="group border-4 border-dashed border-gray-100 rounded-[40px] p-16 text-center bg-gray-50/50 transition-all hover:bg-white hover:border-harx-200 hover:shadow-xl cursor-pointer" onClick={startCamera}>
            <div className="w-24 h-24 bg-white rounded-3xl mx-auto flex items-center justify-center text-gray-300 shadow-lg mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all">
              <Video className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Record Introduction</h3>
            <p className="text-sm font-bold text-gray-400 mt-3 max-w-xs mx-auto leading-relaxed">
              Bring your profile to life. Representatives with intro videos get 3x more views and higher trust.
            </p>
            <div className="mt-10 inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
              <Play className="w-3 h-3 text-harx-400 fill-current" />
              Access Camera
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
