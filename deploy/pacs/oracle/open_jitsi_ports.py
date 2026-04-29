#!/usr/bin/env python
"""Add Jitsi-meet ingress rules to the existing security list.

Idempotent: skip if a rule with the same protocol+port range already exists.
Adds:
- 80/TCP    (already present from PACS — skipped)
- 443/TCP   (already present — skipped)
- 4443/TCP  (Jitsi Videobridge fallback)
- 10000/UDP (Jitsi Videobridge media)
"""
import json
import sys
from pathlib import Path

import oci
from oci.config import from_file

HERE = Path(__file__).parent
STATE_FILE = HERE / "state.json"

# (protocol, port, description)
# OCI protocol numbers: TCP=6, UDP=17
RULES = [
    ("6",  443,   "Jitsi HTTPS"),
    ("6",  80,    "Jitsi HTTP redirect"),
    ("6",  4443,  "Jitsi Videobridge TCP fallback"),
    ("17", 10000, "Jitsi Videobridge UDP media"),
]


def existing_match(rules, proto, port):
    for r in rules:
        if r.protocol != proto:
            continue
        if proto == "6":
            opts = r.tcp_options
        elif proto == "17":
            opts = r.udp_options
        else:
            continue
        if not opts or not opts.destination_port_range:
            continue
        rng = opts.destination_port_range
        if rng.min == port and rng.max == port:
            return True
    return False


def main() -> int:
    config = from_file(profile_name="DEFAULT")
    network = oci.core.VirtualNetworkClient(config)

    state = json.loads(STATE_FILE.read_text())
    sl_id = state["security_list_id"]
    sl = network.get_security_list(sl_id).data

    new_ingress = list(sl.ingress_security_rules)
    added = 0
    for proto, port, desc in RULES:
        if existing_match(new_ingress, proto, port):
            print(f"= already open: {proto}/{port}  ({desc})")
            continue
        rule_kwargs = dict(
            protocol=proto,
            source="0.0.0.0/0",
            source_type="CIDR_BLOCK",
            is_stateless=False,
            description=desc,
        )
        if proto == "6":
            rule_kwargs["tcp_options"] = oci.core.models.TcpOptions(
                destination_port_range=oci.core.models.PortRange(min=port, max=port)
            )
        else:
            rule_kwargs["udp_options"] = oci.core.models.UdpOptions(
                destination_port_range=oci.core.models.PortRange(min=port, max=port)
            )
        new_ingress.append(oci.core.models.IngressSecurityRule(**rule_kwargs))
        added += 1
        print(f"+ added:       {proto}/{port}  ({desc})")

    if added == 0:
        print("No changes — all ports already open.")
        return 0

    network.update_security_list(
        sl_id,
        oci.core.models.UpdateSecurityListDetails(
            ingress_security_rules=new_ingress,
            egress_security_rules=sl.egress_security_rules,
        ),
    )
    print(f"\nDone — {added} new ingress rule(s) applied to {sl_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
