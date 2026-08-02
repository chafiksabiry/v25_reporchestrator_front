import React, { useState } from 'react';
import {
  MessageSquare,
  Users,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  Award,
  Globe,
  BookOpen,
  Video,
  Plus,
  ChevronRight,
  Brain,
  Target,
  Star,
  Heart,
  Coffee,
  Smile,
  Zap
} from 'lucide-react';
import { ForumPost } from '../ForumPost';
import { EventCard } from '../EventCard';
import { MentorCard } from '../MentorCard';
import { GroupChat } from '../GroupChat';
// import { KnowledgeShare } from '../KnowledgeShare';
import { Poll } from '../Poll';
import { LeaderboardCard } from '../LeaderboardCard';

export function Community() {
  const [activeTab, setActiveTab] = useState('forum');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeWellbeingSection, setActiveWellbeingSection] = useState('support');

  const forumPosts = [
    {
      id: 1,
      title: "Best practices for handling difficult customers",
      author: {
        name: "Sarah Wilson",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        role: "Senior HARX Rep",
      },
      content: "I have been handling customer support for 5 years, and I have learned some valuable techniques for dealing with challenging situations...",
      category: "Best Practices",
      tags: ["customer-service", "communication", "conflict-resolution"],
      stats: {
        replies: 24,
        likes: 45,
        views: 230,
      },
      timeAgo: "2 hours ago",
    },
    {
      id: 2,
      title: "Using AI tools effectively in customer support",
      author: {
        name: "Michael Chen",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        role: "Tech Lead",
      },
      content: "AI tools can significantly improve our efficiency, but it is important to use them correctly. Here are some tips...",
      category: "Technology",
      tags: ["ai-tools", "productivity", "tech-tips"],
      stats: {
        replies: 18,
        likes: 32,
        views: 156,
      },
      timeAgo: "5 hours ago",
    },
  ];

  const events = [
    {
      id: 1,
      title: "Advanced Customer Service Techniques",
      description: "Learn proven strategies for handling complex customer interactions and improving satisfaction rates.",
      type: "webinar",
      date: "Apr 15, 2024",
      time: "10:00 AM",
      duration: "2 hours",
      location: {
        type: "online",
        details: "Zoom Webinar",
      },
      organizer: {
        name: "HARX Training Team",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      },
      attendees: {
        count: 156,
        capacity: 200,
      },
    },
    {
      id: 2,
      title: "AI in Support: Hands-on Workshop",
      description: "Interactive session on leveraging AI tools to enhance customer support efficiency.",
      type: "workshop",
      date: "Apr 20, 2024",
      time: "2:00 PM",
      duration: "3 hours",
      location: {
        type: "online",
        details: "Virtual Workshop Room",
      },
      organizer: {
        name: "Tech Excellence Team",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      },
      attendees: {
        count: 45,
        capacity: 50,
      },
    },
  ];

  const mentors = [
    {
      id: 1,
      name: "Emily Rodriguez",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      role: "Senior Support Specialist",
      expertise: ["Customer Relations", "Crisis Management", "Team Leadership"],
      rating: 4.9,
      reviews: 124,
      availability: {
        nextSlot: "Tomorrow, 2:00 PM",
        timeZone: "PST",
      },
      achievements: ["Top Mentor 2023", "500+ Sessions"],
    },
    {
      id: 2,
      name: "David Kim",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      role: "Technical Support Lead",
      expertise: ["Technical Support", "Product Knowledge", "Process Improvement"],
      rating: 4.8,
      reviews: 98,
      availability: {
        nextSlot: "Today, 4:00 PM",
        timeZone: "EST",
      },
      achievements: ["Tech Expert", "200+ Sessions"],
    },
  ];


  const leaderboardEntries = [
    {
      rank: 1,
      user: {
        name: "Sarah Wilson",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        role: "Senior HARX Rep",
      },
      score: 2450,
      change: 15,
      achievements: ["Top Performer", "Customer Favorite"],
    },
    {
      rank: 2,
      user: {
        name: "Michael Chen",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        role: "Technical Lead",
      },
      score: 2340,
      change: 8,
      achievements: ["Tech Expert"],
    },
    {
      rank: 3,
      user: {
        name: "Emily Rodriguez",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        role: "Support Specialist",
      },
      score: 2180,
      change: 12,
      achievements: ["Rising Star"],
    },
  ];

  const pollQuestion = {
    question: "What feature would you like to see added to the platform next?",
    options: [
      { id: "1", text: "Advanced AI assistance", votes: 145 },
      { id: "2", text: "Mobile app support", votes: 89 },
      { id: "3", text: "Integrated video calls", votes: 123 },
      { id: "4", text: "Enhanced analytics dashboard", votes: 167 },
    ],
    totalVotes: 524,
    hasVoted: false,
  };

  const wellbeingResources = [
    {
      title: "Managing Work-Life Balance",
      description: "Tips and strategies for maintaining a healthy balance while working remotely.",
      icon: Heart,
      type: "Article",
      readTime: "5 min",
    },
    {
      title: "Stress Management Workshop",
      description: "Learn effective techniques for managing work-related stress.",
      icon: Brain,
      type: "Workshop",
      readTime: "45 min",
    },
    {
      title: "Mindfulness for Customer Service",
      description: "Practicing mindfulness to improve focus and reduce burnout.",
      icon: Target,
      type: "Guide",
      readTime: "10 min",
    },
  ];

  const socialGroups = [
    {
      name: "Remote Workers Club",
      members: 234,
      description: "Connect with other remote support professionals.",
      icon: Coffee,
      active: true,
    },
    {
      name: "Wellness Warriors",
      members: 156,
      description: "Share tips and support for maintaining wellness while working from home.",
      icon: Heart,
      active: true,
    },
    {
      name: "Productivity Hackers",
      members: 189,
      description: "Exchange productivity tips and tools.",
      icon: Zap,
      active: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Community Hub</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search community..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64"
            />
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('forum')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'forum'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Discussion Forum</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'events'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Events</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('mentorship')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'mentorship'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Mentorship</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'groups'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Groups</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('wellbeing')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'wellbeing'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5" />
            <span>Well-being</span>
          </div>
        </button>
      </div>

      {activeTab === 'forum' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {forumPosts.map((post) => (
              <ForumPost
                key={post.id}
                {...post}
                onLike={() => {}}
                onReply={() => {}}
                onShare={() => {}}
                onBookmark={() => {}}
              />
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
              <div className="space-y-2">
                {[
                  { id: 'all', label: 'All Topics', icon: Globe },
                  { id: 'best-practices', label: 'Best Practices', icon: Award },
                  { id: 'tech', label: 'Technology', icon: Video },
                  { id: 'growth', label: 'Professional Growth', icon: TrendingUp },
                ].map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg ${
                      activeCategory === category.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <category.icon className="w-4 h-4" />
                      <span>{category.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <Poll
              question={pollQuestion.question}
              options={pollQuestion.options}
              totalVotes={pollQuestion.totalVotes}
              hasVoted={pollQuestion.hasVoted}
              onVote={() => {}}
            />

            <LeaderboardCard
              title="Top Contributors"
              period="This Week"
              entries={leaderboardEntries}
            />
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onRegister={() => {}}
              />
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Categories</h2>
              <div className="space-y-2">
                {['All Events', 'Webinars', 'Workshops', 'Conferences', 'Training'].map((category) => (
                  <button
                    key={category}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
              <h2 className="text-lg font-semibold mb-2">Host an Event</h2>
              <p className="text-blue-100 text-sm">
                Share your knowledge with the community by hosting a virtual event.
              </p>
              <button className="mt-4 w-full bg-white text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mentorship' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {mentors.map((mentor) => (
              <MentorCard
                key={mentor.id}
                mentor={mentor}
                onRequestMentoring={() => {}}
              />
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mentorship Areas</h2>
              <div className="space-y-2">
                {[
                  'Customer Service Excellence',
                  'Technical Support',
                  'Leadership Skills',
                  'Crisis Management',
                  'Process Improvement',
                ].map((area) => (
                  <button
                    key={area}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Become a Mentor</h2>
              <p className="text-sm text-gray-600 mb-4">
                Share your expertise and help others grow in their careers.
              </p>
              <button className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                Apply Now
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <GroupChat onJoinChat={() => {}} />
      )}


      {activeTab === 'wellbeing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setActiveWellbeingSection('support')}
                    className={`px-4 py-2 rounded-lg ${
                      activeWellbeingSection === 'support'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Support Network
                  </button>
                  <button
                    onClick={() => setActiveWellbeingSection('resources')}
                    className={`px-4 py-2 rounded-lg ${
                      activeWellbeingSection === 'resources'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Resources
                  </button>
                  <button
                    onClick={() => setActiveWellbeingSection('social')}
                    className={`px-4 py-2 rounded-lg ${
                      activeWellbeingSection === 'social'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Social Space
                  </button>
                </div>

                {activeWellbeingSection === 'resources' && (
                  <div className="space-y-4">
                    {wellbeingResources.map((resource, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <resource.icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-900">{resource.title}</h3>
                              <span className="text-sm text-gray-500">{resource.readTime}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{resource.description}</p>
                            <span className="mt-2 inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                              {resource.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeWellbeingSection === 'social' && (
                  <div className="space-y-4">
                    {socialGroups.map((group, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <group.icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-900">{group.name}</h3>
                              <span className="text-sm text-gray-500">{group.members} members</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{group.description}</p>
                            <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                              Join Group
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeWellbeingSection === 'support' && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-2">24/7 Support Hotline</h3>
                      <p className="text-purple-100 mb-4">
                        Confidential support available around the clock for all HARX representatives.
                      </p>
                      <button className="bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors">
                        Get Support
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="w-5 h-5 text-green-600" />
                          <h4 className="font-medium text-green-800">Mental Health</h4>
                        </div>
                        <p className="text-sm text-green-700">Access counseling and mental health resources.</p>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Heart className="w-5 h-5 text-blue-600" />
                          <h4 className="font-medium text-blue-800">Wellness Programs</h4>
                        </div>
                        <p className="text-sm text-blue-700">Join wellness activities and programs.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
                <div className="space-y-2">
                  {[
                    { label: 'Schedule a Counseling Session', icon: Calendar },
                    { label: 'Join Meditation Group', icon: Brain },
                    { label: 'Wellness Resources', icon: Heart },
                    { label: 'Emergency Contacts', icon: Star },
                  ].map((item, index) => (
                    <button
                      key={index}
                      className="w-full flex items-center space-x-2 p-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      <item.icon className="w-5 h-5 text-gray-400" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white">
                <h2 className="text-lg font-semibold mb-2">Wellness Challenge</h2>
                <p className="text-blue-100 text-sm mb-4">
                  Join our monthly wellness challenge and earn rewards while improving your well-being.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progress: 65%</span>
                  <div className="w-32 bg-white/20 rounded-full h-2">
                    <div className="bg-white rounded-full h-2 w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}