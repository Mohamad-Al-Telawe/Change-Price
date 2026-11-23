#!/usr/bin/env python3
# update_passwords.py (v2) — تحديث كلمات المرور (number) في MongoDB من أرقام الهواتف في MySQL
import re
import argparse
import difflib
import unicodedata
import pymysql
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError

# ============================ الإعدادات ============================
MONGO_URI = "mongodb+srv://abwb7293_db_user:3BcPFlXyGpW23IOM@cluster0.ysrobbr.mongodb.net/price_mod_system?retryWrites=true&w=majority&appName=Cluster0"
MONGO_DB = None                  # None = يؤخذ اسم القاعدة من الـ URI
MONGO_COLLECTION = "users"

MYSQL = dict(host="192.168.10.50", port=3308, user="reader", password="PhenixReader2025")


# ============================ الإعدادات ============================

# قاعدة MySQL -> قيمة company في MongoDB
DB_TO_COMPANY = {
    "account_1": "UAE",
    "account_2": "OMAN",
    "account_3": "BHR",
    "account_4": "KSA",
    "account_5": "TNZ",
}

SKIP_ROLES = {"admin"}           # أدوار لا تُمسّ أبداً
SKIP_BRANCHES = {"main"}         # فروع لا تُمسّ ولا تظهر في التقرير (المقر الرئيسي)
FALLBACK_COMPANIES = {"main"}    # شركات يُسمح لها بالمطابقة بالفرع فقط (بدون الشركة)

SQL = """
SELECT
    up.Phone,
    cb.br_name AS BranchName
FROM `user_permissions` AS up
LEFT JOIN `comp_branchs` AS cb
    ON up.USER_BRID = cb.br_id
"""
# ===================================================================


def loose(s):
    """مفتاح مطابقة متسامح: يتجاهل المسافات والرموز والمحارف الخفية والحالة."""
    s = unicodedata.normalize("NFKC", str(s or "")).casefold()
    return "".join(ch for ch in s if ch.isalnum())


def phone_to_number(p):
    digits = re.sub(r"\D", "", str(p or ""))
    return int(digits) if digits else None


def fetch_sql():
    exact = {}      # (company, branch) -> {أرقام}
    by_branch = {}  # branch -> {company: {أرقام}}
    names = {}      # branch_key -> [(company, الاسم الأصلي)]
    for db, company in DB_TO_COMPANY.items():
        conn = pymysql.connect(**MYSQL, database=db, charset="utf8mb4")
        try:
            with conn.cursor() as cur:
                cur.execute(SQL)
                for phone, branch in cur.fetchall():
                    if not branch or not str(branch).strip():
                        continue
                    bk = loose(branch)
                    entry = (company, str(branch).strip())
                    if entry not in names.setdefault(bk, []):
                        names[bk].append(entry)
                    n = phone_to_number(phone)
                    if n is None:
                        continue
                    exact.setdefault((loose(company), bk), set()).add(n)
                    by_branch.setdefault(bk, {}).setdefault(company, set()).add(n)
            print(f"  ✔ {db} ({company})")
        finally:
            conn.close()
    return exact, by_branch, names


def why_missing(u, names, ck, bk):
    if bk in names:
        comps = [c for c, _ in names[bk]]
        if any(loose(c) == ck for c in comps):
            return "الفرع موجود في SQL لكن Phone فارغ/غير رقمي"
        return f"الفرع موجود في SQL تحت شركة أخرى: {comps}"
    close = difflib.get_close_matches(bk, list(names.keys()), n=3, cutoff=0.6)
    if close:
        sug = " ، ".join(f"{c}: {raw}" for k in close for c, raw in names[k])
        return f"لا يوجد تطابق — الأقرب: {sug}"
    return "لا يوجد تطابق في SQL"


def build_plan(users, sql):
    exact, by_branch, names = sql
    plan, problems = [], []
    for u in users:
        ck, bk = loose(u.get("company")), loose(u.get("branch"))
        if u.get("role") in SKIP_ROLES or bk in SKIP_BRANCHES:
            continue
        phones, note = exact.get((ck, bk)), ""
        if not phones and ck in FALLBACK_COMPANIES and bk in by_branch:
            cands = by_branch[bk]
            if len(cands) == 1:
                comp, phones = next(iter(cands.items()))
                note = f"(مطابقة بالفرع فقط — SQL: {comp})"
            else:
                problems.append((u, f"الفرع موجود في أكثر من شركة: {sorted(cands)}"))
                continue
        if not phones:
            problems.append((u, why_missing(u, names, ck, bk)))
            continue
        if len(phones) > 1:
            problems.append((u, f"أكثر من رقم لنفس الفرع: {sorted(phones)}"))
            continue
        new = next(iter(phones))
        if u.get("number") == new:
            continue
        plan.append({"user": u, "old": u.get("number"), "new": new, "note": note})

    # التفرد المطلوب فقط على (company, branch, number)
    final = {u["_id"]: (loose(u.get("company")), loose(u.get("branch")), u.get("number")) for u in users}
    for p in plan:
        u = p["user"]
        final[u["_id"]] = (loose(u.get("company")), loose(u.get("branch")), p["new"])
    counts = {}
    for v in final.values():
        counts[v] = counts.get(v, 0) + 1
    ok = []
    for p in plan:
        if counts[final[p["user"]["_id"]]] > 1:
            problems.append((p["user"], f"الرقم الجديد {p['new']} مكرر داخل نفس الفرع"))
        else:
            ok.append(p)
    return ok, problems


def label(u):
    return f"{u.get('company')} | {u.get('branch')} | {u.get('name')}"


def show(plan, problems):
    if plan:
        print("\nسيتم تحديث:")
        for i, p in enumerate(plan, 1):
            print(f"  {i:>3}. {label(p['user'])}   {p['old']}  ->  {p['new']}  {p['note']}")
    else:
        print("\nلا توجد تغييرات للتطبيق.")
    if problems:
        print("\nتم تجاهلهم:")
        for u, why in problems:
            print(f"  - {label(u)}   [{why}]")


def apply(col, plan, dry):
    if not plan:
        return
    if dry:
        print("\n(dry-run) لم يتم تعديل أي شيء.")
        return
    if input("\nتأكيد التنفيذ؟ (y/n): ").strip().lower() != "y":
        print("أُلغي.")
        return
    done = 0
    for p in plan:
        try:
            col.update_one({"_id": p["user"]["_id"]}, {"$set": {"number": p["new"]}})
            done += 1
        except DuplicateKeyError as e:
            print(f"  ✖ تعارض: {label(p['user'])}\n    {e}")
    print(f"\nتم تحديث {done} من {len(plan)}.")


def number_unique_indexes(col):
    out = []
    for name, info in col.index_information().items():
        if info.get("unique") and [k for k, _ in info["key"]] == ["number"]:
            out.append(name)
    return out


def fix_index(col):
    for name in number_unique_indexes(col):
        col.drop_index(name)
        print(f"تم حذف الفهرس الفريد: {name}")
    try:
        col.create_index([("company", 1), ("branch", 1), ("number", 1)], unique=True)
        print("تم إنشاء الفهرس الفريد (company, branch, number).")
    except PyMongoError as e:
        print(f"تعذّر إنشاء الفهرس المركّب: {e}")


def pick_user(users):
    for i, u in enumerate(users, 1):
        print(f"  {i:>3}. {label(u)}   ({u.get('role')})")
    s = input("\nرقم المستخدم من القائمة (أو جزء من الاسم/الفرع للبحث): ").strip()
    if s.isdigit() and 1 <= int(s) <= len(users):
        return users[int(s) - 1]
    key = loose(s)
    found = [u for u in users if key and key in loose(label(u))]
    if len(found) == 1:
        return found[0]
    if not found:
        print("لا يوجد مستخدم مطابق.")
        return None
    print("نتائج متعددة، حدّد بدقة أكثر:")
    for u in found:
        print("  -", label(u))
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="معاينة فقط بدون كتابة")
    ap.add_argument("--fix-index", action="store_true", help="حذف الفهرس الفريد على number وإنشاء (company, branch, number)")
    args = ap.parse_args()

    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB] if MONGO_DB else client.get_default_database()
    col = db[MONGO_COLLECTION]

    if args.fix_index:
        fix_index(col)
        return

    stale = number_unique_indexes(col)
    if stale:
        print(f"⚠ يوجد فهرس فريد على number ({', '.join(stale)}) وسيرفض الأرقام المتكررة بين الشركات. شغّل: --fix-index")

    print("قراءة قواعد MySQL ...")
    sql = fetch_sql()

    while True:
        print("\n==== تحديث كلمات المرور ====")
        print("1) تحديث الكل")
        print("2) تحديث مستخدم واحد")
        print("0) خروج")
        choice = input("اختر: ").strip()
        if choice == "0":
            break
        if choice not in ("1", "2"):
            continue

        users = list(col.find({}, {"name": 1, "number": 1, "role": 1, "company": 1, "branch": 1}))
        users.sort(key=lambda u: (str(u.get("company")), str(u.get("branch"))))

        scope = users
        if choice == "2":
            u = pick_user(users)
            if not u:
                continue
            scope = [u]

        plan, problems = build_plan(users, sql)
        ids = {x["_id"] for x in scope}
        plan = [p for p in plan if p["user"]["_id"] in ids]
        problems = [(u, w) for u, w in problems if u["_id"] in ids]
        if choice == "2" and not plan and not problems:
            print("\nلا تغيير مطلوب: الرقم الحالي مطابق لـ SQL.")
            continue
        show(plan, problems)
        apply(col, plan, args.dry_run)


if __name__ == "__main__":
    main()