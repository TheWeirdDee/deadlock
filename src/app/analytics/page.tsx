'use client';

import { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { Header } from '@/components/Header';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const { doOpenAuth } = useConnect();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);

  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const handleLogin = () => doOpenAuth();
  const handleLogout = () => {
    userSession.signUserOut();
    router.push('/');
  };

  const stats = [
    { label: "TOTAL STX LOCKED", value: "2.8M+", color: "text-purple-400" },
    { label: "ACTIVE VOWS", value: "1,402", color: "text-blue-400" },
    { label: "GLOBAL SUCCESS RATE", value: "68%", color: "text-green-400" },
    { label: "TOTAL SPECTATORS", value: "45K+", color: "text-pink-400" },
  ];

  const recentActivity = [
    { type: "VOW CREATED", user: "SP3D...2DV", amount: "500 STX", time: "2 mins ago", status: "PENDING" },
    { type: "CHALLENGE MET", user: "SP1A...9XY", amount: "1,200 STX", time: "15 mins ago", status: "SETTLED" },
    { type: "SPECTATOR BET", user: "SP9K...4ZM", amount: "50 STX", time: "1 hr ago", status: "ACTIVE" },
    { type: "VOW FAILED", user: "SP2B...8KL", amount: "300 STX", time: "3 hrs ago", status: "BURNED" },
    { type: "VOW CREATED", user: "SP4C...7PQ", amount: "150 STX", time: "5 hrs ago", status: "PENDING" },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-12 lg:p-24 relative overflow-hidden bg-black text-white">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20 mix-blend-screen">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <Header userData={userData} handleLogin={handleLogin} handleLogout={handleLogout} />

      <section className="w-full max-w-6xl mt-8 mb-24 z-10 relative">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold font-bebas mb-4 tracking-wider"
          >
            PROTOCOL <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">ANALYTICS</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto tracking-widest uppercase text-sm"
          >
            Real-time insights into the Deadlock commitment ecosystem.
          </motion.p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * idx }}
              className="glass-card p-6 flex flex-col items-center justify-center text-center hover:-translate-y-2 transition-transform duration-300"
            >
              <h3 className="text-sm text-gray-500 mb-2">{stat.label}</h3>
              <p className={`text-4xl font-bebas tracking-wider ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts / Visuals Section (Mock) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          <div className="glass-card p-8 lg:col-span-2 min-h-[300px] flex flex-col relative overflow-hidden">
            <h3 className="text-xl font-bold mb-6 font-bebas tracking-widest text-white/80">TVL OVER TIME</h3>
            <div className="flex-grow flex items-end justify-between gap-2 opacity-50 px-4">
              {[40, 55, 45, 70, 65, 80, 95, 85, 100].map((height, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                  className="w-full bg-gradient-to-t from-purple-900/50 to-purple-500 rounded-t-sm"
                ></motion.div>
              ))}
            </div>
          </div>
          
          <div className="glass-card p-8 flex flex-col items-center justify-center relative overflow-hidden text-center">
             <h3 className="text-xl font-bold mb-6 font-bebas tracking-widest text-white/80 absolute top-8 left-8">VOW DISTRIBUTION</h3>
             <div className="relative w-48 h-48 mt-8">
                {/* Mock Donut Chart using SVG */}
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#333" strokeWidth="20" />
                  <motion.circle 
                    cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="60"
                    initial={{ strokeDashoffset: 251.2 }} animate={{ strokeDashoffset: 60 }} transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  <motion.circle 
                    cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="210"
                    initial={{ strokeDashoffset: 251.2 }} animate={{ strokeDashoffset: 210 }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-bebas text-white">1.4K</span>
                  <span className="text-[10px] text-gray-500 uppercase">Total Vows</span>
                </div>
             </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="glass-card p-8 overflow-x-auto">
          <h3 className="text-xl font-bold mb-6 font-bebas tracking-widest text-white/80">RECENT PROTOCOL ACTIVITY</h3>
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-widest">
                <th className="pb-4 font-normal">Action</th>
                <th className="pb-4 font-normal">User</th>
                <th className="pb-4 font-normal">Amount</th>
                <th className="pb-4 font-normal">Status</th>
                <th className="pb-4 font-normal text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((activity, idx) => (
                <motion.tr 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (idx * 0.1) }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 font-bold text-sm tracking-widest">{activity.type}</td>
                  <td className="py-4 text-gray-400 font-mono text-sm">{activity.user}</td>
                  <td className="py-4 text-purple-400 font-bold">{activity.amount}</td>
                  <td className="py-4">
                    <span className={`text-[10px] px-2 py-1 rounded border ${
                      activity.status === 'PENDING' ? 'border-yellow-500/50 text-yellow-500' :
                      activity.status === 'SETTLED' ? 'border-green-500/50 text-green-500' :
                      activity.status === 'BURNED' ? 'border-red-500/50 text-red-500' :
                      'border-blue-500/50 text-blue-500'
                    }`}>
                      {activity.status}
                    </span>
                  </td>
                  <td className="py-4 text-right text-gray-500 text-xs">{activity.time}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
