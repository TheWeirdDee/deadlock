 'use client';

// Docs: Developer docs page (annotation)

import { useState, useEffect } from 'react';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { SidebarLayout } from '@/components/SidebarLayout';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

/**
 * DocsPage component providing developer integration documentation
 * explaining Clarity contract interactions and React bindings.
 */
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
              
              <div className="glass-card p-8 border border-white/10">
                <h3 className="text-2xl font-bebas mb-6 text-white">Core Concepts</h3>
                <div className="space-y-6 text-gray-300">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Cause Vow</h4>
                    <p className="leading-relaxed">
                      The standard commitment mechanism on Deadlock. A developer pledges a specific amount of STX to ensure they complete a stated objective (e.g., shipping a feature) by a predetermined deadline. If they successfully provide proof of completion before the time runs out, their staked STX is safely returned. However, if they fail, the protocol acts as a strict arbiter and the staked STX is permanently burned or sent to a designated public goods wallet, penalizing the developer for missing their goal.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Rival Vow</h4>
                    <p className="leading-relaxed">
                      An adversarial twist on the standard vow. This opens up the commitment to direct competition. Another developer (a "Rival") can challenge the original vow creator by matching their STX stake and attempting to ship the requested feature first. It becomes a race: whoever ships first and provides proof claims the entire combined stake pool. It's a high-stakes, winner-takes-all battle of execution speed and skill.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Spectator Market</h4>
                    <p className="leading-relaxed">
                      Deadlock isn't just for developers—it brings the community into the action. Community members can act as spectators by staking their own STX on the outcome of any active vow. Spectators predict whether the developer will succeed or fail. When the vow is finalized, the losing side's STX is distributed proportionally among the winning side's spectators, creating a prediction market based on developer reputation and execution.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'contracts' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <h1 className="text-5xl font-bebas tracking-wider mb-6">SMART CONTRACTS</h1>
              <p className="text-gray-300 leading-relaxed text-lg mb-8">
                The Deadlock protocol is powered by the <code className="bg-white/10 px-2 py-1 rounded">deadlock-clar</code> smart contract on Stacks mainnet.
              </p>

              <div className="glass-card p-8 border border-white/10 mb-6">
                <h3 className="text-2xl font-bebas mb-2 text-white">create-vow</h3>
                <p className="text-sm text-gray-400 mb-4 font-mono bg-black/40 p-3 rounded-md border border-white/5">
                  Parameters: title (string-utf8), description (string-utf8), stake-amount (uint), deadline-block (uint)
                </p>
                <p className="text-gray-300 leading-relaxed">
                  This is the entry point for the protocol. Calling this function initializes a new vow and safely locks the specified <code className="text-white">stake-amount</code> of STX in the smart contract's escrow. The developer must provide a clear title and description of the task, along with an absolute Stacks block height as the strict deadline. The contract enforces a minimum stake amount (currently 0.002 STX) to prevent spam and ensure commitments carry real weight.
                </p>
              </div>

              <div className="glass-card p-8 border border-white/10 mb-6">
                <h3 className="text-2xl font-bebas mb-2 text-white">spectate</h3>
                <p className="text-sm text-gray-400 mb-4 font-mono bg-black/40 p-3 rounded-md border border-white/5">
                  Parameters: vow-id (uint), prediction (bool), amount (uint)
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Allows third-party users to participate in the prediction market surrounding a specific vow. By calling this function, a spectator stakes their STX on a boolean prediction (<code className="text-white">true</code> for success, <code className="text-white">false</code> for failure). The contract securely pools these bets into "success" and "failure" buckets. Once the vow is settled, the winning pool absorbs the losing pool, and successful predictors can claim their initial stake plus a proportional share of the winnings.
                </p>
              </div>
              
              <div className="glass-card p-8 border border-white/10">
                <h3 className="text-2xl font-bebas mb-2 text-white">finalize-challenged-vow</h3>
                <p className="text-sm text-gray-400 mb-4 font-mono bg-black/40 p-3 rounded-md border border-white/5">
                  Parameters: vow-id (uint)
                </p>
                <p className="text-gray-300 leading-relaxed">
                  The resolution engine of the protocol. This function is called after a vow's deadline has passed or after a community voting challenge has concluded. It calculates the final state of the vow and automatically executes the financial consequences. If the vow succeeded, the creator's stake is refunded. If it failed, this function permanently slashes the stake—either transferring it to the burn address, sending it to a rival, or forwarding it to a designated cause wallet depending on the original vow type.
                </p>
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
