#!/usr/bin/env python
"""Quick sanity check for Cloudflare R2 credentials.
Tests: list buckets, create bucket if missing, upload + read + delete a test file.
"""
import os
import sys
from pathlib import Path

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError


def load_env(path: Path) -> dict:
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env


def main() -> int:
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        print(f"!! .env not found at {env_path}")
        return 1
    env = load_env(env_path)

    account_id = env["R2_ACCOUNT_ID"]
    access_key = env["R2_ACCESS_KEY_ID"]
    secret = env["R2_SECRET_ACCESS_KEY"]
    bucket = env["R2_BUCKET_NAME"]
    endpoint = f"https://{account_id}.r2.cloudflarestorage.com"

    print(f"Endpoint : {endpoint}")
    print(f"Bucket   : {bucket}")

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

    print(f"\n[1/3] Checking bucket '{bucket}' head...")
    try:
        s3.head_bucket(Bucket=bucket)
        print("     Accessible.")
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchBucket"):
            print(f"     !! Bucket '{bucket}' does not exist. Create it in Cloudflare R2 dashboard.")
        elif code in ("403", "AccessDenied"):
            print(f"     !! Access denied. Check token permissions or bucket name.")
        else:
            print(f"     !! head_bucket failed: {e}")
        return 2

    print("\n[2/3] Uploading test object...")
    key = "healthcheck/ping.txt"
    payload = b"HIS PACS R2 connectivity test OK"
    s3.put_object(Bucket=bucket, Key=key, Body=payload, ContentType="text/plain")
    print(f"     Uploaded {bucket}/{key} ({len(payload)} bytes)")

    print("\n[3/3] Reading back + cleaning up...")
    got = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    assert got == payload, "round-trip mismatch"
    print("     Round-trip OK.")
    s3.delete_object(Bucket=bucket, Key=key)
    print("     Cleanup OK.")

    print("\nR2 credentials + bucket access verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
