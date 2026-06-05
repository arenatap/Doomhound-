import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";

// Deploy and configure HOTH NFT contract on Avalanche C-Chain
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const AVAX_RPC = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;

// Constructor parameters for the NEW contract
const INITIAL_SIGNER = "0xe0a3a19e6c83f3c1ff4c73f1e039397968f03bab";
const INITIAL_BASE_URI = "ipfs://bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4/";
const HTTPS_BASE_URI = "https://doomhound.onrender.com/api/nft/metadata/";
const INITIAL_UNREVEALED_URI = "ipfs://bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/unrevealed.json";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const body = await request.json();
    const password = body.password || request.headers.get("X-Admin-Password");
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!DEPLOYER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "DEPLOYER_PRIVATE_KEY not configured on server" },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(AVAX_RPC);
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

    // ---- Handle configuration actions ----
    const action = body.action;

    if (action === "set_base_uri") {
      return await handleContractAction(provider, wallet, "setBaseURI", [INITIAL_BASE_URI], "set_base_uri");
    }

    if (action === "set_https_base_uri") {
      return await handleContractAction(provider, wallet, "setBaseURI", [HTTPS_BASE_URI], "set_https_base_uri");
    }

    if (action === "set_unrevealed_uri") {
      return await handleContractAction(provider, wallet, "setUnrevealedURI", [INITIAL_UNREVEALED_URI], "set_unrevealed_uri");
    }

    if (action === "activate_free_mint") {
      return await handleContractAction(provider, wallet, "setFreeMintActive", [true], "activate_free_mint");
    }

    if (action === "activate_paid_mint") {
      return await handleContractAction(provider, wallet, "setPaidMintActive", [true], "activate_paid_mint");
    }

    if (action === "reveal") {
      const revealedURI_ = INITIAL_BASE_URI; // reveal sets unrevealedURI to baseURI so tokenURI resolves correctly
      return await handleContractAction(provider, wallet, "reveal", [revealedURI_], "reveal");
    }

    if (action === "admin_mint") {
      const { to, quantity } = body;
      if (!to || !quantity) {
        return NextResponse.json({ error: "Missing 'to' (wallet address) or 'quantity'" }, { status: 400 });
      }
      return await handleContractAction(provider, wallet, "adminMint", [to, Number(quantity)], "admin_mint");
    }

    if (action === "verify_contract") {
      return await handleVerifyContract();
    }

    // ---- Default: Deploy new contract ----
    // Read compiled artifact
    const artifactPath = join(process.cwd(), "contracts", "deploy-nft-artifact.json");
    const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

    console.log("[DEPLOY] Deployer address:", wallet.address);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceAvax = ethers.formatEther(balance);
    console.log("[DEPLOY] Balance:", balanceAvax, "AVAX");

    if (balance === 0n) {
      return NextResponse.json(
        { error: `Deployer wallet ${wallet.address} has 0 AVAX. Fund it first.` },
        { status: 400 }
      );
    }

    // Verify this is the expected owner
    const expectedOwner = "0xeed2fd309ffe51f1014f51cfb18eb27e986ca4c9";
    if (wallet.address.toLowerCase() !== expectedOwner.toLowerCase()) {
      console.warn(`[DEPLOY] WARNING: Deployer ${wallet.address} != expected owner ${expectedOwner}`);
    }

    // Deploy contract
    const ContractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("[DEPLOY] Deploying DoomhoundNFT...");
    console.log("[DEPLOY]   Signer:", INITIAL_SIGNER);
    console.log("[DEPLOY]   BaseURI:", INITIAL_BASE_URI);
    console.log("[DEPLOY]   UnrevealedURI:", INITIAL_UNREVEALED_URI);

    const contract = await ContractFactory.deploy(
      INITIAL_SIGNER,
      INITIAL_BASE_URI,
      INITIAL_UNREVEALED_URI
    );

    console.log("[DEPLOY] Tx hash:", contract.deploymentTransaction()?.hash);
    console.log("[DEPLOY] Waiting for confirmation...");

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("[DEPLOY] ✅ CONTRACT DEPLOYED at:", contractAddress);

    return NextResponse.json({
      success: true,
      contractAddress,
      deployer: wallet.address,
      signer: INITIAL_SIGNER,
      baseURI: INITIAL_BASE_URI,
      unrevealedURI: INITIAL_UNREVEALED_URI,
      network: "Avalanche C-Chain (43114)",
      snowtrace: `https://snowtrace.io/address/${contractAddress}`,
      balanceAvax,
    });
  } catch (error: any) {
    console.error("[DEPLOY] Failed:", error);
    return NextResponse.json(
      { error: error.message || "Deploy failed" },
      { status: 500 }
    );
  }
}

async function handleContractAction(
  provider: ethers.JsonRpcProvider,
  wallet: ethers.Wallet,
  functionName: string,
  args: any[],
  actionName: string
) {
  if (!NFT_CONTRACT_ADDRESS || NFT_CONTRACT_ADDRESS === "0x851ba0903c345676369634660e2757026418dced") {
    return NextResponse.json({ error: "New contract not deployed yet. Deploy first, then set NFT_CONTRACT_ADDRESS env var." }, { status: 400 });
  }

  const argTypes = args.map((a: any) => {
    if (typeof a === 'boolean') return 'bool';
    if (typeof a === 'number') return 'uint256';
    if (typeof a === 'string' && a.startsWith('0x') && a.length === 42) return 'address';
    return 'string';
  });
  const nftAbi = [
    "function owner() view returns (address)",
    `function ${functionName}(${argTypes.join(',')}) external`,
    "function baseURI() view returns (string)",
    "function freeMintActive() view returns (bool)",
    "function paidMintActive() view returns (bool)",
    "function revealed() view returns (bool)",
  ];

  const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, nftAbi, wallet);

  // Verify owner
  const contractOwner = await nftContract.owner();
  if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
    return NextResponse.json({
      error: `Wallet ${wallet.address} is NOT the contract owner ${contractOwner}. Set DEPLOYER_PRIVATE_KEY!`,
    }, { status: 500 });
  }

  console.log(`[CONFIG] Calling ${functionName}(${args.join(', ')})...`);
  const tx = await nftContract[functionName](...args);
  console.log(`[CONFIG] TX sent: ${tx.hash}, waiting...`);
  const receipt = await tx.wait();

  if (receipt.status === 1) {
    console.log(`[CONFIG] ✅ ${functionName} succeeded!`);

    // Read back the current state
    let currentState: any = {};
    try {
      if (functionName.includes("baseURI") || functionName.includes("BaseURI")) {
        currentState.baseURI = await nftContract.baseURI();
      }
      currentState.freeMintActive = await nftContract.freeMintActive();
      currentState.paidMintActive = await nftContract.paidMintActive();
      currentState.revealed = await nftContract.revealed();
    } catch {}

    return NextResponse.json({
      success: true,
      action: actionName,
      txHash: tx.hash,
      snowtrace: `https://snowtrace.io/tx/${tx.hash}`,
      ...currentState,
    });
  } else {
    return NextResponse.json({ error: `${functionName} transaction reverted` }, { status: 500 });
  }
}

async function handleVerifyContract() {
  const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY;
  const contractAddress = NFT_CONTRACT_ADDRESS;

  if (!contractAddress || contractAddress === "0x851ba0903c345676369634660e2757026418dced") {
    return NextResponse.json({ error: "Set NFT_CONTRACT_ADDRESS to the new contract first." }, { status: 400 });
  }

  if (!SNOWTRACE_API_KEY) {
    return NextResponse.json({ error: "SNOWTRACE_API_KEY not set. Get one free at https://snowtrace.io/apis and add to Render env vars." }, { status: 500 });
  }

  // Ensure checksummed address
  const checksummedAddress = ethers.getAddress(contractAddress);

  try {
    // ===== STEP 1: Diagnostics — check API key and supported compiler versions =====
    const diagnostics: any = { contractAddress: checksummedAddress };

    // Test API key with getabi call
    const testRes = await fetch(`https://api.snowtrace.io/api?module=contract&action=getabi&address=${checksummedAddress}&apikey=${SNOWTRACE_API_KEY}`);
    const testData = await testRes.json();
    diagnostics.apiKeyWorks = testData.status === "1" || testData.result === "Contract source code not verified";
    diagnostics.isAlreadyVerified = testData.status === "1" && testData.result && testData.result !== "Contract source code not verified";

    if (diagnostics.isAlreadyVerified) {
      return NextResponse.json({
        success: true,
        action: "verify_contract",
        verificationStatus: "Already verified",
        contractAddress: checksummedAddress,
        snowtrace: `https://snowtrace.io/address/${checksummedAddress}#code`,
      });
    }

    // Get supported compiler versions
    const versionsRes = await fetch("https://api.snowtrace.io/api?module=contract&action=getcompilerversions");
    const versionsData = await versionsRes.json();
    diagnostics.versionsApiStatus = versionsData.status;
    
    let supportedVersions: string[] = [];
    if (versionsData.status === "1" && Array.isArray(versionsData.result)) {
      supportedVersions = versionsData.result;
    }
    
    // Find best compiler version — try 0.8.28 first, then fall back
    const versionCandidates = [
      "v0.8.28+commit.7893614a",
      "v0.8.28+commit.0a8ea908",
      "v0.8.27+commit.4025a7e7",
      "v0.8.26+commit.8a97fa7a",
      "v0.8.25+commit.b0c3296b",
      "v0.8.24+commit.7e3276a3",
      "v0.8.20+commit.a1b79de6",
    ];
    
    let compilerVersion = versionCandidates[0]; // default
    for (const vc of versionCandidates) {
      if (supportedVersions.includes(vc)) {
        compilerVersion = vc;
        break;
      }
    }
    
    // If no exact match, find first available 0.8.x
    if (!supportedVersions.includes(compilerVersion) && supportedVersions.length > 0) {
      const v028 = supportedVersions.filter((v: string) => v.startsWith("v0.8.28"));
      if (v028.length > 0) compilerVersion = v028[0];
      else {
        const v027 = supportedVersions.filter((v: string) => v.startsWith("v0.8.27"));
        if (v027.length > 0) compilerVersion = v027[0];
        else {
          const v026 = supportedVersions.filter((v: string) => v.startsWith("v0.8.26"));
          if (v026.length > 0) compilerVersion = v026[0];
        }
      }
    }
    
    diagnostics.compilerVersion = compilerVersion;
    diagnostics.versionIsSupported = supportedVersions.includes(compilerVersion);
    diagnostics.available08x = supportedVersions.filter((v: string) => v.startsWith("v0.8.2")).slice(-10);
    
    console.log("[VERIFY] Diagnostics:", JSON.stringify(diagnostics));

    // ===== STEP 2: Read source code =====
    const flattenedPath = join(process.cwd(), "contracts", "DoomhoundNFT-flattened.sol");
    let sourceCode: string;
    try {
      sourceCode = readFileSync(flattenedPath, "utf-8");
    } catch {
      return NextResponse.json({ error: "DoomhoundNFT-flattened.sol not found." }, { status: 500 });
    }

    // ABI-encode constructor arguments
    const abi = ethers.AbiCoder.defaultAbiCoder();
    const constructorArgs = abi.encode(
      ["address", "string", "string"],
      [INITIAL_SIGNER, INITIAL_BASE_URI, INITIAL_UNREVEALED_URI]
    );
    const constructorArgsHex = constructorArgs.slice(2);

    console.log("[VERIFY] Source code length:", sourceCode.length, "chars");
    console.log("[VERIFY] Constructor args (hex):", constructorArgsHex.slice(0, 40) + "...");
    console.log("[VERIFY] Using compiler:", compilerVersion);

    // ===== STEP 3: Try verification with different parameter combos =====
    // Strategy: try with/without constructor args, different EVM versions
    const attempts = [
      { evm: "cancun", withArgs: true },
      { evm: "cancun", withArgs: false },
      { evm: "", withArgs: true },
      { evm: "", withArgs: false },
      { evm: "shanghai", withArgs: true },
      { evm: "paris", withArgs: true },
    ];

    let lastError: any = null;
    let acceptedGuid: string | null = null;
    let usedAttempt: any = null;

    for (const attempt of attempts) {
      const params = new URLSearchParams();
      params.append("module", "contract");
      params.append("action", "verifysourcecode");
      params.append("contractaddress", checksummedAddress);
      params.append("sourceCode", sourceCode);
      params.append("codeformat", "solidity-single-file");
      params.append("contractname", "DoomhoundNFT");
      params.append("compilerversion", compilerVersion);
      params.append("optimizationUsed", "1");
      params.append("runs", "200");
      if (attempt.withArgs) {
        params.append("constructorArguements", constructorArgsHex);
        params.append("constructorArguments", constructorArgsHex);
      }
      params.append("apikey", SNOWTRACE_API_KEY);
      if (attempt.evm) {
        params.append("evmversion", attempt.evm);
      }

      const attemptLabel = `evm=${attempt.evm || "(default)"}, args=${attempt.withArgs}`;
      console.log("[VERIFY] Trying:", attemptLabel);

      const verifyResponse = await fetch("https://api.snowtrace.io/api", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const verifyData = await verifyResponse.json();
      console.log("[VERIFY] Response for", attemptLabel, ":", JSON.stringify(verifyData));

      if (verifyData.status === "1") {
        acceptedGuid = verifyData.result;
        usedAttempt = attempt;
        break;
      }

      lastError = verifyData;
      const errReason = verifyData.result || verifyData.message || "";

      // Stop immediately for non-retryable errors
      if (errReason.includes("Invalid API") || errReason.includes("Max rate") || errReason.includes("already verified")) {
        const errorReason = verifyData.result || verifyData.message || "Unknown error";
        return NextResponse.json({
          error: `Snowtrace: ${errorReason}`,
          details: { ...verifyData, diagnostics },
          suggestion: errorReason.includes("Invalid API")
            ? "Your SNOWTRACE_API_KEY is invalid. Get a free one at https://snowtrace.io/apis"
            : errorReason.includes("already verified")
              ? "Contract is already verified!"
              : "Rate limited. Wait a few minutes and try again.",
        }, { status: 500 });
      }

      // "Invalid body request" — try next combo
      continue;
    }

    if (!acceptedGuid) {
      // All attempts failed — return full diagnostics for debugging
      const errorReason = lastError?.result || lastError?.message || "Invalid body request";
      return NextResponse.json({
        error: `Snowtrace: ${errorReason}`,
        details: {
          lastError: { status: lastError?.status, message: lastError?.message, result: lastError?.result },
          diagnostics,
          attemptsTried: attempts.map(a => `evm=${a.evm||"default"},args=${a.withArgs}`),
        },
        suggestion: diagnostics.versionIsSupported === false
          ? `Compiler v0.8.28 is NOT supported by Snowtrace! Available versions: ${diagnostics.available08x?.join(", ")}. The contract needs to be recompiled with a supported version, or verified manually.`
          : "Auto-verification keeps failing. Try manual verification at https://snowtrace.io/verifyContract — paste the flattened source, select compiler version, optimizer ON (200 runs).",
      }, { status: 500 });
    }

    // ===== STEP 4: Poll for verification status =====
    let finalStatus = "Pending in queue";
    let statusData: any = null;

    for (let attempt = 1; attempt <= 6; attempt++) {
      const waitTime = attempt === 1 ? 5000 : 10000;
      await new Promise(resolve => setTimeout(resolve, waitTime));

      const statusParams = new URLSearchParams();
      statusParams.append("module", "contract");
      statusParams.append("action", "checkverifystatus");
      statusParams.append("guid", acceptedGuid);

      const statusResponse = await fetch(`https://api.snowtrace.io/api?${statusParams.toString()}`);
      statusData = await statusResponse.json();
      console.log(`[VERIFY] Status check #${attempt}:`, JSON.stringify(statusData));

      finalStatus = statusData.result;
      if (finalStatus !== "Pending in queue") {
        break;
      }
    }

    const isVerified = finalStatus === "Pass - Verified";

    return NextResponse.json({
      success: isVerified,
      action: "verify_contract",
      guid: acceptedGuid,
      verificationStatus: finalStatus,
      contractAddress: checksummedAddress,
      compilerVersion,
      evmVersion: usedAttempt?.evm || "(default)",
      usedConstructorArgs: usedAttempt?.withArgs,
      format: "solidity-single-file",
      snowtrace: `https://snowtrace.io/address/${checksummedAddress}#code`,
      ...(isVerified ? {} : {
        suggestion: finalStatus.includes("already verified")
          ? "Contract is already verified!"
          : finalStatus.includes("Unable to verify") || finalStatus.includes("match")
            ? "Bytecode mismatch. The compiler settings differ from deployment. Try manual verification at https://snowtrace.io/verifyContract"
            : "Check Snowtrace or try manual verification at https://snowtrace.io/verifyContract",
        rawStatus: statusData,
      }),
    });
  } catch (error: any) {
    console.error("[VERIFY] Failed:", error);
    return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
  }
}
