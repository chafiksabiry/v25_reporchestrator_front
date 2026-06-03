import React from 'react';
import { Activity as ActivityIcon, Users, AlertTriangle, Settings, Database, Zap, BarChart, Shield } from 'lucide-react';
import { CallRecords } from '../CallRecords';
import { useTranslation } from 'react-i18next';

export function Operations() {
  const { t } = useTranslation();
  const metrics = [
    {
      title: 'System Health',
      value: '99.9%',
      status: 'Optimal',
      icon: ActivityIcon,
      color: 'green',
    },
    {
      title: 'Active Users',
      value: '1,234',
      status: '+12% this week',
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Pending Issues',
      value: '3',
      status: 'Low Priority',
      icon: AlertTriangle,
      color: 'yellow',
    },
    {
      title: 'Server Load',
      value: '42%',
      status: 'Normal',
      icon: Database,
      color: 'purple',
    },
  ];

  const quickActions = [
    {
      title: 'System Maintenance',
      description: 'Schedule or perform system maintenance',
      icon: Settings,
      action: 'Configure',
    },
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      action: 'Manage',
    },
    {
      title: 'Performance Monitoring',
      description: 'View detailed system performance metrics',
      icon: Zap,
      action: 'View',
    },
    {
      title: 'Security Settings',
      description: 'Configure security policies and access controls',
      icon: Shield,
      action: 'Settings',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('operations.title')}</h1>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
          {t('operations.emergencyShutdown')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`p-2 bg-${metric.color}-50 rounded-lg`}>
                <metric.icon className={`w-6 h-6 text-${metric.color}-600`} />
              </div>
              <span className={`text-sm font-medium text-${metric.color}-600 bg-${metric.color}-50 px-2 py-1 rounded-full`}>
                {metric.status}
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{metric.value}</p>
            <p className="text-sm text-gray-500">{metric.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {quickActions.map((action, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <action.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  {action.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">System Analytics</h2>
            <select className="border border-gray-200 rounded-lg px-3 py-1 text-sm">
              <option>Last 24 hours</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="space-y-4">
            {[
              { label: 'CPU Usage', value: '38%', trend: '+2%' },
              { label: 'Memory Usage', value: '62%', trend: '-5%' },
              { label: 'Network Traffic', value: '1.2 TB', trend: '+15%' },
              { label: 'API Response Time', value: '245ms', trend: '-12%' },
            ].map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <BarChart className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{stat.label}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900">{stat.value}</span>
                  <span className={`text-sm ${
                    stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CallRecords />
    </div>
  );
}