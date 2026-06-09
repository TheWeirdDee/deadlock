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
import { motion, AnimatePresence } from 'framer-motion';
import { getVow, getSpectatorPool, contractDetails, getNetwork, getCurrentBlockHeight } from '@/lib/contract';
import { VOW_TYPES, VOW_STATUS } from '@/lib/types';

const formatUTC = (date: Date) => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

function BurnAnimation() {
  return (
    <div className="relative w-full h-40 flex items-end justify-center overflow-hidden bg-black/40 border border-red-500/20 rounded-xl mb-6">
      <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 via-transparent to-transparent"></div>
      <div className="flex items-end justify-center gap-1 h-32 pb-4">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="w-3 rounded-full bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400"
            initial={{ height: 10 }}
            animate={{
              height: [15, 60 + Math.random() * 40, 15],
              opacity: [0.7, 1, 0.4]
            }}
            transition={{
              duration: 0.8 + Math.random() * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.05
            }}
            style={{
              transformOrigin: "bottom"
            }}
          />
        ))}
      </div>
      <div className="absolute font-bebas text-2xl tracking-widest text-red-500 font-bold bottom-6 animate-pulse">
        STAKE REDUCED TO ASHES
      </div>
    </div>
  );
}

export default function VowPage() {
  const { id } = useParams();
  const { doContractCall } = useConnect();
  const [vow, setVow] = useState<any>(null);
  const [pool, setPool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [simAmount, setSimAmount] = useState<number>(50);
  const [simPrediction, setSimPrediction] = useState<boolean>(true);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [githubData, setGithubData] = useState<any>(null);
  const [githubLoading, setGithubLoading] = useState<boolean>(false);

  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    try {
      if (userSession.isUserSignedIn()) {
        setUserData(userSession.loadUserData());
      }
    } catch (e) {
      console.error('Auth session error, clearing local storage:', e);
      try {
        localStorage.removeItem('blockstack-session');
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('blockstack') || key.startsWith('stacks'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (err) {
        // ignore
      }
    }
    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (vow && vow.proofUrl) {
      parseProofUrl(vow.proofUrl);
    }
  }, [vow]);

  // Live countdown — refresh block height every 60s
  useEffect(() => {
    if (!id) return;
    const refresh = () => getCurrentBlockHeight().then(h => setCurrentBlock(h));
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [id]);

  async function fetchData() {
    try {
      const v = await getVow(Number(id));
      const p = await getSpectatorPool(Number(id));
      setVow(v);
      setPool(p);

      const height = await getCurrentBlockHeight();
      setCurrentBlock(height);
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  }

  const parseProofUrl = async (urlStr: string) => {
    if (!urlStr.includes('github.com')) return;
    try {
      setGithubLoading(true);
      const url = new URL(urlStr);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      if (pathParts.length >= 4) {
        const owner = pathParts[0];
        const repo = pathParts[1];
        const type = pathParts[2];
        const targetId = pathParts[3];

        if (type === 'commit') {
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${targetId}`);
          if (res.ok) {
            const data = await res.json();
            setGithubData({
              type: 'commit',
              message: data.commit?.message,
              author: data.commit?.author?.name,
              avatar: data.author?.avatar_url,
              date: data.commit?.author?.date,
              stats: data.stats,
              htmlUrl: data.html_url
            });
          }
        } else if (type === 'pull') {
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${targetId}`);
          if (res.ok) {
            const data = await res.json();
            setGithubData({
              type: 'pr',
              title: data.title,
              author: data.user?.login,
              avatar: data.user?.avatar_url,
              state: data.state,
              commits: data.commits,
              additions: data.additions,
              deletions: data.deletions,
              changedFiles: data.changed_files,
              htmlUrl: data.html_url
            });
          }
        }
      }
    } catch (e) {
      console.error('Error parsing GitHub PR/Commit URL:', e);
    } finally {
      setGithubLoading(false);
    }
  };

  const handleSpectate = async (prediction: boolean, customAmount?: number) => {
    const amountStr = customAmount !== undefined ? customAmount.toString() : prompt('Enter STX amount to bet:');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'spectate',
      functionArgs: [uintCV(Number(id)), boolCV(prediction), uintCV(Math.round(amount * 1000000))],
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
      functionArgs: [uintCV(Number(id)), boolCV(success)],
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
      functionArgs: [uintCV(Number(id)), stringUtf8CV(proofUrl)],
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: () => {
        setProofUrl('');
        fetchData();
      },
    });
  };

  const handleClaimFailure = async () => {
    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'claim-failure',
      functionArgs: [uintCV(Number(id))],
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: () => fetchData(),
    });
  };

  const handleFinalizeChallengedVow = async () => {
    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'finalize-challenged-vow',
      functionArgs: [uintCV(Number(id))],
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: () => fetchData(),
    });
  };

  const handleAcceptRivalVow = async () => {
    const stakeAmt = Number(vow.stakeAmount || vow['stake-amount']);
    await doContractCall({
      contractAddress: contractDetails.address,
      contractName: contractDetails.name,
      functionName: 'accept-rival-vow',
      functionArgs: [uintCV(Number(id)), uintCV(stakeAmt)],
      network: getNetwork(),
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: () => fetchData(),
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-4xl animate-pulse text-white">LOADING VOW DATA...</div>;
  if (!vow) return <div className="min-h-screen flex items-center justify-center font-bold text-4xl text-white">VOW NOT FOUND</div>;

  const isCreator = userData?.profile?.stxAddress?.mainnet === vow.creator || userData?.profile?.stxAddress?.testnet === vow.creator;
  const isRival = vow.rival === userData?.profile?.stxAddress?.mainnet || vow.rival === userData?.profile?.stxAddress?.testnet;

  // Stacks blocks average ~10 minutes each (600 seconds) — this is an estimate.
  const blocksDelta = Number(vow.deadlineBlock || vow['deadline-block']) - (currentBlock || 0);
  const isExpired = blocksDelta <= 0;
  const challengeEnd = Number(vow.challengeEndBlock || vow['challenge-end-block'] || 0);
  const challengeBlocksDelta = challengeEnd - (currentBlock || 0);
  const isChallengeClosed = currentBlock !== null && challengeEnd > 0 && challengeBlocksDelta <= 0;
  const estimatedSeconds = blocksDelta * 600;
  const estimatedDeadlineDate = new Date(Date.now() + estimatedSeconds * 1000);

  const utcStart = formatUTC(estimatedDeadlineDate);
  const utcEnd = formatUTC(new Date(estimatedDeadlineDate.getTime() + 30 * 60 * 1000));
  const googleCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`DEADLOCK Vow: ${vow.title}`)}&details=${encodeURIComponent(`Vow: ${vow.title}\nDescription: ${vow.description}\nCreator: ${vow.creator}\nStake: ${Number(vow.stakeAmount || vow['stake-amount']) / 1000000} STX`)}&dates=${utcStart}/${utcEnd}`;

  const downloadICS = () => {
    const fileContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `URL:${window.location.href}`,
      `DTSTART:${utcStart}`,
      `DTEND:${utcEnd}`,
      `SUMMARY:DEADLOCK: ${vow.title}`,
      `DESCRIPTION:Vow Description: ${vow.description}\\nCreator: ${vow.creator}\\nStake: ${Number(vow.stakeAmount || vow['stake-amount']) / 1000000} STX`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([fileContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `deadlock-vow-${id}.ics`;
    link.click();
  };

  // Parimutuel ROI: payout = bet + (bet / newWinPool) * losePool
  const successPool = Number(pool?.['success-pool'] || 0) / 1000000;
  const failurePool = Number(pool?.['failure-pool'] || 0) / 1000000;
  
  let roiMultiplier = 1.0;
  let estimatedPayout = simAmount;
  let netProfit = 0;

  if (simPrediction) {
    const newSuccessPool = successPool + simAmount;
    const share = newSuccessPool === 0 ? 0 : (simAmount * failurePool) / newSuccessPool;
    estimatedPayout = simAmount + share;
    netProfit = share;
    roiMultiplier = simAmount === 0 ? 1.0 : estimatedPayout / simAmount;
  } else {
    const newFailurePool = failurePool + simAmount;
    const share = newFailurePool === 0 ? 0 : (simAmount * successPool) / newFailurePool;
    estimatedPayout = simAmount + share;
    netProfit = share;
    roiMultiplier = simAmount === 0 ? 1.0 : estimatedPayout / simAmount;
  }

  const proofUrlStr = vow.proofUrl || vow['proof-url'] || '';
  const isTwitterProof = proofUrlStr.includes('twitter.com') || proofUrlStr.includes('x.com');
  const isYoutubeProof = proofUrlStr.includes('youtube.com') || proofUrlStr.includes('youtu.be');
  
  let parsedTweetId = '';
  if (isTwitterProof) {
    const parts = proofUrlStr.split('/');
    parsedTweetId = parts[parts.length - 1]?.split('?')[0] || '';
  }

  let parsedYoutubeId = '';
  if (isYoutubeProof) {
    if (proofUrlStr.includes('youtu.be/')) {
      parsedYoutubeId = proofUrlStr.split('youtu.be/')[1]?.split('?')[0] || '';
    } else {
      parsedYoutubeId = proofUrlStr.split('v=')[1]?.split('&')[0] || '';
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-12 lg:p-24 max-w-7xl mx-auto bg-black text-white relative font-space">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20 mix-blend-screen">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="flex gap-4 mb-12">
        <a href="/" className="btn-outline py-2.5 px-6 text-xs rounded-full tracking-widest font-bold border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10 transition-all duration-300">
          ← BACK TO FEED
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`status-badge px-3 py-1 font-bold rounded-full text-[10px] tracking-widest bg-black/40 ${
                Number(vow.status) === VOW_STATUS.ACTIVE ? 'border-yellow-500/50 text-yellow-400' :
                Number(vow.status) === VOW_STATUS.COMPLETED ? 'border-green-500/50 text-green-400' :
                Number(vow.status) === VOW_STATUS.FAILED ? 'border-red-500/50 text-red-500' : 'border-blue-400/50 text-blue-400'
              }`}>
                {Number(vow.status) === VOW_STATUS.ACTIVE ? 'ACTIVE' :
                 Number(vow.status) === VOW_STATUS.COMPLETED ? 'COMPLETED' :
                 Number(vow.status) === VOW_STATUS.FAILED ? 'FAILED' : 'CHALLENGED'}
              </span>
              <span className="text-xs font-mono text-gray-500">VOW #{id}</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold uppercase tracking-tight leading-none text-white break-words">{vow.title}</h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-3xl font-space">{vow.description}</p>
          </section>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5 border-white/10 bg-white/5">
              <div className="text-[10px] text-gray-500 tracking-widest font-bold uppercase mb-2">STAKE</div>
              <div className="text-2xl font-bold font-bebas tracking-wide text-white">{Number(vow.stakeAmount || vow['stake-amount']) / 1000000} STX</div>
            </div>
            <div className="glass-card p-5 border-white/10 bg-white/5">
              <div className="text-[10px] text-gray-500 tracking-widest font-bold uppercase mb-2">CREATED AT</div>
              <div className="text-2xl font-bold font-mono text-purple-400">#{Number(vow.createdAt || vow['created-at'])}</div>
            </div>
            <div className="glass-card p-5 border-white/10 bg-white/5 relative group">
              <div className="text-[10px] text-gray-500 tracking-widest font-bold uppercase mb-2">DEADLINE</div>
              <div className="text-2xl font-bold font-mono text-blue-400">#{Number(vow.deadlineBlock || vow['deadline-block'])}</div>
            </div>
            <div className="glass-card p-5 border-white/10 bg-white/5">
              <div className="text-[10px] text-gray-500 tracking-widest font-bold uppercase mb-2">ADJUDICATION</div>
              <div className="text-2xl font-bold font-bebas tracking-wide text-white">{(vow.yesVotes || vow['yes-votes'] || 0)} Y / {(vow.noVotes || vow['no-votes'] || 0)} N</div>
            </div>
          </section>

          <section className="glass-card p-6 border-white/10 bg-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest font-bold">ESTIMATED TIME TO DEADLINE</h3>
              {currentBlock ? (
                <div className="flex flex-col gap-1">
                  <p className={`text-2xl font-bebas font-bold tracking-wide ${isExpired ? 'text-red-500' : 'text-purple-400'}`}>
                    {isExpired 
                      ? `EXPIRED (${Math.abs(blocksDelta)} blocks ago)` 
                      : `${blocksDelta} blocks remaining (~${(estimatedSeconds / 3600).toFixed(1)} hrs)`
                    }
                  </p>
                  <p className="text-xs font-mono text-gray-400">
                    Est: {estimatedDeadlineDate.toLocaleDateString()} at {estimatedDeadlineDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              ) : (
                <div className="w-48 h-6 bg-white/10 rounded animate-pulse"></div>
              )}
            </div>

            {!isExpired && (
              <div className="relative">
                <button 
                  onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                  className="px-5 py-2.5 border border-white/10 hover:border-white/30 text-xs font-bold tracking-widest uppercase rounded-full bg-white/5 hover:bg-white/10 transition-all font-bebas flex items-center gap-2"
                >
                  📅 ADD TO CALENDAR
                </button>
                
                <AnimatePresence>
                  {showCalendarMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCalendarMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-55 overflow-hidden font-space"
                      >
                        <a 
                          href={googleCalUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={() => setShowCalendarMenu(false)}
                          className="block px-4 py-3 text-xs font-bold tracking-wider hover:bg-white/5 transition-colors border-b border-white/5 text-gray-300 hover:text-white"
                        >
                          GOOGLE CALENDAR
                        </a>
                        <button 
                          onClick={() => { downloadICS(); setShowCalendarMenu(false); }}
                          className="w-full text-left block px-4 py-3 text-xs font-bold tracking-wider hover:bg-white/5 transition-colors text-gray-300 hover:text-white"
                        >
                          DOWNLOAD iCAL (.ICS)
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </section>

          {proofUrlStr && (
            <section className="glass-card p-6 border-white/15 bg-white/5 space-y-6">
              <div className="border-b border-white/10 pb-3 flex justify-between items-center">
                <h3 className="text-lg font-bebas tracking-widest text-white uppercase">SUBMITTED PROOF OF COMPLETION</h3>
                <span className="text-[10px] font-mono opacity-50 bg-white/5 border border-white/10 rounded px-2 py-0.5 select-all">{proofUrlStr}</span>
              </div>

              <div className="rounded-xl overflow-hidden bg-black/40 border border-white/5 p-4 flex flex-col justify-center">
                {isTwitterProof && parsedTweetId ? (
                  <div className="w-full min-h-[250px] relative">
                    <iframe
                      src={`https://platform.twitter.com/embed/Tweet.html?id=${parsedTweetId}&theme=dark`}
                      className="w-full min-h-[300px] border-none rounded-xl"
                      title="Tweet Embed"
                    />
                  </div>
                ) : isYoutubeProof && parsedYoutubeId ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${parsedYoutubeId}`}
                      title="YouTube Proof"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full rounded-lg border border-white/10 shadow-lg"
                    />
                  </div>
                ) : githubData ? (
                  <div className="space-y-4 font-space text-left">
                    <div className="flex items-center gap-3">
                      <img src={githubData.avatar} alt="Author Avatar" className="w-10 h-10 rounded-full border border-white/10" />
                      <div>
                        <div className="text-xs font-bold text-white">{githubData.author}</div>
                        <div className="text-[9px] text-gray-500 font-mono">
                          {new Date(githubData.date).toLocaleDateString()} at {new Date(githubData.date).toLocaleTimeString()}
                        </div>
                      </div>
                      <span className="ml-auto text-[9px] font-bold tracking-widest uppercase border border-purple-500/30 text-purple-400 bg-purple-500/5 px-2.5 py-1 rounded-full">
                        GITHUB {githubData.type === 'commit' ? 'COMMIT' : 'PULL REQUEST'}
                      </span>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                      <p className="font-bold text-sm text-gray-200 font-space mb-2">
                        {githubData.type === 'commit' ? githubData.message : githubData.title}
                      </p>
                      {githubData.stats && (
                        <div className="flex gap-4 text-xs font-mono">
                          <span className="text-green-400">+{githubData.stats.additions} additions</span>
                          <span className="text-red-500">-{githubData.stats.deletions} deletions</span>
                        </div>
                      )}
                      {githubData.type === 'pr' && (
                        <div className="flex gap-4 text-xs font-mono">
                          <span className="text-green-400">+{githubData.additions} additions</span>
                          <span className="text-red-500">-{githubData.deletions} deletions</span>
                          <span className="text-gray-400">{githubData.changedFiles} files changed</span>
                        </div>
                      )}
                    </div>
                    
                    <a 
                      href={githubData.htmlUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block text-xs font-bold text-purple-400 hover:text-purple-300 hover:underline tracking-widest font-bebas"
                    >
                      VIEW DETAILED DIFF ON GITHUB →
                    </a>
                  </div>
                ) : githubLoading ? (
                  <div className="py-12 flex justify-center items-center">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mx-auto text-xl">🔗</div>
                    <div>
                      <h4 className="font-bold text-white mb-1 uppercase tracking-widest text-xs">External Proof Link Provided</h4>
                      <p className="text-xs text-gray-500 font-mono select-all truncate mb-4 max-w-md mx-auto">{proofUrlStr}</p>
                    </div>
                    <a 
                      href={proofUrlStr} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-6 py-2 border border-white/20 hover:border-white/50 text-xs font-bold uppercase rounded-full tracking-widest hover:bg-white/5 transition-all inline-block font-bebas"
                    >
                      VISIT PROOF LINK
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* VOW SETTLED banner */}
          {(Number(vow.status) === VOW_STATUS.COMPLETED || Number(vow.status) === VOW_STATUS.FAILED) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-8 border ${
                Number(vow.status) === VOW_STATUS.COMPLETED 
                  ? 'border-green-500/50 bg-green-500/5' 
                  : 'border-red-500/50 bg-red-500/5'
              }`}
            >
              <h3 className="text-3xl font-bold mb-4 font-bebas tracking-wide">
                {Number(vow.status) === VOW_STATUS.COMPLETED ? 'VOW KEPT ✓' : 'VOW SLASHED ✗'}
              </h3>
              
              {Number(vow.status) === VOW_STATUS.FAILED && Number(vow.vowType || vow['vow-type']) === VOW_TYPES.BURN && (
                <BurnAnimation />
              )}

              <p className="opacity-85 text-sm leading-relaxed mb-2">
                {Number(vow.status) === VOW_STATUS.COMPLETED ? (
                  `This vow was successfully kept and validated on-chain. The creator's stake of ${
                    Number(vow.stakeAmount || vow['stake-amount']) / 1000000
                  } STX has been returned.`
                ) : (
                  Number(vow.vowType || vow['vow-type']) === VOW_TYPES.BURN ? (
                    `This vow failed. The creator's stake of ${
                      Number(vow.stakeAmount || vow['stake-amount']) / 1000000
                    } STX was permanently burned (sent to BURN-ADDRESS).`
                  ) : Number(vow.vowType || vow['vow-type']) === VOW_TYPES.RIVAL ? (
                    `This vow failed. The total matching stake pool has been transferred to Rival ${vow.rival}.`
                  ) : (
                    `This vow failed. The creator's stake has been sent to the cause beneficiary address: ${vow.causeWallet}.`
                  )
                )}
              </p>
              {vow.settledAt || vow['settled-at'] ? (
                <p className="text-xs font-mono text-gray-500">
                  Settled at block #{Number(vow.settledAt || vow['settled-at'])}
                </p>
              ) : null}
            </motion.section>
          )}

          {/* ACTIVE STATUS BUT EXPIRED: Trigger Settlement */}
          {Number(vow.status) === VOW_STATUS.ACTIVE && isExpired && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 border-red-500/40 bg-red-950/10"
            >
              <h3 className="text-2xl font-bold mb-3 font-bebas text-red-500 tracking-wider">DEADLINE EXPIRED</h3>
              <p className="mb-6 opacity-75 text-sm leading-relaxed">
                The vow deadline block has elapsed without the creator submitting proof of completion. Any spectator or network participant can now trigger final failure settlement.
              </p>
              <button 
                onClick={handleClaimFailure} 
                className="w-full btn-primary bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-xs tracking-widest"
              >
                TRIGGER ON-CHAIN FAILURE SETTLEMENT (SLASH STAKE)
              </button>
            </motion.section>
          )}

          {/* COMMUNITY ADJUDICATION PANEL */}
          {Number(vow.status) === VOW_STATUS.CHALLENGED && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-8 border ${
                isChallengeClosed ? 'border-purple-500/50 bg-purple-500/5' : 'border-yellow-500/50 bg-yellow-500/5'
              }`}
            >
              <h3 className="text-3xl font-bold mb-2 font-bebas tracking-wider">
                {isChallengeClosed ? 'ADJUDICATION CONCLUDED' : 'COMMUNITY ADJUDICATION'}
              </h3>
              
              {isChallengeClosed ? (
                <>
                  <p className="mb-6 opacity-75 text-sm leading-relaxed">
                    The community adjudication voting window has ended. Cast votes tally: <span className="text-green-400 font-bold">{vow.yesVotes || vow['yes-votes'] || 0} Yes</span> vs <span className="text-red-400 font-bold">{vow.noVotes || vow['no-votes'] || 0} No</span>. Anyone can now finalize the vow and distribute the escrow funds.
                  </p>
                  <button 
                    onClick={handleFinalizeChallengedVow} 
                    className="w-full btn-primary bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 text-xs tracking-widest"
                  >
                    FINALIZE ON-CHAIN SETTLEMENT
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-4 opacity-75 text-sm leading-relaxed">
                    The creator has submitted proof of completion. Cast your vote to verify or challenge this claim. Voting closes in <span className="text-yellow-400 font-bold font-mono">#{challengeBlocksDelta} blocks</span> (approx. {Math.max(0, Math.round((challengeBlocksDelta * 600) / 60) / 10).toFixed(1)} hrs).
                  </p>
                  <div className="flex gap-4">
                    <button onClick={() => handleVote(true)} className="flex-1 btn-primary bg-green-500 hover:bg-green-600 font-bold py-2.5 text-xs">VOTE SUCCESS</button>
                    <button onClick={() => handleVote(false)} className="flex-1 btn-primary bg-red-500 hover:bg-red-600 font-bold py-2.5 text-xs">VOTE FAILURE</button>
                  </div>
                </>
              )}
            </motion.section>
          )}

          {/* ACTIVE STATUS & NOT EXPIRED: SUBMIT PROOF PANEL FOR CREATOR */}
          {Number(vow.status) === VOW_STATUS.ACTIVE && !isExpired && (
            isCreator ? (
              <section className="glass-card p-8 border-white/20">
                <h3 className="text-3xl font-bold mb-4 font-bebas tracking-wider">SUBMIT PROOF</h3>
                <p className="mb-8 opacity-70 text-sm leading-relaxed">
                  Finished your challenge? Provide a URL to proof (Twitter thread, GitHub PR, etc.) to trigger the community challenge window.
                </p>
                <div className="flex gap-4">
                  <input 
                    id="proof-url" 
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    className="flex-grow bg-white/5 border border-white/10 p-3 outline-none focus:border-white transition-colors font-mono text-sm" 
                    placeholder="https://..." 
                  />
                  <button onClick={handleSubmitProof} className="btn-primary font-bebas px-8 text-sm tracking-widest">SUBMIT</button>
                </div>
              </section>
            ) : (
              <section className="glass-card p-8 border-white/10 bg-white/5 opacity-85 text-center">
                <h3 className="text-xl font-bold mb-2 font-bebas text-purple-400 tracking-wider">CHALLENGE IN PROGRESS</h3>
                <p className="text-gray-400 text-sm max-w-lg mx-auto leading-relaxed">
                  Awaiting task completion by the creator before block #{vow.deadlineBlock || vow['deadline-block']}. Spectators can bet on success or failure until the deadline or until proof is submitted.
                </p>
              </section>
            )
          )}
        </div>

        <div className="space-y-8">
          <section className="glass-card p-6 border-white/10 bg-white/5">
            <h3 className="text-xl font-bold mb-6 border-b border-white/5 pb-2">SPECTATOR POOL</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-400 font-bold uppercase italic">SUCCESS</span>
                <span className="font-bold">{successPool.toFixed(4)} STX</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-1000"
                  style={{ width: `${(successPool / (successPool + failurePool + 0.000001)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-red-400 font-bold uppercase italic">FAILURE</span>
                <span className="font-bold">{failurePool.toFixed(4)} STX</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 border-b border-white/5 pb-6 mb-6">
              <button onClick={() => handleSpectate(true)} className="btn-outline border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white text-xs py-2">BET ON SUCCESS</button>
              <button onClick={() => handleSpectate(false)} className="btn-outline border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-xs py-2">BET ON FAILURE</button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs text-gray-400 tracking-widest uppercase font-bold">ROI Calculator</h4>
                <div className="flex border border-white/10 rounded-full overflow-hidden p-0.5">
                  <button 
                    onClick={() => setSimPrediction(true)}
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition-colors ${simPrediction ? 'bg-green-500/20 text-green-400' : 'text-gray-500'}`}
                  >
                    Success
                  </button>
                  <button 
                    onClick={() => setSimPrediction(false)}
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition-colors ${!simPrediction ? 'bg-red-500/20 text-red-400' : 'text-gray-500'}`}
                  >
                    Failure
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between font-mono text-xs text-gray-400">
                  <span>Simulate Bet</span>
                  <span className="text-white font-bold">{simAmount} STX</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="1000" 
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none outline-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="space-y-2.5 bg-black/40 border border-white/5 rounded-lg p-3 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500">ROI Multiplier:</span>
                  <span className="text-green-400 font-bold">{roiMultiplier.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Est. Share Yield:</span>
                  <span className="text-purple-400 font-bold">+{netProfit.toFixed(4)} STX</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2.5">
                  <span className="text-gray-400">Total Projected Payout:</span>
                  <span className="text-white font-bold">{(estimatedPayout).toFixed(4)} STX</span>
                </div>
              </div>

              <button 
                onClick={() => handleSpectate(simPrediction, simAmount)}
                className={`w-full py-2.5 font-bold uppercase tracking-widest text-[10px] rounded-full transition-all active:scale-95 font-bebas border ${
                  simPrediction 
                    ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' 
                    : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                }`}
              >
                PLACE ON-CHAIN {simPrediction ? "SUCCESS" : "FAILURE"} BET OF {simAmount} STX
              </button>
            </div>
          </section>

          <section className="glass-card p-6 border-white/10 bg-white/5">
            <h3 className="text-xl font-bold mb-4 border-b border-white/5 pb-2">PARTIES</h3>
            <div className="space-y-4">
              <div>
                <div className="text-[8px] text-gray-500 tracking-widest uppercase font-bold mb-1">CREATOR</div>
                <div className="text-[10px] font-mono break-all text-gray-300">{vow.creator}</div>
              </div>
              {vow.rival && (
                <div>
                  <div className="text-[8px] text-gray-500 tracking-widest uppercase font-bold mb-1">RIVAL</div>
                  <div className="text-[10px] font-mono break-all text-gray-300">{vow.rival}</div>
                  {!Number(vow.rivalStake || vow['rival-stake']) && isRival && (
                    <button onClick={handleAcceptRivalVow} className="w-full btn-primary text-xs mt-2 py-1.5 bg-blue-500 hover:bg-blue-600">
                      ACCEPT CHALLENGE (STAKE {Number(vow.stakeAmount || vow['stake-amount']) / 1000000} STX)
                    </button>
                  )}
                </div>
              )}
              {vow.causeWallet && (
                <div>
                  <div className="text-[8px] text-gray-500 tracking-widest uppercase font-bold mb-1">BENEFICIARY CAUSE</div>
                  <div className="text-[10px] font-mono break-all text-gray-300">{vow.causeWallet}</div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
