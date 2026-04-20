#!/usr/bin/env python
"""Provision Oracle Cloud Free Tier VM for HIS PACS.

Creates: VCN + Internet Gateway + Route Table + Subnet + Security List (ports 22/80/443/4242)
         + ARM Ampere A1 Flex VM (4 OCPU, 24 GB) running Ubuntu 22.04

Idempotent: detects existing resources by name prefix and reuses them.
State is persisted to state.json so re-runs converge.

Usage: python provision.py
"""
import json
import sys
import time
from pathlib import Path

import oci
from oci.config import from_file

HERE = Path(__file__).parent
STATE_FILE = HERE / "state.json"
SSH_PUB_KEY = (HERE / "his-pacs-vm.key.pub").read_text(encoding="utf-8").strip()

PREFIX = "his-pacs"
VCN_CIDR = "10.0.0.0/16"
SUBNET_CIDR = "10.0.1.0/24"

# Ingress: allow SSH from anywhere (consider locking to your IP later),
#          HTTP+HTTPS for Caddy/Let's Encrypt,
#          4242 for DICOM C-STORE.
INGRESS_PORTS = [
    (22, "SSH"),
    (80, "HTTP for Let's Encrypt"),
    (443, "HTTPS REST"),
    (4242, "DICOM C-STORE"),
]


def load_state() -> dict:
    return json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


def find_ad(identity, tenancy_id: str) -> str:
    ads = identity.list_availability_domains(tenancy_id).data
    if not ads:
        raise RuntimeError("No availability domains found in region")
    return ads[0].name


def ensure_vcn(network, comp_id: str, state: dict) -> str:
    if state.get("vcn_id"):
        try:
            vcn = network.get_vcn(state["vcn_id"]).data
            if vcn.lifecycle_state == "AVAILABLE":
                return state["vcn_id"]
        except Exception:
            pass

    existing = network.list_vcns(compartment_id=comp_id, display_name=f"{PREFIX}-vcn").data
    for v in existing:
        if v.lifecycle_state == "AVAILABLE":
            state["vcn_id"] = v.id
            save_state(state)
            return v.id

    print(f"Creating VCN {PREFIX}-vcn ({VCN_CIDR})...")
    vcn = network.create_vcn(oci.core.models.CreateVcnDetails(
        compartment_id=comp_id,
        cidr_block=VCN_CIDR,
        display_name=f"{PREFIX}-vcn",
        dns_label="hispacs",
    )).data
    oci.wait_until(network, network.get_vcn(vcn.id), "lifecycle_state", "AVAILABLE", max_wait_seconds=180)
    state["vcn_id"] = vcn.id
    save_state(state)
    return vcn.id


def ensure_igw(network, comp_id: str, vcn_id: str, state: dict) -> str:
    if state.get("igw_id"):
        try:
            igw = network.get_internet_gateway(state["igw_id"]).data
            if igw.lifecycle_state == "AVAILABLE":
                return state["igw_id"]
        except Exception:
            pass

    existing = network.list_internet_gateways(compartment_id=comp_id, vcn_id=vcn_id).data
    for g in existing:
        if g.lifecycle_state == "AVAILABLE" and g.is_enabled:
            state["igw_id"] = g.id
            save_state(state)
            return g.id

    print(f"Creating Internet Gateway...")
    igw = network.create_internet_gateway(oci.core.models.CreateInternetGatewayDetails(
        compartment_id=comp_id,
        vcn_id=vcn_id,
        is_enabled=True,
        display_name=f"{PREFIX}-igw",
    )).data
    oci.wait_until(network, network.get_internet_gateway(igw.id), "lifecycle_state", "AVAILABLE", max_wait_seconds=120)
    state["igw_id"] = igw.id
    save_state(state)
    return igw.id


def ensure_route_table(network, comp_id: str, vcn_id: str, igw_id: str, state: dict) -> str:
    """Use the default route table of the VCN and add a 0.0.0.0/0 → IGW rule."""
    vcn = network.get_vcn(vcn_id).data
    rt_id = vcn.default_route_table_id

    rt = network.get_route_table(rt_id).data
    rules = list(rt.route_rules)
    has_default = any(r.destination == "0.0.0.0/0" for r in rules)
    if not has_default:
        print("Adding default route via Internet Gateway...")
        rules.append(oci.core.models.RouteRule(
            destination="0.0.0.0/0",
            destination_type="CIDR_BLOCK",
            network_entity_id=igw_id,
            description="Default route to internet",
        ))
        network.update_route_table(rt_id, oci.core.models.UpdateRouteTableDetails(route_rules=rules))
    state["route_table_id"] = rt_id
    save_state(state)
    return rt_id


def ensure_security_list(network, comp_id: str, vcn_id: str, state: dict) -> str:
    """Update the default security list to include our ingress ports."""
    vcn = network.get_vcn(vcn_id).data
    sl_id = vcn.default_security_list_id

    sl = network.get_security_list(sl_id).data
    existing_ports = set()
    for r in sl.ingress_security_rules:
        if r.tcp_options and r.tcp_options.destination_port_range:
            p = r.tcp_options.destination_port_range
            if p.min == p.max:
                existing_ports.add(p.min)

    new_rules = list(sl.ingress_security_rules)
    added = []
    for port, desc in INGRESS_PORTS:
        if port in existing_ports:
            continue
        new_rules.append(oci.core.models.IngressSecurityRule(
            protocol="6",  # TCP
            source="0.0.0.0/0",
            source_type="CIDR_BLOCK",
            is_stateless=False,
            tcp_options=oci.core.models.TcpOptions(
                destination_port_range=oci.core.models.PortRange(min=port, max=port),
            ),
            description=desc,
        ))
        added.append(port)

    if added:
        print(f"Opening ports: {added}")
        network.update_security_list(sl_id, oci.core.models.UpdateSecurityListDetails(
            ingress_security_rules=new_rules,
            egress_security_rules=sl.egress_security_rules,
        ))
    state["security_list_id"] = sl_id
    save_state(state)
    return sl_id


def ensure_subnet(network, comp_id: str, vcn_id: str, state: dict) -> str:
    if state.get("subnet_id"):
        try:
            sn = network.get_subnet(state["subnet_id"]).data
            if sn.lifecycle_state == "AVAILABLE":
                return state["subnet_id"]
        except Exception:
            pass

    existing = network.list_subnets(compartment_id=comp_id, vcn_id=vcn_id, display_name=f"{PREFIX}-subnet").data
    for s in existing:
        if s.lifecycle_state == "AVAILABLE":
            state["subnet_id"] = s.id
            save_state(state)
            return s.id

    print(f"Creating subnet ({SUBNET_CIDR})...")
    sn = network.create_subnet(oci.core.models.CreateSubnetDetails(
        compartment_id=comp_id,
        vcn_id=vcn_id,
        cidr_block=SUBNET_CIDR,
        display_name=f"{PREFIX}-subnet",
        prohibit_public_ip_on_vnic=False,
        dns_label="subnet1",
    )).data
    oci.wait_until(network, network.get_subnet(sn.id), "lifecycle_state", "AVAILABLE", max_wait_seconds=180)
    state["subnet_id"] = sn.id
    save_state(state)
    return sn.id


def find_ubuntu_arm_image(compute, comp_id: str) -> str:
    """Find latest Canonical Ubuntu 22.04 ARM64 image."""
    images = compute.list_images(
        compartment_id=comp_id,
        operating_system="Canonical Ubuntu",
        operating_system_version="22.04",
        shape="VM.Standard.A1.Flex",
        lifecycle_state="AVAILABLE",
        sort_by="TIMECREATED",
        sort_order="DESC",
    ).data
    aarch64 = [i for i in images if "aarch64" in (i.display_name or "").lower() or "arm" in (i.display_name or "").lower()]
    img = aarch64[0] if aarch64 else images[0]
    return img.id


def ensure_instance(compute, network, comp_id: str, subnet_id: str, ad: str, state: dict) -> dict:
    if state.get("instance_id"):
        try:
            inst = compute.get_instance(state["instance_id"]).data
            if inst.lifecycle_state in ("RUNNING", "PROVISIONING", "STARTING"):
                return _instance_info(compute, network, inst, comp_id)
        except Exception:
            pass

    existing = compute.list_instances(compartment_id=comp_id, display_name=f"{PREFIX}-vm").data
    for i in existing:
        if i.lifecycle_state in ("RUNNING", "PROVISIONING", "STARTING"):
            state["instance_id"] = i.id
            save_state(state)
            return _instance_info(compute, network, i, comp_id)

    print("Finding Ubuntu 22.04 ARM image...")
    image_id = find_ubuntu_arm_image(compute, comp_id)
    print(f"  image: {image_id}")

    print("Launching VM.Standard.A1.Flex (4 OCPU, 24 GB RAM)...")
    details = oci.core.models.LaunchInstanceDetails(
        availability_domain=ad,
        compartment_id=comp_id,
        display_name=f"{PREFIX}-vm",
        shape="VM.Standard.A1.Flex",
        shape_config=oci.core.models.LaunchInstanceShapeConfigDetails(
            ocpus=4,
            memory_in_gbs=24,
        ),
        source_details=oci.core.models.InstanceSourceViaImageDetails(
            source_type="image",
            image_id=image_id,
            boot_volume_size_in_gbs=100,
        ),
        create_vnic_details=oci.core.models.CreateVnicDetails(
            subnet_id=subnet_id,
            assign_public_ip=True,
        ),
        metadata={"ssh_authorized_keys": SSH_PUB_KEY},
    )
    inst = compute.launch_instance(details).data
    state["instance_id"] = inst.id
    save_state(state)

    print("Waiting for instance to reach RUNNING...")
    inst = oci.wait_until(compute, compute.get_instance(inst.id), "lifecycle_state", "RUNNING", max_wait_seconds=600).data
    return _instance_info(compute, network, inst, comp_id)


def _instance_info(compute, network, inst, comp_id: str) -> dict:
    vas = compute.list_vnic_attachments(compartment_id=comp_id, instance_id=inst.id).data
    public_ip = private_ip = None
    for va in vas:
        if va.lifecycle_state == "ATTACHED":
            vnic = network.get_vnic(va.vnic_id).data
            public_ip = vnic.public_ip
            private_ip = vnic.private_ip
            break
    return {
        "id": inst.id,
        "name": inst.display_name,
        "state": inst.lifecycle_state,
        "shape": inst.shape,
        "public_ip": public_ip,
        "private_ip": private_ip,
    }


def main() -> int:
    config = from_file(profile_name="DEFAULT")
    identity = oci.identity.IdentityClient(config)
    compute = oci.core.ComputeClient(config)
    network = oci.core.VirtualNetworkClient(config)

    tenancy_id = config["tenancy"]
    region = config["region"]
    print(f"Region: {region}")
    print(f"Tenancy: {tenancy_id}\n")

    ad = find_ad(identity, tenancy_id)
    print(f"AD: {ad}")

    state = load_state()
    state["region"] = region
    save_state(state)

    vcn_id = ensure_vcn(network, tenancy_id, state)
    print(f"VCN: {vcn_id}")

    igw_id = ensure_igw(network, tenancy_id, vcn_id, state)
    print(f"IGW: {igw_id}")

    ensure_route_table(network, tenancy_id, vcn_id, igw_id, state)
    ensure_security_list(network, tenancy_id, vcn_id, state)

    subnet_id = ensure_subnet(network, tenancy_id, vcn_id, state)
    print(f"Subnet: {subnet_id}")

    try:
        info = ensure_instance(compute, network, tenancy_id, subnet_id, ad, state)
    except oci.exceptions.ServiceError as e:
        if e.status == 500 and "Out of host capacity" in str(e.message):
            print("\n!! Out of ARM capacity in this AD. Retry later or use a different region.")
            print("   Try running again in ~1-2 hours.")
            return 3
        raise

    print("\n=== VM READY ===")
    print(json.dumps(info, indent=2))

    with open(HERE / "vm-info.txt", "w") as f:
        f.write(f"SSH:        ssh -i deploy/pacs/oracle/his-pacs-vm.key ubuntu@{info['public_ip']}\n")
        f.write(f"Public IP:  {info['public_ip']}\n")
        f.write(f"Private IP: {info['private_ip']}\n")
        f.write(f"Instance:   {info['id']}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
