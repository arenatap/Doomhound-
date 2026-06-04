#!/usr/bin/env python3
"""
Fetch ALL ERC-721 Transfer events for Doomhound contract on Avalanche C-Chain.
"""

import json
import requests
import time
import sys

RPC_URL = "https://api.avax.network/ext/bc/C/rpc"
CONTRACT = "0x851ba0903c345676369634660E2757026418DCEd"
TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

# Hacker addresses
HACKER = "0xeead31aa69a5afaa902ddffaa758d8d81c992a73"
SUSPICIOUS_OWNER = "0xd402a1b03ed2533d9c960062bfc0e19622f9312d"

def rpc_call(method, params):
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1
    }
    resp = requests.post(RPC_URL, json=payload, timeout=30)
    return resp.json().get("result")

def get_latest_block():
    result = rpc_call("eth_blockNumber", [])
    return int(result, 16)

def get_logs(from_block, to_block, extra_topics=None):
    topics = [TRANSFER_TOPIC]
    if extra_topics:
        topics.extend(extra_topics)
    
    params = [{
        "fromBlock": hex(from_block),
        "toBlock": hex(to_block),
        "address": CONTRACT,
        "topics": topics
    }]
    
    result = rpc_call("eth_getLogs", params)
    return result if result else []

# Step 1: Find when the contract was active
print("Getting latest block number...")
latest_block = get_latest_block()
print(f"Latest block: {latest_block}")

all_logs = []
CHUNK_SIZE = 2000

# Start from block 0 
start = 0
end = latest_block

print(f"Searching for Transfer events from block {start} to {end}...")

current = start
total_logs = 0

while current <= end:
    chunk_end = min(current + CHUNK_SIZE - 1, end)
    
    try:
        logs = get_logs(current, chunk_end)
        if logs:
            total_logs += len(logs)
            all_logs.extend(logs)
            print(f"  Block {current}-{chunk_end}: {len(logs)} transfers (total: {total_logs})")
        
        current = chunk_end + 1
        
        if current % 20000 == 0:
            time.sleep(0.1)
            
    except Exception as e:
        print(f"  Error at blocks {current}-{chunk_end}: {e}")
        time.sleep(1)
        try:
            smaller_chunk = 500
            logs = get_logs(current, min(current + smaller_chunk - 1, end))
            if logs:
                total_logs += len(logs)
                all_logs.extend(logs)
            current = min(current + smaller_chunk, end + 1)
        except Exception as e2:
            print(f"  Retry failed: {e2}")
            current = chunk_end + 1

print(f"\nTotal Transfer events found: {len(all_logs)}")

# Save raw logs
with open("/home/z/my-project/raw_transfer_logs.json", "w") as f:
    json.dump(all_logs, f, indent=2)

print("Raw logs saved.")

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
    print(f"Token #{p['tokenId']:3d} | Block {p['blockNumber']} | {p['from']} → {p['to']} | tx: {p['txHash']}")

with open("/home/z/my-project/parsed_transfers.json", "w") as f:
    json.dump(parsed, f, indent=2)

print(f"\nParsed transfers saved.")
