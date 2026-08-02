import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  DollarSign,
  Download,
  CreditCard,
  Award,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

function WalletDashboard() {
  const [transactions] = useState([
    {
      id: 1,
      client: 'Client A',
      amount: 250,
      type: 'Calls',
      details: '20 calls completed',
      status: 'completed',
      date: '2024-03-10',
    },
    {
      id: 2,
      client: 'Client B',
      amount: 90,
      type: 'Email',
      details: 'Email campaign',
      status: 'completed',
      date: '2024-03-09',
    },
    {
      id: 3,
      client: 'Referral',
      amount: 88,
      type: 'Bonus',
      details: 'New REP referral',
      status: 'completed',
      date: '2024-03-08',
    },
    {
      id: 4,
      client: 'Client C',
      amount: 48,
      type: 'Calls',
      details: '5 calls',
      status: 'pending',
      date: '2024-03-10',
    },
  ]);

  return (
    <div>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Balance</p>
              <h3 className="text-2xl font-bold text-gray-900">$476.00</h3>
            </div>
            <div className="bg-blue-50 rounded-full p-3">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+12.5% from last week</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <h3 className="text-2xl font-bold text-gray-900">$48.00</h3>
            </div>
            <div className="bg-orange-50 rounded-full p-3">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-gray-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span>1 transaction pending review</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Balance</p>
              <h3 className="text-2xl font-bold text-gray-900">$428.00</h3>
            </div>
            <div className="bg-green-50 rounded-full p-3">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Withdraw Now →
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <button className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
        <div className="min-w-full divide-y divide-gray-200">
          <div className="bg-gray-50 px-6 py-3">
            <div className="grid grid-cols-5 gap-4">
              <div className="text-xs font-medium text-gray-500 uppercase">Date</div>
              <div className="text-xs font-medium text-gray-500 uppercase">Client</div>
              <div className="text-xs font-medium text-gray-500 uppercase">Type</div>
              <div className="text-xs font-medium text-gray-500 uppercase">Amount</div>
              <div className="text-xs font-medium text-gray-500 uppercase">Status</div>
            </div>
          </div>
          <div className="divide-y divide-gray-200 bg-white">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-sm text-gray-900">{transaction.date}</div>
                  <div className="text-sm font-medium text-gray-900">{transaction.client}</div>
                  <div className="text-sm text-gray-500">{transaction.type}</div>
                  <div className="text-sm text-gray-900">${transaction.amount.toFixed(2)}</div>
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievement Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Award className="w-8 h-8" />
            <span className="text-sm opacity-75">March 2024</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Top Performer</h3>
          <p className="text-blue-100">You're in the top 10% of REPS this month!</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 rounded-full p-2">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Progress</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">$500 Club</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">$428 of $500 earned</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 rounded-full p-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Streak</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5 Day Streak</h3>
          <p className="text-sm text-gray-600">Keep it up! 2 more days for bonus.</p>
        </div>
      </div>
    </div>
  );
}

export default WalletDashboard;