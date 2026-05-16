"""
Seed Orthanc PACS với sample chest X-ray để test AI labeling.

Script này:
  1. Download 5 chest X-ray PNG/JPG public domain từ Wikimedia Commons.
  2. Convert từng ảnh sang minimal DICOM (CR/DX modality, grayscale).
  3. Push vào Orthanc qua REST API `POST /instances`.

Usage:
    pip install pydicom pillow requests numpy
    python scripts/seed_orthanc_chest_xrays.py

Sau khi chạy xong, Orthanc sẽ có ~5 study chest X-ray thật.
Gọi `POST /api/dev/link-radiology/today` để link với RadiologyRequests.
"""

import io
import sys
import uuid
from datetime import datetime

try:
    import requests
    import numpy as np
    from PIL import Image
    import pydicom
    from pydicom.dataset import Dataset, FileMetaDataset
    from pydicom.uid import generate_uid, CTImageStorage, ExplicitVRLittleEndian
except ImportError as e:
    print(f"Missing package: {e}. Run: pip install pydicom pillow requests numpy")
    sys.exit(1)

ORTHANC_URL = "https://168-110-52-7.nip.io"
ORTHANC_AUTH = ("admin", "Hz9KqW3PmN7xVfRbT4JdLc2YsEgA8UoI")

# Public domain chest X-ray images from Wikimedia Commons.
# Các URL này ổn định (Wikimedia không đổi ID).
# Chest X-rays from NLM Open-i (National Library of Medicine public database).
# Resolved from Openi search API `query=posteroanterior chest normal&it=x`.
BASE = "https://openi.nlm.nih.gov"
SAMPLES = [
    {"path": "/imgs/512/373/3523559/PMC3523559_dddt-6-385f1.png",
     "patient_id": "XR001", "patient_name": "DEMO^CHEST^EOSINOPHILIC",
     "description": "Chronic eosinophilic pneumonia"},
    {"path": "/imgs/512/88/2769394/PMC2769394_1757-1626-0002-0000007983-001.png",
     "patient_id": "XR002", "patient_name": "DEMO^CHEST^TB",
     "description": "Pulmonary miliary tuberculosis"},
    {"path": "/imgs/512/98/4219019/PMC4219019_13104_2014_3282_Fig1_HTML.png",
     "patient_id": "XR003", "patient_name": "DEMO^CHEST^TB_INTESTINAL",
     "description": "Intestinal tuberculosis chest X-ray"},
    {"path": "/imgs/512/133/2783073/PMC2783073_1752-1947-3-74-1.png",
     "patient_id": "XR004", "patient_name": "DEMO^CHEST^AFOP",
     "description": "Acute fibrinous and organising pneumonia"},
    {"path": "/imgs/512/319/3201101/PMC3201101_ccrep-4-2011-029f3.png",
     "patient_id": "XR005", "patient_name": "DEMO^CHEST^MYCOBACTERIUM",
     "description": "Mycobacterium szulgai pulmonary"},
    {"path": "/imgs/512/145/145/CXR145_IM-0290-1001.png",
     "patient_id": "XR006", "patient_name": "DEMO^CHEST^NORMAL",
     "description": "Normal chest radiograph"},
]
SAMPLES = [{**s, "url": BASE + s["path"]} for s in SAMPLES]


def download_image(url: str) -> np.ndarray:
    resp = requests.get(url, headers={
        "User-Agent": "HIS-seed-script/1.0 (contact@example.com)",
        "Accept": "image/*",
    }, timeout=30, allow_redirects=True)
    resp.raise_for_status()
    img = Image.open(io.BytesIO(resp.content)).convert("L")  # grayscale
    # Resize to 1024x1024 max để không quá nặng + consistent dimension
    img.thumbnail((1024, 1024))
    return np.asarray(img, dtype=np.uint16)


def array_to_dicom(pixel_array: np.ndarray, sample: dict) -> bytes:
    """Build minimal CR-modality DICOM from a grayscale numpy array."""
    # Stretch to full 12-bit range (X-rays thường 12-bit)
    if pixel_array.dtype != np.uint16:
        pixel_array = pixel_array.astype(np.uint16)
    pmin, pmax = pixel_array.min(), pixel_array.max()
    if pmax > pmin:
        pixel_array = ((pixel_array.astype(np.float32) - pmin) * (4095.0 / (pmax - pmin))).astype(np.uint16)

    rows, cols = pixel_array.shape

    # File meta
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = CTImageStorage  # reuse; could use CR/DX Storage UID
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = "1.2.3.4"

    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    # Patient + Study + Series + Instance UIDs
    study_uid = generate_uid()
    series_uid = generate_uid()
    sop_uid = file_meta.MediaStorageSOPInstanceUID

    now = datetime.now()
    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.SOPInstanceUID = sop_uid
    ds.StudyInstanceUID = study_uid
    ds.SeriesInstanceUID = series_uid
    ds.PatientID = sample["patient_id"]
    ds.PatientName = sample["patient_name"]
    ds.PatientBirthDate = "19800101"
    ds.PatientSex = "O"

    ds.StudyDate = now.strftime("%Y%m%d")
    ds.StudyTime = now.strftime("%H%M%S")
    ds.StudyDescription = sample["description"]
    ds.SeriesDescription = sample["description"]
    ds.Modality = "CR"  # Computed Radiography (chest X-ray)
    ds.AccessionNumber = sample["patient_id"]
    ds.StudyID = "1"
    ds.SeriesNumber = 1
    ds.InstanceNumber = 1

    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.Rows = rows
    ds.Columns = cols
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.WindowCenter = 2048
    ds.WindowWidth = 4096

    ds.PixelData = pixel_array.tobytes()

    buf = io.BytesIO()
    pydicom.dcmwrite(buf, ds, write_like_original=False)
    return buf.getvalue()


def push_to_orthanc(dicom_bytes: bytes) -> dict:
    url = f"{ORTHANC_URL}/instances"
    r = requests.post(
        url,
        data=dicom_bytes,
        auth=ORTHANC_AUTH,
        headers={"Content-Type": "application/dicom"},
        timeout=60,
        verify=True,
    )
    r.raise_for_status()
    return r.json()


def main():
    print(f"Seeding Orthanc at {ORTHANC_URL} with {len(SAMPLES)} chest X-rays")
    print("=" * 70)

    for i, sample in enumerate(SAMPLES, 1):
        print(f"\n[{i}/{len(SAMPLES)}] {sample['patient_name']}")
        print(f"  URL: {sample['url']}")
        try:
            arr = download_image(sample["url"])
            print(f"  Downloaded: {arr.shape} uint16")
        except Exception as e:
            print(f"  ! Download failed: {e}")
            continue

        try:
            dicom_bytes = array_to_dicom(arr, sample)
            print(f"  DICOM built: {len(dicom_bytes)/1024:.1f} KB")
        except Exception as e:
            print(f"  ! Convert failed: {e}")
            continue

        try:
            result = push_to_orthanc(dicom_bytes)
            print(f"  ✓ Pushed: OrthancID={result.get('ID','?')[:16]}... Status={result.get('Status','?')}")
        except Exception as e:
            print(f"  ! Push failed: {e}")
            continue

    # Verify: list studies
    try:
        r = requests.get(f"{ORTHANC_URL}/studies", auth=ORTHANC_AUTH, timeout=15)
        r.raise_for_status()
        print(f"\nOrthanc now has {len(r.json())} studies total")
    except Exception as e:
        print(f"Verify failed: {e}")


if __name__ == "__main__":
    main()
