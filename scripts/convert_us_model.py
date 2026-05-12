"""
Convert a thyroid ultrasound BIRADS / TI-RADS classifier → ONNX for browser
inference.

Output filename MUST match `appsettings.AiLabeling.Models[Modality=US].ModelFileName`
which currently is `us_thyroid_birads_v1.onnx`. Drop the file at
`backend/src/HIS.API/wwwroot/ai-models/` or upload to R2 + set
`AiLabeling__Models__2__ModelUrl` on Cloud Run.

Recommended pretrained sources:

  1. **DDTI Thyroid Ultrasound dataset** + ResNet18 baseline (CC-BY)
     http://cimalab.unal.edu.co/applications/thyroid/
     - 480 cases, 5 TI-RADS classes.

  2. **TN3K thyroid nodule classification** (open weights)
     https://github.com/haifangong/TRFE-Net-for-thyroid-nodule-segmentation
     - includes a classifier head; can be cropped to TI-RADS labels.

  3. **Open-i NIH thyroid dataset** for fine-tuning.

This script wires up a ResNet18 baseline; replace the random weights with
your fine-tuned checkpoint before production deploy.

Usage:
    pip install torch torchvision onnx onnxsim
    python scripts/convert_us_model.py

Verification:
    1. cp us_thyroid_birads_v1.onnx backend/src/HIS.API/wwwroot/ai-models/
    2. Restart backend
    3. GET /api/ai-labeling/modalities → US row should have available:true
    4. Open /radiology/viewer with an US study, click "Phân tích AI"
"""

import argparse
import os
import sys


def convert(output_file: str = "us_thyroid_birads_v1.onnx"):
    try:
        import torch
        import torchvision.models as tvm
        import onnx
        import onnxsim
    except ImportError as e:
        print(f"Missing package: {e}. Run: pip install torch torchvision onnx onnxsim")
        sys.exit(1)

    print("Building ResNet18 (5-class TI-RADS) ...")
    model = tvm.resnet18(weights=None)
    # 5 TI-RADS classes: TR1..TR5 (benign → highly suspicious).
    model.fc = torch.nn.Linear(model.fc.in_features, 5)
    model.eval()

    print("WARNING: random-init weights. Load a DDTI-finetuned checkpoint before production:")
    print("  ckpt = torch.load('thyroid_resnet18_ddti.pt', map_location='cpu')")
    print("  model.load_state_dict(ckpt)")

    class UsWrapper(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.m = m

        def forward(self, rgb):
            # Input (B, 3, 224, 224), pixels in [0, 1]. Standard ImageNet norm.
            mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
            std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
            x = (rgb - mean) / std
            logits = self.m(x)
            # TI-RADS is mutually exclusive — softmax, not sigmoid.
            return torch.softmax(logits, dim=1)

    wrapped = UsWrapper(model)
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
    print("\nNext steps:")
    print(f"  1. cp {output_file} backend/src/HIS.API/wwwroot/ai-models/")
    print(f"  2. Restart backend OR set env var AiLabeling__Models__2__ModelUrl=<R2 url>")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="us_thyroid_birads_v1.onnx")
    args = parser.parse_args()
    convert(args.output)
