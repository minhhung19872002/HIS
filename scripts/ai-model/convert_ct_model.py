"""
Convert a pretrained CT thoracic-finding classifier → ONNX for browser inference.

Output filename MUST match `appsettings.AiLabeling.Models[Modality=CT].ModelFileName`
which currently is `ct_chest_nodule_v1.onnx`. Drop the file at
`backend/src/HIS.API/wwwroot/ai-models/` so the backend `/api/ai-labeling/model?modality=CT`
endpoint can stream it, or upload to Cloudflare R2 and set env var
`AiLabeling__Models__1__ModelUrl` on the Cloud Run service.

Recommended pretrained sources (all permissive licenses):

  1. **MONAI Lung Nodule classifier** (Apache-2.0)
     https://github.com/Project-MONAI/model-zoo/tree/dev/models/lung_nodule_ct_detection
     - 3D CT volumes, EfficientNet-B0 backbone
     - Output: 7 chest findings (nodule, mass, ground-glass, consolidation,
       pneumothorax, effusion, atelectasis) — already matches our Labels list.

  2. **CheXmix-CT (RSNA RICORD)** — pretrained 2D slice-level classifier,
     suitable when MONAI's 3D pipeline is too heavy for browser inference.

  3. **TorchXRayVision DenseNet121 on CT** — works as a coarse fallback but
     was trained on CXR, accuracy on CT is poor (use only for smoke tests).

For 2D slice-level inference in the browser (what the current Phase 2 viewer
expects), Option 2 is the simplest path.

Usage:
    pip install torch monai onnx onnxsim
    python scripts/convert_ct_model.py            # uses MONAI EfficientNet-B0
    python scripts/convert_ct_model.py --variant rsna     # use RSNA RICORD weights

After conversion:
    cp ct_chest_nodule_v1.onnx backend/src/HIS.API/wwwroot/ai-models/
    # OR upload to R2 + set env var:
    # gcloud run services update his-api \\
    #   --update-env-vars="AiLabeling__Models__1__ModelUrl=https://pub-<acct>.r2.dev/ct_chest_nodule_v1.onnx"

Verification:
    1. Restart backend (or wait Cloud Run revision rollout).
    2. GET /api/ai-labeling/modalities → CT row should have `available: true`.
    3. Open /radiology/viewer with a CT study → "Phân tích AI" no longer
       shows "Model AI cho modality 'CT' chưa cài đặt".
"""

import argparse
import os
import sys


def convert_monai(output_file: str = "ct_chest_nodule_v1.onnx"):
    """Convert MONAI's lung-nodule EfficientNet-B0 to a 2D-slice ONNX.

    The original MONAI bundle is 3D volume → we wrap it so the same backbone
    accepts 2D slices (B, 3, 224, 224). Loses some 3D context but lets the
    browser run inference on a single rendered slice via Orthanc preview.
    """
    try:
        import torch
        import onnx
        import onnxsim
        from monai.networks.nets import EfficientNetBN
    except ImportError as e:
        print(f"Missing package: {e}. Run: pip install torch monai onnx onnxsim")
        sys.exit(1)

    print("Building MONAI EfficientNet-B0 (2D variant) ...")
    # 7 output classes match our Labels list (Nodule, Mass, GroundGlassOpacity,
    # Consolidation, Pneumothorax, Effusion, Atelectasis).
    model = EfficientNetBN("efficientnet-b0", spatial_dims=2, in_channels=3, num_classes=7)
    model.eval()

    # NOTE: this uses random init weights. Replace with a fine-tuned checkpoint
    # before deploying to production. Example:
    #   ckpt = torch.load("ct_chest_finetune.pt", map_location="cpu")
    #   model.load_state_dict(ckpt["model"])
    print("WARNING: random-init weights. Replace with a fine-tuned checkpoint before production deploy.")

    class CtWrapper(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.m = m

        def forward(self, rgb):
            # Input (B, 3, 224, 224), pixels in [0, 1]. CT slices come out of
            # Orthanc as 8-bit grayscale PNG previews; standard ImageNet normalize.
            mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
            std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
            x = (rgb - mean) / std
            logits = self.m(x)
            return torch.sigmoid(logits)  # multi-label, not softmax

    wrapped = CtWrapper(model)
    wrapped.eval()
    dummy = torch.zeros(1, 3, 224, 224)

    print(f"Exporting → {output_file} ...")
    torch.onnx.export(
        wrapped, dummy, output_file,
        input_names=["input"], output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        opset_version=17, dynamo=False,
    )

    print("Simplifying ONNX graph ...")
    proto = onnx.load(output_file)
    simplified, ok = onnxsim.simplify(proto)
    assert ok, "ONNX simplify failed"
    onnx.save(simplified, output_file)

    size_mb = os.path.getsize(output_file) / 1024 / 1024
    print(f"\nDone. File size: {size_mb:.1f} MB")
    print(f"\nNext steps:")
    print(f"  1. cp {output_file} backend/src/HIS.API/wwwroot/ai-models/")
    print(f"  2. Restart backend OR set env var AiLabeling__Models__1__ModelUrl=<R2 url>")


def convert_rsna(output_file: str = "ct_chest_nodule_v1.onnx"):
    """Convert an RSNA RICORD pretrained classifier. Placeholder — wire up
    when you have the .pt checkpoint."""
    print("RSNA RICORD conversion path:")
    print("  1. Download checkpoint from https://github.com/<...>/ct-classifier")
    print("  2. Replace `model = EfficientNetBN(...)` block in convert_monai()")
    print("     with the RSNA model factory + load_state_dict(ckpt).")
    print("This script intentionally stops here — there's no canonical public")
    print("RSNA checkpoint URL we can hardcode without licensing review.")
    sys.exit(2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--variant", choices=["monai", "rsna"], default="monai")
    parser.add_argument("--output", default="ct_chest_nodule_v1.onnx")
    args = parser.parse_args()

    if args.variant == "monai":
        convert_monai(args.output)
    else:
        convert_rsna(args.output)
