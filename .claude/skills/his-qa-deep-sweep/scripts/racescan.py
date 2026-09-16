"""Double-submit sweep: fire the SAME write TWICE simultaneously and flag the ones that both succeed.

usage: python racescan.py --base http://localhost:5107 --calls calls.json [--repeat 2]
calls.json is a list of {"label","method","path","body"} — the payloads a v2 page really sends, so the
two requests are indistinguishable from a user double-clicking "Lưu".

A write that is meant to happen once (issue a receipt, dispense a prescription, assign a bed, approve a
refund, confirm a handover) must answer once with 2xx and once with a 4xx/409. Two 2xx means the guard
is read-then-write without a lock and the money/stock moved twice.
"""
import argparse
import concurrent.futures
import json
import sys

from _common import login, req

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--calls", required=True)
ap.add_argument("--repeat", type=int, default=2)
args = ap.parse_args()

token = login(args.base)
calls = json.load(open(args.calls, encoding="utf-8"))


def fire(call):
    st, b = req(call["method"], args.base + call["path"], body=call.get("body"), token=token)
    return st, b[:180].decode("utf-8", "replace").replace("\n", " ")


print(f"{'verdict':<9}{'label':<44}statuses")
bad = 0
for call in calls:
    with concurrent.futures.ThreadPoolExecutor(args.repeat) as ex:
        results = list(ex.map(fire, [call] * args.repeat))
    ok = [r for r in results if 200 <= r[0] < 300]
    verdict = "RACE" if len(ok) > 1 else "ok"
    if verdict == "RACE":
        bad += 1
    print(f"{verdict:<9}{call['label'][:43]:<44}{[r[0] for r in results]}")
    if verdict == "RACE":
        for st, body in results:
            print(f"    {st} {body[:150]}")

print(f"\ntotal={len(calls)} races={bad}")
sys.exit(0)
