'use client';

import { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { SidebarLayout } from '@/components/SidebarLayout';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function DocsPage() {
  const { doOpenAuth } = useConnect();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  const codeSnippet = `
import { openContractCall } from '@stacks/connect';
import { standardPrincipalCV, uintCV, stringUtf8CV } from '@stacks/transactions';

async function createVow() {
  await openContractCall({
    network: 'mainnet',
    contractAddress: 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV',
    contractName: 'deadlock-clar',
    functionName: 'create-vow',
    functionArgs: [
      stringUtf8CV("SHIP BACKEND"), // title
      stringUtf8CV("Write and deploy the API"), // desc
      uintCV(1000000), // stake 1 STX
      uintCV(1000) // deadline block
    ],
    onFinish: data => console.log('Tx:', data),
  });
}
  `.trim();

  return (
    <SidebarLayout activePage="docs">
      <section className="w-full max-w-6xl mt-4 mb-24 z-10 flex flex-col gap-8">
        {/* Top Nav */}
        <nav className="w-full">
          <div className="glass-card p-4 md:p-6 sticky top-4 z-20 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="font-bebas text-2xl tracking-widest text-purple-400 mb-0">DEVELOPER DOCS</h3>
            <ul className="flex flex-wrap justify-center md:justify-end gap-2 font-bold text-xs md:text-sm tracking-widest text-gray-400">
              <li>
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`hover:text-white transition-colors uppercase px-4 py-2 rounded-full ${activeTab === 'overview' ? 'text-white bg-white/10' : ''}`}
                >
                  Overview
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('contracts')}
                  className={`hover:text-white transition-colors uppercase px-4 py-2 rounded-full ${activeTab === 'contracts' ? 'text-white bg-white/10' : ''}`}
                >
                  Contracts
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('integration')}
                  className={`hover:text-white transition-colors uppercase px-4 py-2 rounded-full ${activeTab === 'integration' ? 'text-white bg-white/10' : ''}`}
                >
                  Integration
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Content Area */}
        <div className="w-full">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-5xl font-bebas tracking-wider mb-6">DEADLOCK PROTOCOL</h1>
                <p className="text-gray-300 leading-relaxed text-lg mb-4">
                  Deadlock is a decentralized commitment protocol built on the Stacks blockchain. It enables developers to publicly commit to goals (Vows) by staking STX.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  If the developer completes the Vow before the deadline, they reclaim their STX. If they fail, their stake is either burned (Cause Vow) or claimed by a rival (Rival Vow). Spectators can also bet on the outcome.
                </p>
              </div>
              
              <div className="glass-card p-8 border-t-2 border-purple-500">
                <h3 className="text-2xl font-bebas mb-4">Core Concepts</h3>
                <ul className="space-y-4 text-gray-300 list-disc list-inside">
                  <li><strong>Cause Vow:</strong> The standard vow. Failure results in the stake being burned.</li>
                  <li><strong>Rival Vow:</strong> Open for competition. Another developer can match the stake and try to ship first.</li>
                  <li><strong>Spectator Market:</strong> Community members can stake STX on whether they believe a vow will succeed or fail.</li>
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === 'contracts' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <h1 className="text-5xl font-bebas tracking-wider mb-6">SMART CONTRACTS</h1>
              <p className="text-gray-300 leading-relaxed text-lg mb-8">
                The Deadlock protocol is powered by the <code className="bg-white/10 px-2 py-1 rounded">deadlock-clar</code> smart contract on Stacks mainnet.
              </p>

              <div className="glass-card p-8 border-t-2 border-purple-500 mb-6">
                <h3 className="text-2xl font-bebas mb-2 text-purple-400">create-vow</h3>
                <p className="text-sm text-gray-400 mb-4 font-mono">Parameters: title (string-utf8), description (string-utf8), stake-amount (uint), deadline-block (uint)</p>
                <p className="text-gray-300">Creates a new vow and locks the specified STX amount in the contract escrow. The deadline is specified in absolute Stacks block height.</p>
              </div>

              <div className="glass-card p-8 border-t-2 border-purple-400 mb-6">
                <h3 className="text-2xl font-bebas mb-2 text-purple-300">spectate</h3>
                <p className="text-sm text-gray-400 mb-4 font-mono">Parameters: vow-id (uint), spectate-amount (uint)</p>
                <p className="text-gray-300">Allows a user to place a bet on an existing vow. The staked amount is pooled and distributed to correct predictors upon vow resolution.</p>
              </div>
              
              <div className="glass-card p-8 border-t-2 border-white/20">
                <h3 className="text-2xl font-bebas mb-2 text-white">finalize-challenged-vow</h3>
                <p className="text-sm text-gray-400 mb-4 font-mono">Parameters: vow-id (uint)</p>
                <p className="text-gray-300">Resolves a vow. If the deadline has passed without proof of completion, this triggers the penalty (burn or transfer to rival/spectators).</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'integration' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <h1 className="text-5xl font-bebas tracking-wider mb-6">REACT INTEGRATION</h1>
              <p className="text-gray-300 leading-relaxed text-lg mb-8">
                Integrate Deadlock directly into your React or Next.js applications using <code className="bg-white/10 px-2 py-1 rounded">@stacks/connect</code>.
              </p>

              <div className="glass-card p-8 overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bebas text-xl text-white">Create a Vow (Example)</h3>
                  <span className="text-xs uppercase tracking-widest text-gray-500 border border-white/10 px-2 py-1 rounded">Typescript</span>
                </div>
                <div className="bg-[#050505] p-6 rounded-lg overflow-x-auto border border-white/5">
                  <pre className="text-sm text-green-400 font-mono leading-relaxed">
                    <code>{codeSnippet}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </SidebarLayout>
  );
}
