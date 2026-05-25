'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/SidebarLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

export default function AnalyticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All tasks');

  const stats = [
    { label: "Total STX Locked", value: "2.8M+", change: "+41% from last month", color: "text-purple-400" },
    { label: "Total Vows", value: "1,402", change: "+12% from last month", color: "text-blue-400" },
    { label: "Global Success Rate", value: "68%", change: "+5% from last month", color: "text-green-400" },
    { label: "Total Spectators", value: "45K+", change: "+20% from last month", color: "text-pink-400" },
  ];

  const barData = [
    { name: '01 July', vows: 40 },
    { name: '02 July', vows: 65 },
    { name: '03 July', vows: 50 },
    { name: '04 July', vows: 95 },
    { name: '05 July', vows: 30 },
    { name: '06 July', vows: 85 },
    { name: '07 July', vows: 100 },
    { name: '08 July', vows: 80 },
    { name: '09 July', vows: 55 },
    { name: '10 July', vows: 45 },
  ];

  const lineData = [
    { name: '01', value: 400 },
    { name: '02', value: 300 },
    { name: '03', value: 550 },
    { name: '04', value: 450 },
    { name: '05', value: 700 },
    { name: '06', value: 650 },
    { name: '07', value: 900 },
  ];

  const recentActivity = [
    { user: "SP3D...2DV", time: "07/05/2026", amount: "500 STX", action: "VOW CREATED", status: "Pending" },
    { user: "SP1A...9XY", time: "07/05/2026", amount: "1,200 STX", action: "CHALLENGE MET", status: "Completed" },
    { user: "SP9K...4ZM", time: "07/05/2026", amount: "50 STX", action: "SPECTATOR BET", status: "In Progress" },
    { user: "SP2B...8KL", time: "07/05/2026", amount: "300 STX", action: "VOW FAILED", status: "Cancelled" },
    { user: "SP4C...7PQ", time: "07/05/2026", amount: "150 STX", action: "VOW CREATED", status: "Pending" },
  ];

  return (
    <SidebarLayout activePage="analytics">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between shadow-[0_0_30px_rgba(168,85,247,0.2)] mb-8">
        <div>
          <h2 className="text-white font-bebas text-2xl tracking-widest mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Protocol is Live on Mainnet
          </h2>
          <p className="text-white/80 text-sm tracking-wider">Join thousands of developers committing to ship code and earn STX.</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="mt-4 sm:mt-0 px-6 py-2 bg-white text-black font-bold uppercase rounded-md text-xs tracking-widest hover:bg-gray-200 transition-colors">
          Create Vow Now
        </button>
      </div>

      <h2 className="text-2xl font-bebas tracking-widest mb-6">Overview</h2>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xs text-gray-400 uppercase tracking-widest">{stat.label}</h3>
              <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                <span className="text-[10px] opacity-50">#</span>
              </div>
            </div>
            <p className="text-3xl font-bebas tracking-wider text-white mb-2">{stat.value}</p>
            <p className={`text-[10px] ${stat.color} font-bold tracking-widest`}>{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Big Bar Chart */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-1">Vows Created</h3>
              <p className="text-2xl font-bebas tracking-wider text-white">1,525</p>
              <p className="text-[10px] text-green-400 font-bold tracking-widest">+20.1% from last month</p>
            </div>
            <select className="bg-black border border-white/20 text-xs px-2 py-1 rounded text-gray-400 outline-none">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
            </select>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="vows" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Small Line Chart */}
        <div className="glass-card p-6">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Stake Volume</h3>
          <p className="text-2xl font-bebas tracking-wider text-white mb-1">20,462 STX</p>
          <p className="text-[10px] text-green-400 font-bold tracking-widest mb-6">+20.1% from last month</p>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                />
                <Area 
                  type="linear" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  dot={{ r: 4, fill: '#000', stroke: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bebas tracking-widest">Recent Activity</h2>
          <button className="text-xs border border-white/20 px-3 py-1 rounded hover:bg-white/5 transition-colors text-gray-400">View all</button>
        </div>

        <div className="flex gap-6 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          {['All tasks', 'Completed', 'In Progress', 'Pending', 'Cancelled'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-bold tracking-widest uppercase whitespace-nowrap transition-colors ${activeTab === tab ? 'text-purple-400 border-b-2 border-purple-400 pb-2 -mb-[9px]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="text-[10px] text-gray-500 uppercase tracking-widest bg-white/5 rounded-t-lg">
                <th className="p-3 font-normal rounded-tl-lg">User</th>
                <th className="p-3 font-normal">Date</th>
                <th className="p-3 font-normal">Amount</th>
                <th className="p-3 font-normal">Action</th>
                <th className="p-3 font-normal rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((activity, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                  <td className="p-3 font-mono text-gray-300">{activity.user}</td>
                  <td className="p-3 text-gray-500 text-xs">{activity.time}</td>
                  <td className="p-3 font-bold text-white">{activity.amount}</td>
                  <td className="p-3 text-xs tracking-widest text-gray-400">{activity.action}</td>
                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-1 rounded-full flex items-center w-max gap-1 ${
                      activity.status === 'Completed' ? 'bg-green-500/10 text-green-400' :
                      activity.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400' :
                      activity.status === 'Cancelled' ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        activity.status === 'Completed' ? 'bg-green-400' :
                        activity.status === 'In Progress' ? 'bg-blue-400' :
                        activity.status === 'Cancelled' ? 'bg-red-400' :
                        'bg-yellow-400'
                      }`}></span>
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}
