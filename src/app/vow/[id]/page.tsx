'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/connect';
import { 
  AnchorMode, 
  PostConditionMode, 
  uintCV, 
  boolCV, 
  stringUtf8CV 
} from '@stacks/transactions';
import { motion } from 'framer-motion';
import { getVow, getSpectatorPool, contractDetails, getNetwork } from '@/lib/contract';
import { VOW_TYPES, VOW_STATUS } from '@/lib/types';

export default function VowPage() {
  const { id } = useParams();
  const { doContractCall } = useConnect();
  const [vow, setVow] = useState<any>(null);
  const [pool, setPool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState('');

  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const v = await getVow(Number(id));
      const p = await getSpectatorPool(Number(id));
      setVow(v);
      setPool(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSpectate = async (prediction: boolean) => {
    const amount = prompt('Enter STX amount to bet:');
    if (!amount) return;

    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'spectate',
      functionArgs: [uintCV(id.toString()), boolCV(prediction), uintCV((BigInt(parseFloat(amount) * 1000000)).toString())],
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: () => fetchData(),
    });
  };

  const handleVote = async (success: boolean) => {
    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'vote-on-vow',
      functionArgs: [uintCV(id.toString()), boolCV(success)],
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: () => fetchData(),
    });
  };

  const handleSubmitProof = async () => {
    if (!proofUrl) return;
    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'submit-completion',
      functionArgs: [uintCV(id.toString()), stringUtf8CV(proofUrl)],
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: () => {
        setProofUrl('');
        fetchData();
      },
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-4xl animate-pulse">LOADING VOW DATA...</div>;
  if (!vow) return <div className="min-h-screen flex items-center justify-center font-bold text-4xl">VOW NOT FOUND</div>;

  const isCreator = userData?.profile.stxAddress.mainnet === vow.creator;
  const isRival = vow.rival === userData?.profile.stxAddress.mainnet;

  return (
    <main className="min-h-screen p-4 md:p-12 lg:p-24 max-w-7xl mx-auto">
      <div className="flex gap-4 mb-12">
        <a href="/" className="btn-outline py-2 px-4 text-xs">← BACK TO FEED</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="flex items-center gap-4 mb-4">
              <span className={`status-badge ${
                vow.status === VOW_STATUS.ACTIVE ? 'border-yellow-500 text-yellow-500' :
                vow.status === VOW_STATUS.COMPLETED ? 'border-green-500 text-green-500' :
                vow.status === VOW_STATUS.FAILED ? 'border-red-500 text-red-500' : 'border-blue-400 text-blue-400'
              }`}>
                {vow.status === VOW_STATUS.ACTIVE ? 'ACTIVE' :
                 vow.status === VOW_STATUS.COMPLETED ? 'COMPLETED' :
                 vow.status === VOW_STATUS.FAILED ? 'FAILED' : 'CHALLENGED'}
              </span>
              <h1 className="text-6xl font-bold uppercase tracking-tighter">{vow.title}</h1>
            </div>
            <p className="text-xl opacity-60 leading-relaxed max-w-3xl">{vow.description}</p>
          </section>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="glass-card p-4">
              <div className="text-[10px] opacity-40 uppercase mb-2">STAKE</div>
              <div className="text-2xl font-bold">{Number(vow['stake-amount']) / 1000000} STX</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-[10px] opacity-40 uppercase mb-2">CREATED</div>
              <div className="text-2xl font-bold">#{vow['created-at']}</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-[10px] opacity-40 uppercase mb-2">DEADLINE</div>
              <div className="text-2xl font-bold">#{vow['deadline-block']}</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-[10px] opacity-40 uppercase mb-2">VOTES</div>
              <div className="text-2xl font-bold">{vow['yes-votes']} / {vow['no-votes']}</div>
            </div>
          </section>

          {vow.status === VOW_STATUS.CHALLENGED && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 border-yellow-500/50 bg-yellow-500/5"
            >
              <h3 className="text-3xl font-bold mb-4">COMMUNITY ADJUDICATION</h3>
              <p className="mb-8 opacity-70">The creator has submitted proof of completion. Cast your vote to verify or challenge the claim.</p>
              <div className="flex gap-4">
                <button onClick={() => handleVote(true)} className="flex-1 btn-primary bg-green-500 hover:bg-green-600">VOTE SUCCESS</button>
                <button onClick={() => handleVote(false)} className="flex-1 btn-primary bg-red-500 hover:bg-red-600">VOTE FAILURE</button>
              </div>
            </motion.section>
          )}

          {isCreator && vow.status === VOW_STATUS.ACTIVE && (
            <section className="glass-card p-8 border-white/20">
              <h3 className="text-3xl font-bold mb-4">SUBMIT PROOF</h3>
              <p className="mb-8 opacity-70">Finished your challenge? Provide a URL to proof (Twitter thread, GitHub PR, etc.) to trigger the challenge window.</p>
              <div className="flex gap-4">
                <input 
                  id="proof-url" 
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="flex-grow bg-white/5 border border-white/10 p-3 outline-none focus:border-white transition-colors" 
                  placeholder="https://..." 
                />
                <button onClick={handleSubmitProof} className="btn-primary">SUBMIT</button>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <section className="glass-card p-6">
            <h3 className="text-xl font-bold mb-6 border-b border-white/5 pb-2">SPECTATOR POOL</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-400 font-bold uppercase italic">SUCCESS</span>
                <span className="font-bold">{Number(pool['success-pool']) / 1000000} STX</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-1000"
                  style={{ width: `${(Number(pool['success-pool']) / (Number(pool['success-pool']) + Number(pool['failure-pool']) + 0.000001)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-red-400 font-bold uppercase italic">FAILURE</span>
                <span className="font-bold">{Number(pool['failure-pool']) / 1000000} STX</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <button onClick={() => handleSpectate(true)} className="btn-outline border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white text-xs">BET ON SUCCESS</button>
              <button onClick={() => handleSpectate(false)} className="btn-outline border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-xs">BET ON FAILURE</button>
            </div>
          </section>

          <section className="glass-card p-6">
            <h3 className="text-xl font-bold mb-4 border-b border-white/5 pb-2">PARTIES</h3>
            <div className="space-y-4">
              <div>
                <div className="text-[8px] opacity-40 uppercase">CREATOR</div>
                <div className="text-[10px] font-mono break-all">{vow.creator}</div>
              </div>
              {vow.rival && (
                <div>
                  <div className="text-[8px] opacity-40 uppercase">RIVAL</div>
                  <div className="text-[10px] font-mono break-all">{vow.rival}</div>
                  {!Number(vow['rival-stake']) && isRival && (
                    <button className="w-full btn-primary text-xs mt-2 py-1">ACCEPT CHALLENGE</button>
                  )}
                </div>
              )}
              {vow['cause-wallet'] && (
                <div>
                  <div className="text-[8px] opacity-40 uppercase">BENEFICIARY CAUSE</div>
                  <div className="text-[10px] font-mono break-all">{vow['cause-wallet']}</div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
