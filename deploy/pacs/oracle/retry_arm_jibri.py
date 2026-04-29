#!/usr/bin/env python
"""Background retry loop for ARM Ampere A1 capacity (Jibri-target).

Sibling of retry_arm.py with a separate display_name so neither
script collides with the other. Targets a fresh ARM VM intended
for the Jitsi+Jibri stack (recording requires ≥2 GB RAM that the
AMD Micro can't supply).

Attempts to launch his-jibri-vm-arm (ARM 4 OCPU, 24 GB) every 5
minutes. When capacity frees up, writes vm-info-jibri-arm.txt
with the new VM details and exits.

Run in background; cancel with Ctrl-C when no longer needed.
"""
import json
import sys
import time
from pathlib import Path

import oci
from oci.config import from_file

HERE = Path(__file__).parent
STATE_FILE = HERE / "state.json"
LOG_FILE = HERE / "retry_arm_jibri.log"
SSH_PUB_KEY = (HERE / "his-pacs-vm.key.pub").read_text(encoding="utf-8").strip()

VM_NAME = "his-jibri-vm-arm"
RETRY_INTERVAL = 300  # 5 minutes


def log(msg: str) -> None:
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def find_ubuntu_arm_image(compute, comp_id: str) -> str:
    images = compute.list_images(
        compartment_id=comp_id,
        operating_system="Canonical Ubuntu",
        operating_system_version="22.04",
        shape="VM.Standard.A1.Flex",
        lifecycle_state="AVAILABLE",
        sort_by="TIMECREATED",
        sort_order="DESC",
    ).data
    return images[0].id


def try_launch(config, state: dict) -> dict | None:
    compute = oci.core.ComputeClient(config)
    network = oci.core.VirtualNetworkClient(config)
    identity = oci.identity.IdentityClient(config)

    tenancy_id = config["tenancy"]
    subnet_id = state["subnet_id"]
    ad = identity.list_availability_domains(tenancy_id).data[0].name

    existing = compute.list_instances(compartment_id=tenancy_id, display_name=VM_NAME).data
    active = [i for i in existing if i.lifecycle_state in ("RUNNING", "PROVISIONING", "STARTING")]
    if active:
        log(f"Jibri ARM instance already exists: {active[0].id} ({active[0].lifecycle_state})")
        return None

    image_id = find_ubuntu_arm_image(compute, tenancy_id)

    try:
        inst = compute.launch_instance(oci.core.models.LaunchInstanceDetails(
            availability_domain=ad,
            compartment_id=tenancy_id,
            display_name=VM_NAME,
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
        )).data
    except oci.exceptions.ServiceError as e:
        if "Out of host capacity" in str(e.message) or e.status == 500:
            return None
        raise

    log(f"Jibri ARM launched: {inst.id} — waiting for RUNNING...")
    inst = oci.wait_until(
        compute, compute.get_instance(inst.id),
        "lifecycle_state", "RUNNING", max_wait_seconds=600,
    ).data
    vas = compute.list_vnic_attachments(compartment_id=tenancy_id, instance_id=inst.id).data
    public_ip = private_ip = None
    for va in vas:
        if va.lifecycle_state == "ATTACHED":
            vnic = network.get_vnic(va.vnic_id).data
            public_ip = vnic.public_ip
            private_ip = vnic.private_ip
            break

    info = {
        "instance_id": inst.id,
        "public_ip": public_ip,
        "private_ip": private_ip,
    }
    state.update({
        "jibri_arm_instance_id": inst.id,
        "jibri_arm_public_ip": public_ip,
        "jibri_arm_private_ip": private_ip,
    })
    STATE_FILE.write_text(json.dumps(state, indent=2))
    return info


def main() -> int:
    config = from_file(profile_name="DEFAULT")
    state = json.loads(STATE_FILE.read_text())

    attempt = 0
    start = time.time()
    # 24 h cap — Tokyo capacity ARM may take days; user can re-run
    max_duration = 24 * 3600

    log(f"Starting Jibri ARM retry loop (5-min interval, 24h cap, target={VM_NAME})...")
    while True:
        attempt += 1
        elapsed = int(time.time() - start)
        log(f"Attempt #{attempt} (elapsed {elapsed}s)...")
        try:
            result = try_launch(config, state)
        except Exception as e:
            log(f"Unexpected error: {type(e).__name__}: {e}")
            result = None

        if result:
            log(f"SUCCESS! Jibri ARM VM ready at {result['public_ip']}")
            (HERE / "vm-info-jibri-arm.txt").write_text(
                f"Public IP: {result['public_ip']}\n"
                f"Instance:  {result['instance_id']}\n"
                f"SSH:       ssh -i deploy/pacs/oracle/his-pacs-vm.key ubuntu@{result['public_ip']}\n"
            )
            return 0

        if time.time() - start > max_duration:
            log("Max duration reached without capacity. Exiting.")
            return 1

        log(f"Still out of capacity; sleeping {RETRY_INTERVAL}s...")
        time.sleep(RETRY_INTERVAL)


if __name__ == "__main__":
    sys.exit(main())
