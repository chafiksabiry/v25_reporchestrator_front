import React, { useState, useEffect } from 'react';
import { UserPlus, MapPin, CheckCircle, XCircle, Loader2 } from 'lucide-react';

function SignUp() {
  const [location, setLocation] = useState({
    city: '',
    region: '',
    country: '',
    loading: true,
    verified: false
  });

  useEffect(() => {
    async function getLocation() {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setLocation({
          city: data.city,
          region: data.region,
          country: data.country_name,
          loading: false,
          verified: true
        });
      } catch (error) {
        setLocation(prev => ({
          ...prev,
          loading: false,
          verified: false
        }));
      }
    }
    getLocation();
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center mb-6">
          <UserPlus className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Sign Up & Verification</h2>
        </div>

        {/* Location Verification */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="font-medium text-gray-900">Location Verification</h3>
            </div>
            {location.loading ? (
              <div className="flex items-center text-blue-600">
                <Loader2 className="w-5 h-5 mr-1 animate-spin" />
                <span className="text-sm font-medium">Verifying...</span>
              </div>
            ) : location.verified ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">Verified</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">Unverified</span>
              </div>
            )}
          </div>
          
          {location.loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : location.verified ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Location detected:
              </p>
              <p className="text-sm font-medium text-gray-900">
                {location.city}, {location.region}
              </p>
              <p className="text-sm text-gray-600">
                {location.country}
              </p>
            </div>
          ) : (
            <div className="text-sm text-red-600">
              Unable to verify location. Please ensure you're not using a VPN and try again.
            </div>
          )}
        </div>

        <form className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Create a password"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignUp;