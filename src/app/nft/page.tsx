"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useChainId, useSwitchChain, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { DoomShell } from "@/components/doom/doom-shell";
import { Footer } from "@/components/doom/footer";
import { NFT_CONTRACT, DOOMHOUND_TOKEN, BURN_ADDRESS, BURN_AMOUNT, NFT_ABI, DOOMHOUND_ABI } from "@/lib/nft-abi";

const AVAX_CHAIN_ID = 43114;

export default function NFTPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== AVAX_CHAIN_ID;

  // State
  const [verifyStatus, setVerifyStatus] = useState<string>("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [nftStats, setNftStats] = useState<any>(null);
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [allTokens, setAllTokens] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [freeMintLoading, setFreeMintLoading] = useState(false);
  const [freeMintStatus, setFreeMintStatus] = useState<string>("");
  const [mintLoading, setMintLoading] = useState(false);
  const [mintStatus, setMintStatus] = useState<string>("");
  const [walletStatus, setWalletStatus] = useState<any>(null);

  // Read $DOOMHOUND balance
  const { data: doomBalance } = useReadContract({
    address: DOOMHOUND_TOKEN,
    abi: DOOMHOUND_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read NFT total supply
  const { data: totalSupply } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "totalSupply",
  });

  // Read paid mint price from contract
  const { data: mintPrice } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "paidMintPrice",
  });

  // Read on-chain flags
  const { data: freeMintActive } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "freeMintActive",
  });

  const { data: paidMintActive } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "paidMintActive",
  });

  const { data: tokenMintActive } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "tokenMintActive",
  });

  // Read per-wallet mint counters
  const { data: paidMintClaimed } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "paidMintClaimed",
    args: address ? [address] : undefined,
  });

  const { data: nftBalance } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Burn $DOOMHOUND - transfer to burn address
  const { writeContract: burnTokens, data: burnTxData, error: burnError } = useWriteContract();
  const { isLoading: burnConfirming, isSuccess: burnConfirmed } = useWaitForTransactionReceipt({
    hash: burnTxData,
  });

  // Mint NFT (paid)
  const { writeContract: mintPaid, data: mintTxData, error: mintPaidError } = useWriteContract();
  const { isLoading: mintConfirming, isSuccess: mintConfirmed } = useWaitForTransactionReceipt({
    hash: mintTxData,
  });

  // Free mint
  const { writeContract: claimFreeMint, data: freeMintTxData, error: freeMintError } = useWriteContract();
  const { isLoading: freeMintConfirming, isSuccess: freeMintConfirmed } = useWaitForTransactionReceipt({
    hash: freeMintTxData,
  });

  // Handle write errors (wallet rejection, etc.)
  useEffect(() => {
    if (mintPaidError) {
      setMintLoading(false);
      setMintStatus("Error: " + (mintPaidError?.message?.includes("User rejected") ? "Transaction rejected" : mintPaidError?.message?.slice(0, 80) || "Failed"));
    }
  }, [mintPaidError]);

  useEffect(() => {
    if (freeMintError) {
      setFreeMintLoading(false);
      setFreeMintStatus("Error: " + (freeMintError?.message?.includes("User rejected") ? "Transaction rejected" : freeMintError?.message?.slice(0, 80) || "Failed"));
    }
  }, [freeMintError]);

  useEffect(() => {
    if (burnError) {
      setVerifyStatus("Error: " + (burnError?.message?.includes("User rejected") ? "Transaction rejected" : burnError?.message?.slice(0, 80) || "Failed"));
    }
  }, [burnError]);

  // Fetch NFT stats + gallery
  const fetchStats = useCallback(async () => {
    try {
      setGalleryLoading(true);
      const url = address ? `/api/nft?wallet=${address}` : "/api/nft";
      const res = await fetch(url);
      const data = await res.json();
      if (data.gallery && data.gallery.length > 0) {
        setAllTokens(data.gallery);
        if (address) {
          setUserTokens(data.gallery.filter((t: any) =>
            t.owner?.toLowerCase() === address?.toLowerCase()
          ));
        }
      }
      if (data.walletStatus) {
        setWalletStatus(data.walletStatus);
      }
      setNftStats(data);
    } catch (err) {
      console.error("[NFT] fetchStats error:", err);
    } finally {
      setGalleryLoading(false);
    }
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

  // Handle paid mint with proper error handling
  const handleMintPaid = () => {
    if (!address || isWrongChain) return;
    setMintLoading(true);
    setMintStatus("");
    mintPaid({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: "mintPaid",
      args: [1n],
      value: mintPrice || BigInt("690000000000000000"),
    });
  };

  // Paid mint: watch for confirmation
  useEffect(() => {
    if (mintConfirmed && mintTxData) {
      setMintLoading(false);
      setMintStatus("NFT minted successfully!");
      fetchStats();
    }
  }, [mintConfirmed, mintTxData]);

  // Free mint with proper error handling
  const handleFreeMint = async () => {
    if (!address || isWrongChain) return;
    setFreeMintLoading(true);
    setFreeMintStatus("Requesting mint signature...");
    try {
      const res = await fetch("/api/nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const data = await res.json();
      if (data.error) {
        setFreeMintStatus(data.error);
        setFreeMintLoading(false);
        return;
      }
      if (data.isFirstClaim && data.nonce && data.signature) {
        setFreeMintStatus("Confirm in wallet...");
        claimFreeMint({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: "claimFreeMint",
          args: [BigInt(data.nonce), data.signature as `0x${string}`],
        });
      } else if (data.adminMinted || data.alreadyHadNFT) {
        setFreeMintStatus("Your free NFT has been minted!");
        setFreeMintLoading(false);
        fetchStats();
      } else {
        setFreeMintStatus(data.message || "Processing...");
        setFreeMintLoading(false);
        fetchStats();
      }
    } catch (err: any) {
      setFreeMintStatus("Error: " + err.message);
      setFreeMintLoading(false);
    }
  };

  // Confirm free mint after on-chain success
  useEffect(() => {
    if (freeMintConfirmed && freeMintTxData && address) {
      setFreeMintStatus("Free mint confirmed! Updating...");
      fetch("/api/nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, action: "confirm_free_mint" }),
      }).then(() => {
        setFreeMintStatus("Free mint complete!");
        setFreeMintLoading(false);
        fetchStats();
      }).catch(() => {
        setFreeMintLoading(false);
      });
    }
  }, [freeMintConfirmed, freeMintTxData, address]);

  // Computed values
  const doomBalanceFormatted = doomBalance ? (Number(doomBalance) / 1e18).toFixed(0) : "0";
  const hasEnoughDoom = doomBalance && Number(doomBalance) >= Number(BURN_AMOUNT);
  const totalMinted = totalSupply ? Number(totalSupply) : 0;
  const paidClaimed = paidMintClaimed ? Number(paidMintClaimed) : 0;
  const maxPaid = 2;
  const paidMintsLeft = maxPaid - paidClaimed;
  const myNftCount = nftBalance ? Number(nftBalance) : 0;

  return (
    <DoomShell>
      <section className="relative min-h-screen flex flex-col items-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/doomhound-hero.png')" }} />
        <div className="absolute inset-0 bg-black/65" />
        <div className="css-flame bottom-0 z-10">
          <div className="flame-layer" /><div className="flame-layer" /><div className="flame-layer" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 py-20">
          {/* Title — NO framer-motion initial={{opacity:0}} */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="font-creepster text-5xl sm:text-7xl md:text-8xl text-red-500 animate-glow-red mb-2 leading-none">
              HOUNDS OF
            </h1>
            <h1 className="font-creepster text-5xl sm:text-7xl md:text-8xl text-red-500 animate-glow-red mb-6 leading-none">
              THE HELL
            </h1>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              100 unique NFTs on Avalanche. Mint free (whitelist), burn 11M $DOOMHOUND, or pay 0.69 AVAX.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-8 flex-wrap animate-fade-in-delay-1">
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
          </div>

          {/* Connect Wallet */}
          <div className="flex justify-center mb-6 animate-fade-in-delay-2">
            <ConnectButton />
          </div>

          {/* Wrong Chain Warning */}
          {isWrongChain && (
            <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-xl p-4 mb-6 max-w-md mx-auto text-center">
              <p className="text-yellow-400 text-sm font-bold mb-2">Wrong Network</p>
              <button onClick={() => switchChain({ chainId: AVAX_CHAIN_ID })}
                className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-6 rounded-lg text-sm transition-all">
                Switch to Avalanche C-Chain
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* MINTING SECTIONS — Only when connected & right chain */}
          {/* ═══════════════════════════════════════════════ */}
          {isConnected && !isWrongChain && (
            <div className="max-w-lg mx-auto animate-fade-in-delay-2">

              {/* Balance Display */}
              <div className="bg-red-950/20 border border-red-500/15 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-400 text-xs">Your $DOOMHOUND Balance</p>
                    <p className="font-creepster text-2xl text-red-400">
                      {Number(doomBalanceFormatted).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">Your HOTH NFTs</p>
                    <p className="font-creepster text-2xl text-red-400">{myNftCount}</p>
                  </div>
                </div>
                {!hasEnoughDoom && doomBalance && (
                  <p className="text-yellow-500 text-xs mt-1">Need 11,000,000 to burn & mint</p>
                )}
              </div>

              {/* SECTION 1: FREE MINT (Whitelist) */}
              {walletStatus?.whitelisted && !walletStatus?.claimed && (
                <div className="bg-gradient-to-br from-green-950/40 to-emerald-950/20 border border-green-500/30 rounded-xl p-5 mb-4">
                  <h3 className="font-creepster text-xl text-green-400 mb-2">Free Mint (Whitelisted)</h3>
                  <p className="text-gray-400 text-xs mb-1">
                    You are whitelisted for {walletStatus.mintAllowance} free mint{walletStatus.mintAllowance > 1 ? 's' : ''}! {walletStatus.mintsLeft} remaining.
                  </p>
                  {walletStatus.reason && <p className="text-gray-500 text-[10px] mb-3">Reason: {walletStatus.reason}</p>}

                  {freeMintActive ? (
                    <button onClick={handleFreeMint} disabled={freeMintLoading || freeMintConfirming}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] disabled:opacity-50 disabled:cursor-not-allowed">
                      {freeMintConfirming ? "Confirming on-chain..." : freeMintLoading ? "Processing..." : "Claim Free Mint"}
                    </button>
                  ) : (
                    <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-xs">
                      Free mint is not active yet. The team needs to enable it on the contract.
                    </div>
                  )}

                  {freeMintStatus && (
                    <p className={`text-xs mt-2 ${freeMintStatus.includes("Error") || freeMintStatus.includes("not") ? "text-red-400" : "text-green-400"} animate-pulse`}>{freeMintStatus}</p>
                  )}
                </div>
              )}

              {/* Already claimed whitelist info */}
              {walletStatus?.whitelisted && walletStatus?.claimed && (
                <div className="bg-green-950/20 border border-green-500/20 rounded-xl p-4 mb-4">
                  <p className="text-green-400 text-sm font-bold">Whitelist Mint Claimed</p>
                  <p className="text-gray-400 text-xs mt-1">You have claimed all your free mints ({walletStatus.mintClaimed}/{walletStatus.mintAllowance}).</p>
                </div>
              )}

              {/* Not whitelisted info */}
              {walletStatus && !walletStatus?.whitelisted && (
                <div className="bg-gray-900/30 border border-gray-500/20 rounded-xl p-4 mb-4">
                  <p className="text-gray-400 text-sm">Your wallet is not on the whitelist for free mint.</p>
                  <p className="text-gray-500 text-xs mt-1">You can still mint by burning 11M $DOOMHOUND or paying 0.69 AVAX below.</p>
                </div>
              )}

              {/* SECTION 2: BURN & MINT (11M $DOOMHOUND) */}
              <div className="bg-gradient-to-br from-red-950/40 to-orange-950/20 border border-red-500/30 rounded-xl p-5 mb-4">
                <h3 className="font-creepster text-xl text-red-400 mb-2">Burn & Mint (FREE)</h3>
                <p className="text-gray-400 text-xs mb-3">
                  Burn 11,000,000 $DOOMHOUND tokens to receive a FREE HOTH NFT. Auto-minted to your wallet after verification.
                </p>

                {tokenMintActive === false && (
                  <p className="text-yellow-500 text-xs mb-3">Token mint is currently disabled on the contract.</p>
                )}

                <button onClick={handleBurn} disabled={!hasEnoughDoom || burnConfirming}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all ${
                    hasEnoughDoom && !burnConfirming
                      ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}>
                  {burnConfirming ? "Confirming Burn..." : !hasEnoughDoom && doomBalance ? "Need 11M $DOOMHOUND" : "Burn 11M $DOOMHOUND"}
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
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
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

              {/* SECTION 3: PAID MINT (0.69 AVAX) */}
              <div className="bg-gradient-to-br from-purple-950/30 to-red-950/20 border border-purple-500/30 rounded-xl p-5 mb-6">
                <h3 className="font-creepster text-xl text-purple-400 mb-2">Paid Mint (0.69 AVAX)</h3>
                <p className="text-gray-400 text-xs mb-1">
                  Mint directly for 0.69 AVAX. Max {maxPaid} per wallet.
                </p>
                <p className="text-purple-300/60 text-xs mb-3">
                  You have minted {paidClaimed}/{maxPaid} paid NFTs. {paidMintsLeft > 0 ? `${paidMintsLeft} remaining.` : "Limit reached."}
                </p>

                {paidMintActive === false && (
                  <p className="text-yellow-500 text-xs mb-3">Paid mint is currently disabled on the contract.</p>
                )}

                <button
                  onClick={handleMintPaid}
                  disabled={mintLoading || mintConfirming || paidMintsLeft <= 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                  {mintConfirming ? "Confirming..." : mintLoading ? "Minting..." : paidMintsLeft <= 0 ? "Paid Mint Limit Reached" : "Mint for 0.69 AVAX"}
                </button>

                {mintStatus && !mintConfirmed && (
                  <p className={`text-xs mt-2 ${mintStatus.includes("Error") ? "text-red-400" : "text-green-400"}`}>{mintStatus}</p>
                )}

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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            </div>
          )}

          {/* Contract Links */}
          <div className="flex justify-center gap-4 mt-6 mb-10 animate-fade-in-delay-3">
            <a href={`https://snowtrace.io/address/${NFT_CONTRACT}`} target="_blank"
              className="text-gray-500 hover:text-red-400 text-xs transition-colors">
              NFT Contract
            </a>
            <a href={`https://snowtrace.io/token/${DOOMHOUND_TOKEN}`} target="_blank"
              className="text-gray-500 hover:text-red-400 text-xs transition-colors">
              $DOOMHOUND Token
            </a>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GALLERY — Always visible, even without wallet connection */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="mb-10">
            <h2 className="font-creepster text-3xl sm:text-4xl text-red-400 mb-6 text-center">
              The Pack <span className="text-red-500/50">({allTokens.length > 0 ? allTokens.length : totalMinted}/100)</span>
            </h2>

            {/* Loading State */}
            {galleryLoading && allTokens.length === 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                {Array.from({ length: Math.max(totalMinted || 6, 6) }).map((_, i) => (
                  <div key={i} className="rounded-lg overflow-hidden bg-red-950/10 border border-red-500/10 animate-pulse">
                    <div className="w-full aspect-square bg-red-950/30" />
                    <div className="p-1.5">
                      <div className="h-2 bg-red-950/30 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Loaded Gallery */}
            {allTokens.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                {allTokens.map((token: any) => (
                  <a key={token.tokenId} href={`https://snowtrace.io/token/${NFT_CONTRACT}?a=${token.tokenId}`} target="_blank"
                    className={`rounded-lg overflow-hidden transition-all group hover:scale-105 ${
                      token.owner?.toLowerCase() === address?.toLowerCase()
                        ? "border-2 border-red-500/60 bg-red-950/30 shadow-[0_0_12px_rgba(220,38,38,0.3)]"
                        : "border border-red-500/15 bg-red-950/10"
                    }`}>
                    <img src={token.image} alt={token.name} className="w-full aspect-square object-cover" loading="lazy" />
                    <div className="p-1.5">
                      <p className="text-red-300 text-[10px] font-bold truncate">#{token.tokenId}</p>
                      {token.owner?.toLowerCase() === address?.toLowerCase() && (
                        <p className="text-green-400 text-[8px] font-bold">YOURS</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* No tokens yet */}
            {!galleryLoading && allTokens.length === 0 && totalMinted === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500 text-sm">No hounds minted yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </DoomShell>
  );
}
