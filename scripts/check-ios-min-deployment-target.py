#!/usr/bin/env python3
"""Kiem moi plugin iOS cua app nguoi benh co con chay duoc tren iOS 12.0 khong.

Chay:
    python scripts/check-ios-min-deployment-target.py [thu-muc-app] [muc-toi-thieu]

Vi sao can:
    Ho so moi thau yeu cau "iOS 12.0 tro len". Mot plugin duoc nang len ban moi doi
    iOS 13 hay 15 la ca app mat iOS 12 — nhung `flutter pub upgrade` chay xong van bao
    thanh cong, `flutter analyze` van sach, va tren may Windows thi KHONG co cach nao
    biet vi khong build duoc iOS. Loi chi lo ra luc `pod install` tren macOS.

    Da tung xay ra that: biometric_signature 13.x doi iOS 13, firebase_core 4.x doi
    iOS 15. Xem docs/features/patient-app/README.md §6.2.

Cach kiem: doc pubspec.lock lay dung phien ban dang dung, roi soi podspec cua tung
plugin trong pub cache. Khong can macOS, khong can mang.
"""
import glob
import os
import re
import sys


def pub_cache_dir():
    """Thu muc pub cache, uu tien bien moi truong de chay duoc tren CI lan may dev."""
    if os.environ.get("PUB_CACHE"):
        return os.path.join(os.environ["PUB_CACHE"], "hosted", "pub.dev")
    home = os.path.expanduser("~")
    candidates = [
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Pub", "Cache", "hosted", "pub.dev"),
        os.path.join(home, ".pub-cache", "hosted", "pub.dev"),
        os.path.join(home, "AppData", "Local", "Pub", "Cache", "hosted", "pub.dev"),
    ]
    for path in candidates:
        if path and os.path.isdir(path):
            return path
    return None


def locked_versions(app_dir):
    lock_path = os.path.join(app_dir, "pubspec.lock")
    if not os.path.isfile(lock_path):
        sys.exit(f"Khong thay {lock_path}. Chay `flutter pub get` truoc.")
    text = open(lock_path, encoding="utf-8").read()
    return dict(re.findall(r'^  ([a-z0-9_]+):\n(?:.*\n)*?    version: "([^"]+)"', text, re.M))


def ios_minimum(package_dir):
    """Muc iOS toi thieu khai trong podspec, hoac None neu goi khong co phan iOS."""
    specs = (glob.glob(os.path.join(package_dir, "ios", "*.podspec"))
             + glob.glob(os.path.join(package_dir, "darwin", "*.podspec")))
    for spec in specs:
        text = open(spec, encoding="utf-8", errors="ignore").read()
        match = (re.search(r"s\.platform\s*=\s*:ios,\s*'([\d.]+)'", text)
                 or re.search(r"ios\.deployment_target\s*=\s*'([\d.]+)'", text))
        if match:
            return match.group(1)
    return None


def main():
    app_dir = sys.argv[1] if len(sys.argv) > 1 else "mobile/patient_app"
    limit = float(sys.argv[2]) if len(sys.argv) > 2 else 12.0

    cache = pub_cache_dir()
    if not cache:
        sys.exit("Khong tim thay pub cache. Dat bien PUB_CACHE roi chay lai.")

    checked, blockers = [], []
    for package, version in locked_versions(app_dir).items():
        package_dir = os.path.join(cache, f"{package}-{version}")
        if not os.path.isdir(package_dir):
            continue
        minimum = ios_minimum(package_dir)
        if minimum is None:
            continue
        checked.append((float(minimum), package, version, minimum))
        if float(minimum) > limit:
            blockers.append((package, version, minimum))

    checked.sort(reverse=True)
    print(f"Da soi {len(checked)} plugin co phan iOS. Nguong yeu cau: {limit}")
    for value, package, version, minimum in checked[:10]:
        mark = "  <-- CHAN" if value > limit else ""
        print(f"  {minimum:>6}  {package} ({version}){mark}")

    if blockers:
        print()
        for package, version, minimum in blockers:
            print(f"::error::{package} {version} doi iOS toi thieu {minimum}, "
                  f"vuot nguong {limit} ma ho so moi thau cam ket.")
        print("Ha phien ban goi do, hoac xin chu dau tu chap thuan nang muc iOS toi thieu.")
        return 1

    print(f"\nOK: khong plugin nao vuot iOS {limit}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
