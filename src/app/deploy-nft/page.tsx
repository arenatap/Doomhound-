"use client";

import { useState } from "react";

export default function DeployNFTPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"deploy" | "airdrop" | "config" | "verify">("deploy");
  const [airdropStatus, setAirdropStatus] = useState<any>(null);
  const [configResult, setConfigResult] = useState<any>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  async function handleDeploy() {
    if (!password) {
      setError("Inserisci la password admin");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/deploy-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Deploy failed");
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAirdropStatus() {
    if (!password) {
      setError("Inserisci la password admin");
      return;
    }
    setLoading(true);
    setError("");
    setAirdropStatus(null);

    try {
      const res = await fetch(`/api/airdrop?password=${encodeURIComponent(password)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to get airdrop status");
      } else {
        setAirdropStatus(data);
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAirdropExecute() {
    if (!password) {
      setError("Inserisci la password admin");
      return;
    }
    if (!confirm("Confermi l'airdrop? Verranno mintati NFT a tutti i 13 holder del vecchio contratto.")) {
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Airdrop failed");
      } else {
        setAirdropStatus(data);
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedWhitelist() {
    if (!password) {
      setError("Inserisci la password admin");
      return;
    }
    setLoading(true);
    setError("");
    setConfigResult(null);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "nft_whitelist_seed" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Seed failed");
      } else {
        setConfigResult({ action: "nft_whitelist_seed", ...data });
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!password) {
      setError("Inserisci la password admin");
      return;
    }
    setLoading(true);
    setError("");
    setVerifyResult(null);

    try {
      const res = await fetch("/api/deploy-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "verify_contract" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setVerifyResult({ success: false, error: data.error, details: data.details, suggestion: data.suggestion });
      } else {
        setVerifyResult(data);
      }
    } catch (e: any) {
      setVerifyResult({ success: false, error: e.message || "Network error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSetConfig(action: string) {
    if (!password) {
      setError("Inserisci la password admin");
      return;
    }
    setLoading(true);
    setError("");
    setConfigResult(null);

    try {
      const res = await fetch("/api/deploy-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Config failed");
      } else {
        setConfigResult({ action, ...data });
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  const tabStyle = (active: boolean) => ({
    padding: "10px 16px",
    background: active ? "#dc2626" : "#1a1a1a",
    color: active ? "#fff" : "#999",
    border: `1px solid ${active ? "#dc2626" : "#333"}`,
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? "bold" : "normal",
    fontFamily: "monospace" as const,
  });

  const buttonStyle = (color: string = "#dc2626") => ({
    width: "100%",
    padding: "12px",
    background: loading ? "#555" : color,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold" as const,
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "monospace" as const,
    marginBottom: "8px",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#fff",
      fontFamily: "monospace",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <h1 style={{ color: "#dc2626", fontSize: "22px", marginBottom: "8px" }}>
        🔥 HOTH NFT ADMIN
      </h1>
      <p style={{ color: "#999", fontSize: "12px", marginBottom: "16px", textAlign: "center" }}>
        Deploy, Airdrop & Configure new DoomhoundNFT contract
      </p>

      {/* Password field - shared */}
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "8px",
        padding: "16px",
        width: "100%",
        maxWidth: "420px",
        marginBottom: "12px",
      }}>
        <label style={{ color: "#999", fontSize: "11px", display: "block", marginBottom: "4px" }}>
          ADMIN PASSWORD
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password..."
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#0a0a0a",
            border: "1px solid #444",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "14px",
            fontFamily: "monospace",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", maxWidth: "420px", width: "100%" }}>
        <button style={tabStyle(activeTab === "deploy")} onClick={() => setActiveTab("deploy")}>
          🚀 Deploy
        </button>
        <button style={tabStyle(activeTab === "airdrop")} onClick={() => setActiveTab("airdrop")}>
          🎁 Airdrop
        </button>
        <button style={tabStyle(activeTab === "config")} onClick={() => setActiveTab("config")}>
          ⚙️ Config
        </button>
        <button style={tabStyle(activeTab === "verify")} onClick={() => setActiveTab("verify")}>
          🔍 Verify
        </button>
      </div>

      <div style={{
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "8px",
        padding: "20px",
        width: "100%",
        maxWidth: "420px",
      }}>

        {/* DEPLOY TAB */}
        {activeTab === "deploy" && (
          <>
            <div style={{ marginBottom: "16px", fontSize: "12px", color: "#777" }}>
              <div><b style={{ color: "#aaa" }}>Owner:</b> 0xeed2...a4c9</div>
              <div><b style={{ color: "#aaa" }}>Signer:</b> 0xe0a3...3bab</div>
              <div><b style={{ color: "#aaa" }}>Network:</b> Avalanche C-Chain</div>
              <div><b style={{ color: "#aaa" }}>Supply:</b> 100</div>
              <div><b style={{ color: "#aaa" }}>Price:</b> 0.69 AVAX | Burn: 11M $DOOMHOUND</div>
            </div>
            <button onClick={handleDeploy} disabled={loading} style={buttonStyle()}>
              {loading ? "⏳ DEPLOYING..." : "🚀 DEPLOY CONTRACT"}
            </button>
            {result && (
              <div style={{
                marginTop: "12px", padding: "12px", background: "#0a2a0a",
                border: "1px solid #22c55e", borderRadius: "6px", fontSize: "12px", wordBreak: "break-all",
              }}>
                <div style={{ color: "#22c55e", fontWeight: "bold", marginBottom: "6px" }}>✅ DEPLOYED!</div>
                <div style={{ color: "#4ade80", marginBottom: "4px" }}>{result.contractAddress}</div>
                <div style={{ color: "#aaa" }}>TX: <a href={result.snowtrace} target="_blank" style={{ color: "#60a5fa" }}>Snowtrace</a></div>
                <div style={{ color: "#aaa" }}>Balance: {result.balanceAvax} AVAX</div>
              </div>
            )}
          </>
        )}

        {/* AIRDROP TAB */}
        {activeTab === "airdrop" && (
          <>
            <div style={{ marginBottom: "16px", fontSize: "12px", color: "#777" }}>
              <div style={{ color: "#fbbf24" }}>⚠️ Airdrop 36 NFTs with SAME token IDs to 13 holders from old hacked contract</div>
              <div style={{ color: "#60a5fa", marginTop: "4px", fontSize: "10px" }}>Uses adminMintTokenBatch for exact token ID replication</div>
              <div style={{ marginTop: "8px" }}>
                <b style={{ color: "#aaa" }}>Holders:</b>
                <div style={{ maxHeight: "140px", overflow: "auto", marginTop: "4px", fontSize: "11px" }}>
                  {[
                    "Florida_Man__ (13 NFTs: #3-13,#17,#33)",
                    "toff_arena (5 NFTs: #1,#2,#22-24)",
                    "702Philip (3 NFTs: #19,#20,#36)",
                    "onesimu_s (3 NFTs: #14,#15,#35)",
                    "Hegi____ (2 NFTs: #27,#30)",
                    "redtreader (2 NFTs: #16,#21)",
                    "LadyRedPepe (2 NFTs: #31,#32)",
                    "iiMIDO_ (1 NFT: #34)",
                    "KeezerDrumz (1 NFT: #18)",
                    "SarveshD1981 (1 NFT: #25)",
                    "yunusay (1 NFT: #26)",
                    "SlowPete_ (1 NFT: #28)",
                    "AiDog_NFT (1 NFT: #29)",
                  ].map((h, i) => (
                    <div key={i} style={{ color: "#999", padding: "2px 0" }}>{h}</div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAirdropStatus} disabled={loading} style={buttonStyle("#2563eb")}>
              {loading ? "⏳ CHECKING..." : "📊 CHECK AIRDROP STATUS"}
            </button>
            <button onClick={handleAirdropExecute} disabled={loading} style={buttonStyle()}>
              {loading ? "⏳ AIRDROPPING..." : "🎁 EXECUTE AIRDROP (36 NFTs)"}
            </button>
            {airdropStatus && (
              <div style={{
                marginTop: "12px", padding: "12px", background: "#0a2a0a",
                border: "1px solid #22c55e", borderRadius: "6px", fontSize: "11px", wordBreak: "break-all",
              }}>
                <div style={{ color: "#22c55e", fontWeight: "bold", marginBottom: "6px" }}>
                  {airdropStatus.results ? "✅ AIRDROP COMPLETE!" : "📊 AIRDROP STATUS"}
                </div>
                {airdropStatus.contractAddress && (
                  <div style={{ color: "#aaa" }}>Contract: {airdropStatus.contractAddress}</div>
                )}
                {airdropStatus.currentSupply !== undefined && (
                  <div style={{ color: "#aaa" }}>Supply: {airdropStatus.currentSupply}/{airdropStatus.maxSupply}</div>
                )}
                {airdropStatus.totalAirdropNeeded !== undefined && (
                  <div style={{ color: "#fbbf24" }}>Needed: {airdropStatus.totalAirdropNeeded} NFTs</div>
                )}
                {airdropStatus.totalMinted !== undefined && (
                  <div style={{ color: "#22c55e" }}>Minted: {airdropStatus.totalMinted} | Skipped: {airdropStatus.totalSkipped}</div>
                )}
                {airdropStatus.holders && (
                  <div style={{ maxHeight: "150px", overflow: "auto", marginTop: "6px" }}>
                    {airdropStatus.holders.map((h: any, i: number) => (
                      <div key={i} style={{ color: h.needsAirdrop ? "#fbbf24" : "#22c55e", padding: "2px 0", fontSize: "10px" }}>
                        {h.handle || h.wallet.slice(0,10)}: {h.currentBalance || 0}/{h.expectedCount}
                        {h.status && ` [${h.status}]`}
                        {h.txHash && <span> ✅</span>}
                      </div>
                    ))}
                  </div>
                )}
                {airdropStatus.results && (
                  <div style={{ maxHeight: "150px", overflow: "auto", marginTop: "6px" }}>
                    {airdropStatus.results.map((r: any, i: number) => (
                      <div key={i} style={{ color: r.status === "success" ? "#22c55e" : r.status === "skipped" ? "#999" : "#dc2626", padding: "2px 0", fontSize: "10px" }}>
                        {r.handle || r.wallet.slice(0,10)}: {r.status} {r.minted ? `(${r.minted} NFTs)` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* CONFIG TAB */}
        {activeTab === "config" && (
          <>
            <div style={{ marginBottom: "16px", fontSize: "12px", color: "#777" }}>
              <div style={{ color: "#fbbf24" }}>Post-deploy configuration</div>
              <div style={{ marginTop: "4px" }}>Run these AFTER deploying the contract and setting NFT_CONTRACT_ADDRESS on Render</div>
            </div>
            <button onClick={handleSeedWhitelist} disabled={loading} style={buttonStyle("#7c3aed")}>
              {loading ? "⏳ SEEDING..." : "📝 SEED WHITELIST (10 entries)"}
            </button>
            <button onClick={() => handleSetConfig("set_base_uri")} disabled={loading} style={buttonStyle("#0891b2")}>
              {loading ? "⏳ SETTING..." : "🔗 SET BASE URI (IPFS metadata)"}
            </button>
            <button onClick={() => { if (confirm("⚠️ This will change the contract's baseURI from IPFS to HTTPS. This makes NFT images visible on Snowtrace and marketplaces. The change is reversible. Continue?")) handleSetConfig("set_https_base_uri"); }} disabled={loading} style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#555" : "#dc2626",
              color: "#fff",
              border: "2px solid #ff4444",
              borderRadius: "6px",
              fontSize: "15px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "monospace",
              marginBottom: "8px",
              textShadow: "0 0 10px rgba(255,0,0,0.5)",
            }}>
              {loading ? "⏳ SETTING..." : "🖼️ SET HTTPS BASE URI (Show images on Snowtrace!)"}
            </button>
            <div style={{ fontSize: "10px", color: "#fbbf24", marginBottom: "8px", padding: "4px 8px", background: "#1a1a0a", borderRadius: "4px", border: "1px solid #b45309" }}>
              New: https://doomhound.onrender.com/api/nft/metadata/ — All 100 NFTs ready!
            </div>
            <button onClick={() => handleSetConfig("set_unrevealed_uri")} disabled={loading} style={buttonStyle("#0891b2")}>
              {loading ? "⏳ SETTING..." : "👁️ SET UNREVEALED URI"}
            </button>
            <button onClick={() => handleSetConfig("activate_free_mint")} disabled={loading} style={buttonStyle("#059669")}>
              {loading ? "⏳ ACTIVATING..." : "🆓 ACTIVATE FREE MINT"}
            </button>
            <button onClick={() => handleSetConfig("activate_paid_mint")} disabled={loading} style={buttonStyle("#059669")}>
              {loading ? "⏳ ACTIVATING..." : "💰 ACTIVATE PAID MINT"}
            </button>
            <button onClick={() => { if (confirm("⚠️ REVEAL: This will permanently reveal all NFT metadata! Are you sure?")) handleSetConfig("reveal"); }} disabled={loading} style={buttonStyle("#dc2626")}>
              {loading ? "⏳ REVEALING..." : "🔥 REVEAL NFT COLLECTION"}
            </button>
            {configResult && (
              <div style={{
                marginTop: "12px", padding: "12px", background: "#0a2a0a",
                border: "1px solid #22c55e", borderRadius: "6px", fontSize: "12px", wordBreak: "break-all",
              }}>
                <div style={{ color: "#22c55e", fontWeight: "bold", marginBottom: "6px" }}>✅ {configResult.action}</div>
                <pre style={{ color: "#aaa", fontSize: "11px", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(configResult, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}

        {/* VERIFY TAB */}
        {activeTab === "verify" && (
          <>
            <div style={{ marginBottom: "16px", fontSize: "12px", color: "#777" }}>
              <div style={{ color: "#b45309", fontWeight: "bold" }}>Verify contract source code on Snowtrace</div>
              <div style={{ marginTop: "4px", fontSize: "11px" }}>Submits the Solidity source code + compiler settings to Snowtrace for public verification.</div>
              <div style={{ marginTop: "8px", borderTop: "1px solid #333", paddingTop: "8px" }}>
                <div><b style={{ color: "#aaa" }}>Contract:</b> 0x3506...4DCb</div>
                <div><b style={{ color: "#aaa" }}>Compiler:</b> v0.8.28 (auto-checked)</div>
                <div><b style={{ color: "#aaa" }}>Optimizer:</b> Yes, 200 runs</div>
                <div><b style={{ color: "#aaa" }}>EVM:</b> cancun (tries shanghai/paris if fails)</div>
                <div><b style={{ color: "#aaa" }}>Format:</b> Single file (flattened)</div>
                <div><b style={{ color: "#aaa" }}>Contract Name:</b> DoomhoundNFT</div>
              </div>
              <div style={{ marginTop: "8px", padding: "8px", background: "#1a1a0a", border: "1px solid #b45309", borderRadius: "6px", fontSize: "10px", color: "#fbbf24" }}>
                Required: SNOWTRACE_API_KEY env var on Render. Get one free at snowtrace.io/apis
              </div>
              <div style={{ marginTop: "6px", padding: "6px", background: "#0a0a1a", border: "1px solid #2563eb", borderRadius: "6px", fontSize: "10px", color: "#60a5fa" }}>
                Auto-checks: compiler version support, already verified status, tries multiple EVM versions if needed.
              </div>
            </div>
            <button onClick={handleVerify} disabled={loading} style={buttonStyle("#b45309")}>
              {loading ? "\u23F3 VERIFYING (may take 30-60s)..." : "\uD83D\uDD0D VERIFY ON SNOWTRACE"}
            </button>
            {verifyResult && (
              <div style={{
                marginTop: "12px", padding: "12px",
                background: verifyResult.success ? "#0a2a0a" : "#2a0a0a",
                border: `1px solid ${verifyResult.success ? "#22c55e" : "#dc2626"}`,
                borderRadius: "6px", fontSize: "12px", wordBreak: "break-all",
              }}>
                <div style={{ color: verifyResult.success ? "#22c55e" : "#dc2626", fontWeight: "bold", marginBottom: "6px" }}>
                  {verifyResult.success ? "\u2705 VERIFIED!" : "\u274C VERIFICATION FAILED"}
                </div>
                {verifyResult.verificationStatus && (
                  <div style={{ color: "#aaa", marginBottom: "4px" }}>
                    Status: <span style={{ color: verifyResult.success ? "#22c55e" : "#fbbf24" }}>{verifyResult.verificationStatus}</span>
                  </div>
                )}
                {verifyResult.contractAddress && (
                  <div style={{ color: "#aaa", marginBottom: "4px" }}>
                    Contract: <a href={verifyResult.snowtrace} target="_blank" style={{ color: "#60a5fa" }}>{verifyResult.contractAddress}</a>
                  </div>
                )}
                {verifyResult.error && (
                  <div style={{ color: "#ff6666", marginBottom: "4px" }}>
                    Error: {verifyResult.error}
                  </div>
                )}
                {verifyResult.details && (
                  <div style={{ marginTop: "6px", padding: "6px", background: "#0a0a0a", borderRadius: "4px" }}>
                    <div style={{ color: "#777", fontSize: "10px", marginBottom: "4px" }}>API Response Details:</div>
                    <pre style={{ color: "#999", fontSize: "10px", whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(verifyResult.details, null, 2)}
                    </pre>
                  </div>
                )}
                {verifyResult.suggestion && (
                  <div style={{ marginTop: "6px", padding: "8px", background: "#1a1a0a", border: "1px solid #b45309", borderRadius: "6px", fontSize: "11px", color: "#fbbf24" }}>
                    \u2139\uFE0F {verifyResult.suggestion}
                  </div>
                )}
                {verifyResult.guid && (
                  <div style={{ color: "#555", fontSize: "10px", marginTop: "4px" }}>GUID: {verifyResult.guid}</div>
                )}
              </div>
            )}
          </>
        )}

        {/* Error display */}
        {error && (
          <div style={{
            marginTop: "12px",
            padding: "10px",
            background: "#2a0a0a",
            border: "1px solid #dc2626",
            borderRadius: "6px",
            color: "#ff6666",
            fontSize: "12px",
            wordBreak: "break-all",
          }}>
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
}
