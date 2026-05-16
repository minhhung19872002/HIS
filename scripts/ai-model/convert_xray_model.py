"""
Convert TorchXRayVision DenseNet121-NIH14 pretrained → ONNX for browser inference.

Usage (1 lần duy nhất trên máy có Python 3.10+):
    pip install torchxrayvision torch onnx onnxsim
    python scripts/convert_xray_model.py

Output:
    chestxray_densenet121_nih14.onnx  (~30 MB)

Sau đó upload lên Cloudflare R2:
    wrangler r2 object put his-ai-models/chestxray_densenet121_nih14.onnx \
        --file chestxray_densenet121_nih14.onnx
    # hoặc qua Cloudflare dashboard

Cấu hình R2 bucket:
    - Public access: enable (read-only)
    - CORS: allow origin https://his-psi.vercel.app, method GET
    - Hoặc dùng Custom Domain trong R2 dashboard.

Set env vars trên Cloud Run his-api:
    AiLabeling__ModelUrl=https://pub-<account>.r2.dev/chestxray_densenet121_nih14.onnx

Test end-to-end:
    1. Mở https://his-psi.vercel.app/radiology/viewer?study=<uid>
    2. Click "Phân tích AI"
    3. Xem kết quả + accept/reject
"""

import sys

try:
    import torch
    import torchxrayvision as xrv
    import onnxsim
except ImportError as e:
    print(f"Missing package: {e}. Run: pip install torchxrayvision torch onnx onnxsim")
    sys.exit(1)


def convert(variant: str = "densenet121-res224-all", with_features: bool = False):
    """
    Variants:
      densenet121-res224-nih    (27MB, 224px, NIH only — weak)
      densenet121-res224-all    (27MB, 224px, 8 datasets — strong, RECOMMENDED)
      resnet50-res512-all       (~130MB, 512px, 8 datasets — strongest)
      densenet121-res224-chex   (27MB, CheXpert)
      densenet121-res224-mimic_ch (27MB, MIMIC-CXR)
    """
    print(f"Loading TorchXRayVision pretrained {variant}...")
    if variant.startswith("resnet50"):
        model = xrv.models.ResNet(weights=variant)
        input_size = 512
    else:
        model = xrv.models.DenseNet(weights=variant)
        input_size = 224
    model.eval()
    targets_cache = list(model.targets)  # capture before wrapping

    # Bypass TorchXRayVision's `warn_normalization` (has data-dependent branches
    # that fail during ONNX tracing). Monkey-patch to no-op then reuse each
    # model's native forward which handles DenseNet/ResNet internals correctly.
    xrv.utils.warn_normalization = lambda x: None

    class RgbToGrayWrapper(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.m = m

        def forward(self, rgb):
            # rgb: (B, 3, H, W) in [0, 1]
            gray = 0.299 * rgb[:, 0:1] + 0.587 * rgb[:, 1:2] + 0.114 * rgb[:, 2:3]
            # Scale [0,1] → [-1024, 1024] as TorchXRayVision expects
            x = gray * 2048 - 1024
            out = self.m(x)
            return torch.sigmoid(out)

    class RgbToGrayWithFeatures(torch.nn.Module):
        """Two-output variant for Grad-CAM in the browser.
        Exposes (probs, last_conv_features) so the frontend can compute
        Grad-CAM = sum_c (w_c · A_c) with FC weights it knows up-front
        (we serialize the FC weights to JSON alongside the model)."""
        def __init__(self, m):
            super().__init__()
            self.m = m

        def forward(self, rgb):
            gray = 0.299 * rgb[:, 0:1] + 0.587 * rgb[:, 1:2] + 0.114 * rgb[:, 2:3]
            x = gray * 2048 - 1024
            # DenseNet body → features map (B, 1024, 7, 7) for 224 input.
            # The TorchXRayVision DenseNet defines a `.features` Sequential and
            # a `.classifier` Linear; we replicate the forward path that
            # `xrv.models.DenseNet.features2` / `forward` uses.
            features = self.m.features(x)
            out = torch.nn.functional.relu(features, inplace=False)
            pooled = torch.nn.functional.adaptive_avg_pool2d(out, (1, 1)).flatten(1)
            logits = self.m.classifier(pooled)
            probs = torch.sigmoid(logits)
            return probs, features

    if with_features:
        full = RgbToGrayWithFeatures(model)
    else:
        full = RgbToGrayWrapper(model)
    full.eval()

    dummy_rgb = torch.zeros(1, 3, input_size, input_size)

    # Output filename encodes variant so we can ship multiple models.
    safe_name = variant.replace("-", "_")
    suffix = "_gradcam" if with_features else ""
    output_file = f"chestxray_{safe_name}{suffix}.onnx"
    print(f"Exporting to {output_file}...")
    if with_features:
        torch.onnx.export(
            full,
            dummy_rgb,
            output_file,
            input_names=["input"],
            output_names=["probs", "features"],
            dynamic_axes={
                "input": {0: "batch"},
                "probs": {0: "batch"},
                "features": {0: "batch"},
            },
            opset_version=17,
            dynamo=False,
        )
        # Save FC weights so the browser can compute class-specific Grad-CAM
        # without needing the full classifier forward path.
        import json
        fc = model.classifier
        weights = fc.weight.detach().cpu().numpy().tolist()  # (N_labels, 1024)
        bias = fc.bias.detach().cpu().numpy().tolist() if fc.bias is not None else None
        weights_file = output_file.replace(".onnx", "_fc_weights.json")
        with open(weights_file, "w") as f:
            json.dump({"weight": weights, "bias": bias, "labels": targets_cache}, f)
        print(f"Saved FC weights → {weights_file}")
    else:
        torch.onnx.export(
            full,
            dummy_rgb,
            output_file,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
            opset_version=17,
            dynamo=False,
        )

    print("Simplifying ONNX graph...")
    import onnx
    model_proto = onnx.load(output_file)
    simplified, check = onnxsim.simplify(model_proto)
    assert check, "Simplified ONNX failed validation"
    onnx.save(simplified, output_file)

    # Print label order so user can verify matches appsettings
    targets = targets_cache
    print(f"\nModel exported. {len(targets)} output labels:")
    for i, t in enumerate(targets):
        print(f"  [{i:2d}] {t}")

    import os
    size_mb = os.path.getsize(output_file) / 1024 / 1024
    print(f"\nFile size: {size_mb:.1f} MB")
    print("\nNext steps:")
    print(f"  1. Upload {output_file} to Cloudflare R2 (bucket his-ai-models, public read)")
    print(f"  2. Set env var AiLabeling__ModelUrl on Cloud Run = public URL")
    print(f"  3. Set env var AiLabeling__Labels = {targets}")


if __name__ == "__main__":
    import sys
    variant = sys.argv[1] if len(sys.argv) > 1 else "densenet121-res224-all"
    # Second arg `--gradcam` exports a 2-output ONNX (probs + features) so
    # the browser can compute Grad-CAM proper. Use this when you want
    # higher-quality overlays than the default occlusion fallback.
    with_features = "--gradcam" in sys.argv
    convert(variant, with_features=with_features)
