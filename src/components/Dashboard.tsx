import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  UserCircle,
  Award,
  CreditCard,
  ShoppingBag,
  PhoneCall,
  Headphones,
  Shield,
  TrendingUp,
  Wallet,
  CheckCircle,
  Clock,
  ArrowRight,
  ListChecks,
  MapPin
} from 'lucide-react';

const phases = [
  {
    id: 1,
    name: 'Sign Up & Verification',
    description: 'Complete your account setup and verify your identity',
    icon: UserPlus,
    path: '/signup',
    status: 'completed',
    actions: [
      'Create your REPS account with email',
      'Verify your email address',
      'Confirm location based on IP Address',
      'Complete identity verification',
      'Set up two-factor authentication'
    ]
  },
  {
    id: 2,
    name: 'Profile Creation',
    description: 'Build your professional profile',
    icon: UserCircle,
    path: '/profile',
    status: 'in-progress',
    actions: [
      'Upload a professional photo',
      'Add your work experience',
      'List your key skills',
      'Set your availability hours',
      'Complete your bio'
    ]
  },
  {
    id: 3,
    name: 'Skills Assessment',
    description: 'Complete tests and get your Bolt Score',
    icon: Award,
    path: '/skills',
    status: 'pending',
    actions: [
      'Take communication assessment',
      'Complete technical evaluation',
      'Pass role-play scenarios',
      'Review REPS best practices',
      'Achieve minimum Bolt Score'
    ]
  },
  {
    id: 4,
    name: 'Subscription Plan',
    description: 'Choose your membership level',
    icon: CreditCard,
    path: '/subscription',
    status: 'pending',
    actions: [
      'Review available plans',
      'Compare plan features',
      'Select subscription tier',
      'Set up payment method',
      'Activate subscription'
    ]
  },
  {
    id: 5,
    name: 'Marketplace Access',
    description: 'Browse and apply for gigs',
    icon: ShoppingBag,
    path: '/marketplace',
    status: 'pending',
    actions: [
      'Complete marketplace orientation',
      'Set up gig preferences',
      'Review available opportunities',
      'Submit first application',
      'Complete profile visibility settings'
    ]
  },
  {
    id: 6,
    name: 'Operations Launch',
    description: 'Start your first gig',
    icon: PhoneCall,
    path: '/operations',
    status: 'pending',
    actions: [
      'Review assigned tasks',
      'Set up communication tools',
      'Complete first client briefing',
      'Schedule your first session',
      'Review performance metrics'
    ]
  },
  {
    id: 7,
    name: 'Support & Training',
    description: 'Access resources and community',
    icon: Headphones,
    path: '/support',
    status: 'pending',
    actions: [
      'Join REPS community',
      'Complete onboarding training',
      'Access support resources',
      'Connect with mentor',
      'Schedule first check-in'
    ]
  },
  {
    id: 8,
    name: 'Quality Control',
    description: 'Monitor your performance',
    icon: Shield,
    path: '/quality',
    status: 'pending',
    actions: [
      'Review quality guidelines',
      'Set up performance tracking',
      'Complete quality checklist',
      'Schedule quality review',
      'Set performance goals'
    ]
  },
  {
    id: 9,
    name: 'Career Growth',
    description: 'Advance your REPS career',
    icon: TrendingUp,
    path: '/career',
    status: 'pending',
    actions: [
      'Review career paths',
      'Set career goals',
      'Join specialization track',
      'Complete advanced training',
      'Plan certification path'
    ]
  },
  {
    id: 10,
    name: 'Wallet & Payments',
    description: 'Manage your earnings',
    icon: Wallet,
    path: '/wallet',
    status: 'pending',
    actions: [
      'Set up payment account',
      'Configure payout preferences',
      'Review payment schedule',
      'Set earnings goals',
      'Enable payment notifications'
    ]
  }
];

function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-2xl font-bold text-gray-900">REPS Onboarding Progress</h2>
        <p className="mt-2 text-sm text-gray-600">Complete all phases to become a certified REP</p>
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        <div className="space-y-8">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            const isLast = index === phases.length - 1;
            const isAvailable = phase.status === 'completed' || phase.status === 'in-progress' || 
              (index > 0 && phases[index - 1].status === 'completed');

            return (
              <div key={phase.id} className="relative">
                <div className={`absolute left-8 top-8 w-4 h-4 -ml-2 rounded-full border-2 ${
                  phase.status === 'completed' ? 'bg-green-500 border-green-500' :
                  phase.status === 'in-progress' ? 'bg-blue-500 border-blue-500' :
                  'bg-white border-gray-300'
                }`}></div>
                <div className="ml-16 relative">
                  <div className={`bg-white rounded-lg shadow-sm p-6 ${
                    phase.status === 'completed' ? 'border-green-100' :
                    phase.status === 'in-progress' ? 'border-blue-100' :
                    'border-gray-100'
                  } border`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`p-3 rounded-full ${
                          phase.status === 'completed' ? 'bg-green-100' :
                          phase.status === 'in-progress' ? 'bg-blue-100' :
                          'bg-gray-100'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            phase.status === 'completed' ? 'text-green-600' :
                            phase.status === 'in-progress' ? 'text-blue-600' :
                            'text-gray-600'
                          }`} />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            Phase {phase.id}: {phase.name}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">{phase.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {phase.status === 'completed' ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            <span className="text-sm font-medium">Completed</span>
                          </div>
                        ) : phase.status === 'in-progress' ? (
                          <div className="flex items-center text-blue-600">
                            <Clock className="w-5 h-5 mr-2" />
                            <span className="text-sm font-medium">In Progress</span>
                          </div>
                        ) : (
                          <Link
                            to={isAvailable ? phase.path : '#'}
                            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                              isAvailable
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            onClick={(e) => !isAvailable && e.preventDefault()}
                          >
                            Start Step
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <ListChecks className="w-4 h-4 mr-2" />
                        Required Actions
                      </h4>
                      <ul className="space-y-2">
                        {phase.actions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-center text-sm text-gray-600">
                            <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                              phase.status === 'completed' ? 'border-green-500 bg-green-500' :
                              phase.status === 'in-progress' && actionIndex === 0 ? 'border-blue-500 bg-blue-500' :
                              'border-gray-300'
                            }`}>
                              {(phase.status === 'completed' || (phase.status === 'in-progress' && actionIndex === 0)) && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900">Your Progress</h3>
        <div className="mt-2 w-full bg-blue-200 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '20%' }}></div>
        </div>
        <p className="mt-2 text-sm text-blue-700">2 of 10 phases completed</p>
      </div>
    </div>
  );
}

export default Dashboard;