#!/usr/bin/env python3
"""
Find the block range where the Doomhound contract has Transfer events.
Uses binary search to find first and last activity blocks.
"""

import json
import requests
import time

RPC_URL = "https://api.avax.network/ext/bc/C/rpc"
CONTRACT = "0x851ba0903c345676369634660E2757026418DCEd"
TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

def rpc_call(method, params):
    payload = {"jsonrpc": "2.0", "method": method, "params": params, "id": 1}
    resp = requests.post(RPC_URL, json=payload, timeout=30)
    return resp.json().get("result")

def has_logs(from_block, to_block):
    params = [{
        "fromBlock": hex(from_block),
        "toBlock": hex(to_block),
        "address": CONTRACT,
        "topics": [TRANSFER_TOPIC]
    }]
    result = rpc_call("eth_getLogs", params)
    return bool(result)

def get_logs(from_block, to_block):
    params = [{
        "fromBlock": hex(from_block),
        "toBlock": hex(to_block),
        "address": CONTRACT,
        "topics": [TRANSFER_TOPIC]
    }]
    result = rpc_call("eth_getLogs", params)
    return result if result else []

# Get latest block
latest = int(rpc_call("eth_blockNumber", []), 16)
print(f"Latest block: {latest}")

# Binary search for first block with activity
# Avalanche C-Chain mainnet started at block ~0, but activity around Sept 2021
# Block 10M is around early 2022
# Let's use large chunks first

# First, find if there's ANY activity using 1M block chunks
print("\nSearching for first activity block using 1M chunks...")
first_active_chunk = None
for start in range(0, latest + 1, 1000000):
    end = min(start + 999999, latest)
    try:
        if has_logs(start, end):
            first_active_chunk = start
            print(f"  Found activity in range {start}-{end}")
            break
        else:
            print(f"  No activity in range {start}-{end}")
    except Exception as e:
        print(f"  Error in range {start}-{end}: {e}")
        time.sleep(0.5)

if first_active_chunk is None:
    print("No activity found! Check contract address.")
    exit(1)

# Binary search within the first active chunk
lo, hi = first_active_chunk, first_active_chunk + 1000000
print(f"\nBinary searching for first block in range {lo}-{hi}...")

while lo < hi:
    mid = (lo + hi) // 2
    try:
        if has_logs(lo, mid):
            hi = mid
        else:
            lo = mid + 1
    except:
        time.sleep(0.5)
        continue

# Refine with smaller range
first_block_approx = lo
print(f"First activity approximately at block {first_block_approx}")

# Refine further with 1000-block granularity
lo2 = max(0, first_block_approx - 1000)
hi2 = first_block_approx + 1000
while lo2 < hi2:
    mid = (lo2 + hi2) // 2
    try:
        if has_logs(lo2, mid):
            hi2 = mid
        else:
            lo2 = mid + 1
    except:
        time.sleep(0.5)
        continue

first_block = lo2
print(f"Refined first activity block: {first_block}")

# Now fetch all logs from first_block to latest, using large chunks
print(f"\nFetching all Transfer events from block {first_block} to {latest}...")
all_logs = []
CHUNK = 5000  # Avalanche RPC usually supports larger chunks
current = first_block

while current <= latest:
    chunk_end = min(current + CHUNK - 1, latest)
    try:
        logs = get_logs(current, chunk_end)
        if logs:
            all_logs.extend(logs)
            print(f"  Block {current}-{chunk_end}: {len(logs)} transfers")
        current = chunk_end + 1
        if current % 50000 == 0:
            time.sleep(0.1)
    except Exception as e:
        print(f"  Error at {current}-{chunk_end}: {e}, retrying with smaller chunk...")
        time.sleep(1)
        try:
            logs = get_logs(current, min(current + 1000, latest))
            if logs:
                all_logs.extend(logs)
            current = min(current + 1001, latest + 1)
        except:
            current = chunk_end + 1

print(f"\nTotal Transfer events: {len(all_logs)}")

with open("/home/z/my-project/raw_transfer_logs.json", "w") as f:
    json.dump(all_logs, f, indent=2)

# Parse
parsed = []
for log in all_logs:
    topics = log['topics']
    from_addr = "0x" + topics[1][-40:]
    to_addr = "0x" + topics[2][-40:]
    token_id = int(topics[3], 16)
    parsed.append({
        "blockNumber": int(log['blockNumber'], 16),
        "txHash": log['transactionHash'],
        "from": from_addr.lower(),
        "to": to_addr.lower(),
        "tokenId": token_id,
        "logIndex": int(log['logIndex'], 16)
    })

parsed.sort(key=lambda x: (x['blockNumber'], x['logIndex']))

print("\n=== ALL TRANSFERS (CHRONOLOGICAL) ===")
for p in parsed:
    marker = ""
    if p['to'] == "0xeead31aa69a5afaa902ddffaa758d8d81c992a73":
        marker = " <<< TO HACKER"
    elif p['from'] == "0xeead31aa69a5afaa902ddffaa758d8d81c992a73":
        marker = " <<< FROM HACKER"
    print(f"  Token #{p['tokenId']:3d} | Block {p['blockNumber']} | {p['from'][:10]}...→{p['to'][:10]}... | {p['txHash'][:20]}...{marker}")

with open("/home/z/my-project/parsed_transfers.json", "w") as f:
    json.dump(parsed, f, indent=2)

print(f"\nSaved {len(parsed)} parsed transfers.")
