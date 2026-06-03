import { useState } from 'react';
import { BookOpen, Search, FileText, HelpCircle, Copy, ExternalLink } from 'lucide-react';

export function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock knowledge base items
  const knowledgeItems = [
    {
      id: '1',
      title: 'Investment Risk Disclosure',
      content: 'All investments carry risk and may lose value. Past performance does not guarantee future results.',
      category: 'Compliance',
      relevanceScore: 95,
      type: 'document' as const
    },
    {
      id: '2',
      title: 'How to explain compound interest',
      content: 'Use the "Rule of 72" - divide 72 by the interest rate to show how long it takes to double money.',
      category: 'Education',
      relevanceScore: 87,
      type: 'faq' as const
    },
    {
      id: '3',
      title: 'Handling Objections Template',
      content: 'Listen -> Acknowledge -> Clarify -> Respond -> Confirm understanding',
      category: 'Sales',
      relevanceScore: 92,
      type: 'template' as const
    },
    {
      id: '4',
      title: 'Market Volatility Explanation',
      content: 'Volatility is normal. Focus on long-term goals and diversification benefits.',
      category: 'Education',
      relevanceScore: 89,
      type: 'procedure' as const
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-3 h-3" />;
      case 'faq': return <HelpCircle className="w-3 h-3" />;
      case 'template': return <Copy className="w-3 h-3" />;
      case 'procedure': return <BookOpen className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Compliance': return 'bg-red-600/20 text-red-300';
      case 'Education': return 'bg-blue-600/20 text-blue-300';
      case 'Sales': return 'bg-green-600/20 text-green-300';
      default: return 'bg-slate-600/20 text-slate-300';
    }
  };

  const filteredItems = knowledgeItems
    .filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="glass-card rounded-2xl p-6 relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-xl">
          <BookOpen className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="text-lg font-black text-white tracking-tight uppercase">Knowledge Base</h3>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search documentation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-xs font-bold uppercase tracking-widest"
        />
      </div>

      {/* Knowledge Items */}
      <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
        {filteredItems.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No knowledge items found</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 border border-white/5 hover:border-white/10 cursor-pointer group/item"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                    {getTypeIcon(item.type)}
                  </div>
                  <h4 className="text-sm font-black text-white truncate group-hover/item:text-blue-400 transition-colors tracking-tight">{item.title}</h4>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => copyToClipboard(item.content)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Copy content"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button className="text-slate-400 hover:text-white transition-colors p-1">
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed mb-2 line-clamp-2">
                {item.content}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-full bg-slate-600 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full"
                      style={{ width: `${item.relevanceScore}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {item.relevanceScore}% match
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="flex flex-wrap gap-2">
          {['Risk Disclosures', 'Sales Scripts', 'FAQs'].map(tag => (
            <button key={tag} className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-white/5 hover:bg-blue-500 hover:text-white text-slate-400 rounded-xl transition-all duration-300 border border-white/5">
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
