import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const TopBar = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const logoUrl = `${import.meta.env.VITE_FRONT_URL}logo_harx.jpg`;

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border-b border-white/5 px-8 py-5 relative z-50">
      <div className="flex items-center justify-between">
        {/* Logo Harx */}
        <div className="flex items-center">
          <div className="bg-white/90 p-2 rounded-2xl shadow-xl shadow-black/20 border border-white/10 backdrop-blur-md">
            <img 
              src={logoUrl} 
              alt="Harx Logo" 
              className="h-8 w-auto rounded-lg mix-blend-multiply"
              onError={(e) => {
                console.error('Erreur de chargement du logo:', e);
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Bouton de logout */}
        <button
          onClick={handleLogout}
          className="flex items-center bg-white/5 hover:bg-white/10 text-slate-300 font-black uppercase tracking-widest text-[10px] px-6 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300 shadow-xl group"
        >
          <svg 
            className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300 text-harx-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
            />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
};

export default TopBar; 

