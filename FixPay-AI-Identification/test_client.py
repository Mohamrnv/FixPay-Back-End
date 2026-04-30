"""
test_client.py  v2
───────────────────
Usage:
    python test_client.py --id path/to/id.jpg --selfie path/to/selfie.jpg
    python test_client.py --id id.jpg --selfie selfie.jpg --url http://host:5000
    python test_client.py --id id.jpg --selfie selfie.jpg --bench 10
"""

import argparse
import json
import sys
import time
import statistics
import requests

DEFAULT_URL = "http://localhost:5000"


def verify(id_path: str, selfie_path: str, base_url: str) -> dict:
    with open(id_path, "rb") as id_f, open(selfie_path, "rb") as selfie_f:
        t0  = time.perf_counter()
        res = requests.post(
            f"{base_url}/verify",
            files={
                "id_image":   ("id.jpg",     id_f,     "image/jpeg"),
                "live_image": ("selfie.jpg", selfie_f, "image/jpeg"),
            },
            timeout=30,
        )
        rtt = (time.perf_counter() - t0) * 1000

    data = res.json()
    data["_rtt_ms"] = round(rtt, 1)
    return data


def print_result(data: dict):
    match    = data.get("match")
    sim      = data.get("similarity", 0)
    conf     = data.get("confidence", "–")
    liveness = data.get("liveness")
    latency  = data.get("latency_ms", "–")
    rtt      = data.get("_rtt_ms", "–")
    error    = data.get("error")
    timings  = data.get("timings", {})

    print("\n" + "─" * 52)
    print(f"  Match       : {'✅ YES' if match else '❌ NO'}")
    print(f"  Similarity  : {sim:.4f}")
    print(f"  Confidence  : {conf}")
    print(f"  Liveness    : {'✅ PASS' if liveness else '❌ FAIL'}")
    print(f"  Threshold   : {data.get('threshold', '–')}")
    print(f"  Server time : {latency} ms")
    print(f"  Round-trip  : {rtt} ms")
    if timings:
        print("  Breakdown   :")
        for k, v in timings.items():
            print(f"    {k:<20} {v:.1f} ms")
    if error:
        print(f"  Error       : {error}")
    print("─" * 52)


def benchmark(id_path: str, selfie_path: str, base_url: str, n: int):
    print(f"\nBenchmarking {n} requests …")
    latencies = []
    for i in range(n):
        data = verify(id_path, selfie_path, base_url)
        ms   = data.get("latency_ms", data["_rtt_ms"])
        latencies.append(ms)
        print(f"  [{i+1:>3}/{n}] {ms:.0f} ms", end="\r")

    print(f"\nResults over {n} runs:")
    print(f"  min    : {min(latencies):.0f} ms")
    print(f"  max    : {max(latencies):.0f} ms")
    print(f"  mean   : {statistics.mean(latencies):.0f} ms")
    print(f"  median : {statistics.median(latencies):.0f} ms")
    print(f"  p95    : {sorted(latencies)[int(n*0.95)]:.0f} ms")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--id",     required=True)
    parser.add_argument("--selfie", required=True)
    parser.add_argument("--url",    default=DEFAULT_URL)
    parser.add_argument("--bench",  type=int, default=0,
                        help="Run N requests and report latency stats")
    args = parser.parse_args()

    try:
        if args.bench > 0:
            benchmark(args.id, args.selfie, args.url, args.bench)
        else:
            data = verify(args.id, args.selfie, args.url)
            print_result(data)
    except requests.ConnectionError:
        print(f"ERROR: Cannot connect to {args.url}. Is the server running?")
        sys.exit(1)
