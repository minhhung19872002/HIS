#!/usr/bin/env python
"""Provision a 2nd AMD Micro VM for the Jitsi-meet stack.

Reuses the VCN/subnet/SSH key from provision.py / provision_amd.py. The
existing PACS VM (his-pacs-vm-amd, 168.110.52.7) is left untouched — this
script always launches a brand-new instance under display_name
his-jitsi-vm-amd and writes its IPs to state.json under jitsi_* keys.

Shape VM.Standard.E2.1.Micro: always-available free tier AMD x86_64
(1/8 OCPU + 1 GB RAM). Enough for Jitsi-meet + JVB; Jibri (recording)
won't fit at 1 GB RAM and will need ARM later.
"""
import json
import sys
from pathlib import Path

import oci
from oci.config import from_file

HERE = Path(__file__).parent
STATE_FILE = HERE / "state.json"
SSH_PUB_KEY = (HERE / "his-pacs-vm.key.pub").read_text(encoding="utf-8").strip()
JITSI_NAME = "his-jitsi-vm-amd"


def find_ubuntu_x86_image(compute, comp_id: str) -> str:
    images = compute.list_images(
        compartment_id=comp_id,
        operating_system="Canonical Ubuntu",
        operating_system_version="22.04",
        shape="VM.Standard.E2.1.Micro",
        lifecycle_state="AVAILABLE",
        sort_by="TIMECREATED",
        sort_order="DESC",
    ).data
    return images[0].id


def main() -> int:
    config = from_file(profile_name="DEFAULT")
    compute = oci.core.ComputeClient(config)
    network = oci.core.VirtualNetworkClient(config)
    identity = oci.identity.IdentityClient(config)

    tenancy_id = config["tenancy"]
    state = json.loads(STATE_FILE.read_text())
    subnet_id = state["subnet_id"]
    ad = identity.list_availability_domains(tenancy_id).data[0].name
    print(f"AD:     {ad}")
    print(f"Subnet: {subnet_id}")

    existing = compute.list_instances(compartment_id=tenancy_id, display_name=JITSI_NAME).data
    active = [i for i in existing if i.lifecycle_state not in ("TERMINATED", "TERMINATING")]
    if active:
        inst = active[0]
        print(f"Reusing existing Jitsi instance: {inst.id}")
    else:
        image_id = find_ubuntu_x86_image(compute, tenancy_id)
        print(f"Image:  {image_id}")
        print("Launching VM.Standard.E2.1.Micro (1/8 OCPU, 1 GB RAM) for Jitsi...")
        inst = compute.launch_instance(oci.core.models.LaunchInstanceDetails(
            availability_domain=ad,
            compartment_id=tenancy_id,
            display_name=JITSI_NAME,
            shape="VM.Standard.E2.1.Micro",
            source_details=oci.core.models.InstanceSourceViaImageDetails(
                source_type="image",
                image_id=image_id,
            ),
            create_vnic_details=oci.core.models.CreateVnicDetails(
                subnet_id=subnet_id,
                assign_public_ip=True,
            ),
            metadata={"ssh_authorized_keys": SSH_PUB_KEY},
        )).data

    print("Waiting for RUNNING...")
    inst = oci.wait_until(
        compute, compute.get_instance(inst.id),
        "lifecycle_state", "RUNNING", max_wait_seconds=600,
    ).data
    state["jitsi_instance_id"] = inst.id

    vas = compute.list_vnic_attachments(compartment_id=tenancy_id, instance_id=inst.id).data
    public_ip = private_ip = None
    for va in vas:
        if va.lifecycle_state == "ATTACHED":
            vnic = network.get_vnic(va.vnic_id).data
            public_ip = vnic.public_ip
            private_ip = vnic.private_ip
            break

    state["jitsi_public_ip"] = public_ip
    state["jitsi_private_ip"] = private_ip
    STATE_FILE.write_text(json.dumps(state, indent=2))

    print("\n=== JITSI AMD VM READY ===")
    print(f"  Instance:   {inst.id}")
    print(f"  State:      {inst.lifecycle_state}")
    print(f"  Shape:      {inst.shape}")
    print(f"  Public IP:  {public_ip}")
    print(f"  Private IP: {private_ip}")
    print(f"  SSH:        ssh -i deploy/pacs/oracle/his-pacs-vm.key ubuntu@{public_ip}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
