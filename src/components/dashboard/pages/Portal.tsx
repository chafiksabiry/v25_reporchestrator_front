import React, { useState } from 'react';
import { Phone, MessageSquare, Clock, User, Star, FileText, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export function Portal() {
  const [activeProject, setActiveProject] = useState(null);

  const projects = [
    {
      id: 1,
      client: 'TechCorp Inc.',
      description: 'Technical support for enterprise software customers',
      status: 'Active',
      progress: 65,
      earnings: {
        perCall: '$25',
        total: '$450'
      },
      metrics: {
        completed: 18,
        pending: 7,
        success: '85%'
      },
      nextPayout: '2024-03-25'
    },
    {
      id: 2,
      client: 'E-commerce Solutions',
      description: 'Customer support for online shopping platform',
      status: 'Active',
      progress: 40,
      earnings: {
        perCall: '$20',
        total: '$320'
      },
      metrics: {
        completed: 16,
        pending: 12,
        success: '78%'
      },
      nextPayout: '2024-03-28'
    }
  ];

  const leads = [
    {
      id: 1,
      name: 'Sarah Wilson',
      company: 'Tech Solutions Ltd',
      status: 'New',
      priority: 'High',
      issue: 'Software Configuration',
      lastContact: '2024-03-15'
    },
    {
      id: 2,
      name: 'John Brown',
      company: 'Digital Services Inc',
      status: 'Follow-up',
      priority: 'Medium',
      issue: 'Account Access',
      lastContact: '2024-03-14'
    }
  ];

  const resources = [
    {
      title: 'Product Knowledge Base',
      type: 'Documentation',
      lastUpdated: '2 days ago'
    },
    {
      title: 'Call Scripts Template',
      type: 'Script',
      lastUpdated: '1 week ago'
    },
    {
      title: 'Objection Handling Guide',
      type: 'Guide',
      lastUpdated: '3 days ago'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Portal</h1>
            <p className="text-gray-500">Manage your active projects and leads</p>
          </div>
          <div className="flex space-x-4">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              View Reports
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Start New Call
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project List */}
        <div className="lg:col-span-2 space-y-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{project.client}</h2>
                    <p className="text-sm text-gray-500">{project.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {project.status}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="text-gray-900">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Per Call</p>
                      <p className="font-medium text-gray-900">{project.earnings.perCall}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Earned</p>
                      <p className="font-medium text-gray-900">{project.earnings.total}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Next Payout</p>
                      <p className="font-medium text-gray-900">{project.nextPayout}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-b-xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">{project.metrics.completed}</p>
                    <p className="text-sm text-gray-500">Completed Calls</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">{project.metrics.pending}</p>
                    <p className="text-sm text-gray-500">Pending Calls</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">{project.metrics.success}</p>
                    <p className="text-sm text-gray-500">Success Rate</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Phone className="w-5 h-5 mr-3 text-gray-400" />
                  <span>Start New Call</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-gray-400" />
                  <span>Submit Report</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-3 text-gray-400" />
                  <span>Client Messages</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Resources */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resources</h2>
            <div className="space-y-4">
              {resources.map((resource, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{resource.title}</p>
                    <p className="text-sm text-gray-500">Updated {resource.lastUpdated}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {resource.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-4">Today's Performance</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Calls Completed</span>
                <span className="font-medium">12/15</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Success Rate</span>
                <span className="font-medium">85%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Customer Rating</span>
                <span className="font-medium">4.8/5.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Management */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Lead Management</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Leads
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {leads.map((lead) => (
            <div key={lead.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{lead.name}</h3>
                    <p className="text-sm text-gray-500">{lead.company}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  lead.priority === 'High' ? 'bg-red-100 text-red-700' :
                  lead.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {lead.priority}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium text-gray-900">{lead.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Contact</p>
                  <p className="font-medium text-gray-900">{lead.lastContact}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Contact Lead
                </button>
                <button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}