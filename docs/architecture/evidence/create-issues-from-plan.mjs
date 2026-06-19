/* ============================================================================
   Tạo issue GitHub từ data/issue-plan.json (gom 1415 task -> 54 issue).
   DRY-RUN mặc định. Chạy thật:  node create-issues-from-plan.mjs --apply
   Idempotent: bỏ qua nếu đã có issue trùng tiêu đề; #294-297 thì APPEND checklist.
   Yêu cầu: gh CLI đã đăng nhập.  Repo: minhhung19872002/HIS
   ============================================================================ */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = "minhhung19872002/HIS";
const APPLY = process.argv.includes("--apply");
const plan = JSON.parse(fs.readFileSync(path.join(HERE, "data", "issue-plan.json"), "utf8")).plan;

const gh = (args) => {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error("gh " + args.join(" ") + "\n" + (r.stderr || r.stdout));
  return (r.stdout || "").trim();
};
const tmp = (txt) => { const f = path.join(os.tmpdir(), "iss-" + Math.abs(hash(txt)) + ".md"); fs.writeFileSync(f, txt, "utf8"); return f; };
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return h; }

let created = 0, skipped = 0, updated = 0;
for (const it of plan) {
  if (it.action === "create") {
    // idempotent: tìm tiêu đề trùng (mọi state)
    const found = JSON.parse(gh(["issue", "list", "--repo", REPO, "--search", `${it.title} in:title`, "--state", "all", "--limit", "20", "--json", "number,title"]));
    const dup = found.find((x) => x.title === it.title);
    if (dup) { console.log(`SKIP (đã có #${dup.number}): ${it.title}`); skipped++; continue; }
    if (!APPLY) { console.log(`[dry] CREATE: ${it.title}  (${it.taskCount} task, label ${it.labels.join("+")})`); created++; continue; }
    const url = gh(["issue", "create", "--repo", REPO, "--title", it.title, "--label", it.labels.join(","), "--body-file", tmp(it.body)]);
    console.log(`CREATED ${url}`); created++;
  } else if (it.action === "update" && it.existingIssue) {
    const num = it.existingIssue.replace("#", "");
    const checklist = it.body.slice(it.body.indexOf("### Checklist evidence"));
    if (!APPLY) { console.log(`[dry] UPDATE #${num} (append checklist ${it.taskCount} task): ${it.title_name}`); updated++; continue; }
    const cur = JSON.parse(gh(["issue", "view", num, "--repo", REPO, "--json", "body"])).body || "";
    if (cur.includes("### Checklist evidence")) { console.log(`SKIP UPDATE #${num} (đã có checklist)`); skipped++; continue; }
    gh(["issue", "edit", num, "--repo", REPO, "--body-file", tmp(cur + "\n\n---\n" + checklist)]);
    console.log(`UPDATED #${num} (append checklist)`); updated++;
  }
}
console.log(`\n${APPLY ? "DONE" : "DRY-RUN"} — create=${created} update=${updated} skip=${skipped} / total ${plan.length}`);
if (!APPLY) console.log("Chạy thật:  node create-issues-from-plan.mjs --apply");
