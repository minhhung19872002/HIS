#!/usr/bin/env bash
# UserPromptSubmit hook — nhac chay PIPELINE cho task khong trivial (bo tro SKILL-ROUTER).
# + nudge SPARRING khi prompt co dau hieu quyet dinh/cau hoi chien luoc (calibrated, khong always-on).
# Giu NGAN de khong phinh context moi prompt. Chi tiet: .claude/workflow/workflow.md + skills/core-sparring-partner
IN=$(cat 2>/dev/null)   # doc prompt (JSON) de do tu-khoa; substring-match nen khong phu thuoc format
echo "PIPELINE: Trivial (≤5 dong·1 file·khong cham shared/contract/DB/auth/tien/patient-safety) hoac Q&A -> tra loi thang, BO pipeline+state-store+note-skill. Nguoc lai -> .claude/workflow/workflow.md (Router->Planner->Worker->Reviewer->Finalizer; state-store=GitHub Issue body; DONE chi sau khi user push). Git-ops chi tiet: project-rules.md §2-4 (KHONG nhac lai o day)."
case "$IN" in
  *làm*|*lam*|*task*|*"tính năng"*|*"tinh nang"*|*feature*|*thêm*|*them*|*sửa*|*sua*|*fix*|*pick*|*issue*|*code*|*refactor*|*implement*|*migration*)
    echo "SYNC-GATE (chong TRUNG CODE 2 may): neu CHUA pull trong phien -> cay sach + git pull --ff-only (KHONG chi fetch) + grep CODE da sync xac minh tinh nang/route/issue CHUA ton tai roi MOI viet (issue OPEN la chi bao TRE, code moi la phan quyet). Xong -> dong issue ATOMIC khi push (Closes #N), KHONG dong theo lo. Chi tiet: project-rules.md §2." ;;
esac
case "$IN" in
  */spar*|*"phản biện"*|*"phan bien"*|*"có ổn không"*|*"co on khong"*|*"ổn không"*|*"khả thi"*|*"kha thi"*|*"quyết định"*|*"quyet dinh"*|*"đánh giá"*|*"danh gia"*|*"chốt hướng"*|*"chot huong"*|*"nên chọn"*|*"nen chon"*)
    echo "SPARRING: prompt co dau hieu quyet dinh/cau hoi chien luoc -> ap skills/core-sparring-partner: phan bien TRUOC (gia dinh an · blind-spot · rui ro · phuong an khac — LIEU TOI THIEU, KHONG quota; khong co blind-spot dang ke thi noi thang), roi moi de xuat. Neu thuc ra la lenh thuc thi ro/trivial -> bo qua, lam thang." ;;
esac
exit 0
