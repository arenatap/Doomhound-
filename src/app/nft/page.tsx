"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useChainId, useSwitchChain, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useConnect } from "wagmi";
import { motion } from "framer-motion";
import { DoomShell } from "@/components/doom/doom-shell";
import { Footer } from "@/components/doom/footer";
import { NFT_CONTRACT, DOOMHOUND_TOKEN, BURN_ADDRESS, BURN_AMOUNT, NFT_ABI, DOOMHOUND_ABI } from "@/lib/nft-abi";

const AVAX_CHAIN_ID = 43114;

export default function NFTPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { connect, connectors } = useConnect();
  
  const isWrongChain = isConnected && chainId !== AVAX_CHAIN_ID;
  
  // State
  const [burnTxHash, setBurnTxHash] = useState<string>("");
  const [verifyStatus, setVerifyStatus] = useState<string>("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [nftStats, setNftStats] = useState<any>(null);
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [mintLoading, setMintLoading] = useState(false);

  // Read $DOOMHOUND balance
  const { data: doomBalance } = useReadContract({
    address: DOOMHOUND_TOKEN,
    abi: DOOMHOUND_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read NFT stats
  const { data: totalSupply } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "totalSupply",
  });

  const { data: mintPrice } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "paidMintPrice",
  });

  // Burn $DOOMHOUND - transfer to burn address
  const { writeContract: burnTokens, data: burnTxData } = useWriteContract();

  // Wait for burn tx
  const { isLoading: burnConfirming, isSuccess: burnConfirmed } = useWaitForTransactionReceipt({
    hash: burnTxData,
  });

  // Mint NFT (paid)
  const { writeContract: mintPaid, data: mintTxData } = useWriteContract();

  const { isLoading: mintConfirming, isSuccess: mintConfirmed } = useWaitForTransactionReceipt({
    hash: mintTxData,
  });

  // Fetch NFT stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/nft?action=stats");
      const data = await res.json();
      if (data.gallery) {
        setUserTokens(data.gallery.filter((t: any) => 
          t.owner?.toLowerCase() === address?.toLowerCase()
        ));
      }
      setNftStats(data);
    } catch {}
  }, [address]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Auto-verify burn when confirmed
  useEffect(() => {
    if (burnConfirmed && burnTxData) {
      handleVerifyBurn(burnTxData);
    }
  }, [burnConfirmed, burnTxData]);

  // Verify burn and request NFT
  const handleVerifyBurn = async (txHash: string) => {
    if (!address) return;
    setVerifyLoading(true);
    setVerifyStatus("Verifying burn transaction...");
    try {
      const res = await fetch("/api/nft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_burn",
          wallet: address,
          txHash: txHash,
        }),
      });
      const data = await res.json();
      setVerifyResult(data);
      if (data.minted) {
        setVerifyStatus("Burn verified! NFT minted to your wallet!");
      } else if (data.verified) {
        setVerifyStatus("Burn verified! NFT will be minted by the team shortly.");
      } else {
        setVerifyStatus(data.error || "Verification failed");
      }
      fetchStats();
    } catch (err: any) {
      setVerifyStatus("Error: " + err.message);
    }
    setVerifyLoading(false);
  };

  // Handle burn button
  const handleBurn = () => {
    if (!address || isWrongChain) return;
    setVerifyStatus("");
    setVerifyResult(null);
    burnTokens({
      address: DOOMHOUND_TOKEN,
      abi: DOOMHOUND_ABI,
      functionName: "transfer",
      args: [BURN_ADDRESS, BURN_AMOUNT],
    });
  };

  // Handle paid mint
  const handleMintPaid = () => {
    if (!address || isWrongChain) return;
    setMintLoading(true);
    mintPaid({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: "mintPaid",
      args: [1n],
      value: mintPrice || BigInt("690000000000000000"),
    });
  };

  useEffect(() => {
    if (mintConfirmed || mintTxData) setMintLoading(false);
  }, [mintConfirmed, mintTxData]);

  const doomBalanceFormatted = doomBalance ? (Number(doomBalance) / 1e18).toFixed(0) : "0";
  const hasEnoughDoom = doomBalance && Number(doomBalance) >= Number(BURN_AMOUNT);
  const totalMinted = totalSupply ? Number(totalSupply) : 0;

  return (
    <DoomShell>
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/doomhound-hero.png')" }} />
        <div className="absolute inset-0 bg-black/65" />
        <div className="css-flame bottom-0 z-10">
          <div className="flame-layer" /><div className="flame-layer" /><div className="flame-layer" />
        </div>

        <div className="relative z-10 text-center w-full max-w-4xl mx-auto px-4 sm:px-8 py-20">
          {/* Title */}
          <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}
            className="font-creepster text-5xl sm:text-7xl md:text-8xl text-red-500 animate-glow-red mb-2 leading-none">
            HOUNDS OF
          </motion.h1>
          <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}
            className="font-creepster text-5xl sm:text-7xl md:text-8xl text-red-500 animate-glow-red mb-8 leading-none">
            THE HELL
          </motion.h1>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="flex justify-center gap-3 sm:gap-4 mb-8 flex-wrap">
            <div className="bg-red-950/30 border border-red-500/20 rounded-xl px-4 py-2">
              <div className="font-creepster text-xl sm:text-2xl text-red-400">{totalMinted}/100</div>
              <div className="text-[10px] text-red-300/50 uppercase tracking-wider">Minted</div>
            </div>
            <div className="bg-red-950/30 border border-red-500/20 rounded-xl px-4 py-2">
              <div className="font-creepster text-xl sm:text-2xl text-red-400">0.69</div>
              <div className="text-[10px] text-red-300/50 uppercase tracking-wider">AVAX</div>
            </div>
            <div className="bg-red-950/30 border border-red-500/20 rounded-xl px-4 py-2">
              <div className="font-creepster text-xl sm:text-2xl text-red-400">11M</div>
              <div className="text-[10px] text-red-300/50 uppercase tracking-wider">Burn</div>
            </div>
          </motion.div>

          {/* Connect Wallet */}
          {!isConnected && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }}>
              <button onClick={() => connect({ connector: connectors[0] })}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl text-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all animate-breathing-glow">
                Connect Wallet
              </button>
              <p className="text-gray-500 text-xs mt-3">Connect to mint your Hound</p>
            </motion.div>
          )}

          {/* Wrong Chain */}
          {isWrongChain && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-yellow-900/30 border border-yellow-500/40 rounded-xl p-4 mb-6">
              <p className="text-yellow-400 text-sm font-bold mb-2">Wrong Network</p>
              <button onClick={() => switchChain({ chainId: AVAX_CHAIN_ID })}
                className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-6 rounded-lg text-sm transition-all">
                Switch to Avalanche C-Chain
              </button>
            </motion.div>
          )}

          {/* Connected & Right Chain */}
          {isConnected && !isWrongChain && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>

              {/* Balance */}
              <div className="bg-red-950/20 border border-red-500/15 rounded-xl p-4 mb-6">
                <p className="text-gray-400 text-xs mb-1">Your $DOOMHOUND Balance</p>
                <p className="font-creepster text-2xl text-red-400">
                  {Number(doomBalanceFormatted).toLocaleString()}
                </p>
                {!hasEnoughDoom && doomBalance && (
                  <p className="text-yellow-500 text-xs mt-1">Need 11,000,000 to burn & mint</p>
                )}
              </div>

              {/* Burn & Mint Section */}
              <div className="bg-gradient-to-br from-red-950/40 to-orange-950/20 border border-red-500/30 rounded-xl p-6 mb-6">
                <h3 className="font-creepster text-xl text-red-400 mb-4">Burn & Mint (FREE)</h3>
                <p className="text-gray-400 text-xs mb-4">Burn 11M $DOOMHOUND to receive a FREE HOTH NFT. Auto-minted to your wallet after verification.</p>
                
                <button onClick={handleBurn} disabled={!hasEnoughDoom || burnConfirming}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all ${
                    hasEnoughDoom && !burnConfirming
                      ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}>
                  {burnConfirming ? "Confirming Burn..." : "Burn 11M $DOOMHOUND"}
                </button>

                {burnTxData && !burnConfirmed && (
                  <p className="text-yellow-400 text-xs mt-2 animate-pulse">
                    Transaction sent: {burnTxData.slice(0, 10)}... Waiting for confirmation...
                  </p>
                )}

                {burnConfirmed && !verifyResult && (
                  <p className="text-green-400 text-xs mt-2 animate-pulse">Burn confirmed! Verifying...</p>
                )}

                {verifyLoading && (
                  <p className="text-yellow-400 text-xs mt-2 animate-pulse">{verifyStatus}</p>
                )}

                {verifyResult && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    verifyResult.minted ? "bg-green-900/30 border border-green-500/30 text-green-400" :
                    verifyResult.verified ? "bg-blue-900/30 border border-blue-500/30 text-blue-400" :
                    "bg-red-900/30 border border-red-500/30 text-red-400"
                  }`}>
                    <p className="font-bold">{verifyResult.minted ? "NFT Minted!" : verifyResult.verified ? "Verified!" : "Error"}</p>
                    <p className="text-xs mt-1">{verifyStatus}</p>
                    {verifyResult.mintTxHash && (
                      <a href={`https://snowtrace.io/tx/${verifyResult.mintTxHash}`} target="_blank" className="text-blue-400 text-xs underline mt-1 block">
                        View on Snowtrace
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Paid Mint Section */}
              <div className="bg-gradient-to-br from-purple-950/30 to-red-950/20 border border-purple-500/30 rounded-xl p-6 mb-6">
                <h3 className="font-creepster text-xl text-purple-400 mb-4">Paid Mint</h3>
                <p className="text-gray-400 text-xs mb-4">Mint directly for 0.69 AVAX. Max 2 per wallet.</p>
                
                <button onClick={handleMintPaid} disabled={mintLoading || mintConfirming}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                  {mintConfirming ? "Confirming..." : mintLoading ? "Minting..." : "Mint for 0.69 AVAX"}
                </button>

                {mintConfirmed && mintTxData && (
                  <div className="mt-3 p-2 bg-green-900/30 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-xs font-bold">NFT Minted!</p>
                    <a href={`https://snowtrace.io/tx/${mintTxData}`} target="_blank" className="text-blue-400 text-xs underline">View on Snowtrace</a>
                  </div>
                )}
              </div>

              {/* Your NFTs */}
              {userTokens.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-creepster text-xl text-red-400 mb-4">Your Hounds ({userTokens.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {userTokens.map((token: any) => (
                      <a key={token.tokenId} href={`https://snowtrace.io/token/${NFT_CONTRACT}?a=${token.tokenId}`} target="_blank"
                        className="bg-red-950/20 border border-red-500/20 rounded-lg overflow-hidden hover:border-red-500/50 transition-all group">
                        <img src={token.image} alt={token.name} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
                        <div className="p-2">
                          <p className="text-red-300 text-xs font-bold truncate">{token.name}</p>
                          <p className="text-gray-500 text-[10px]">#{token.tokenId}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Contract Links */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            className="flex justify-center gap-4 mt-6">
            <a href={`https://snowtrace.io/address/${NFT_CONTRACT}`} target="_blank"
              className="text-gray-500 hover:text-red-400 text-xs transition-colors">
              NFT Contract
            </a>
            <a href={`https://snowtrace.io/token/${DOOMHOUND_TOKEN}`} target="_blank"
              className="text-gray-500 hover:text-red-400 text-xs transition-colors">
              $DOOMHOUND Token
            </a>
          </motion.div>
        </div>
      </section>
      <Footer />
    </DoomShell>
  );
}
