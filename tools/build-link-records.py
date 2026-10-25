"""Build link-records.js + supabase/link-records.sql + urls.txt from the
vendor COA link list supplied by Victor (2026-10-24).

Each entry = one link = one record. No results are transcribed here: the
original reports were NOT read, so results fields stay empty and the UI
labels them "Not transcribed — see original report."

One supplied link is skipped as a duplicate: the ERP Janoshik 170026
Retatrutide 60mg Mass/Purity report is already on the site as seed record
PPC-2026-0002 (same task #170026, same values). Its Endotoxin companion
170027 is new and IS included.
"""
import json

ERP = "ERP Shanghai Peptide Biotechnology Co., Ltd."
HYB = "HYB — Hangzhou Youngpeptide Biotechnology"
HPT = "HPT — Homopeptide"
JEEP = "JEEP — Guangzhou Jeep Biotechnology"
QST = "QST — Qingdao Saber Technology"
ZLZ = "ZLZ — Zhuzhou Lusong Zhongtuo"
JAN = "Janoshik"
FRE = "Freedom Diagnostics Testing"
MP = ["Mass / Purity"]
CP = ["Content / Purity"]
EN = ["Endotoxin"]
HM = ["Heavy Metals"]

# (vendor, compound, strength, tests, lab, url, notes)
ENTRIES = [
    # ── ERP ──────────────────────────────────────────────────────────────
    (ERP, "Thymosin Alpha-1", "10mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/Thri2609080995.pdf", ""),
    (ERP, "SS-31", "50mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/Thri2609080994.pdf", ""),
    (ERP, "SS-31", "10mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/Thri2609080993.pdf", ""),
    (ERP, "Bacteriostatic Water (BAC)", "10ml", ["Purity / Content"], FRE, "https://coas.freedomdiagnosticstesting.com/Thri2609080991.pdf", ""),
    (ERP, "ARA-290", "10mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/Thri2609080990.pdf", ""),
    (ERP, "Epitalon", "50mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/Thri2609080989.pdf", ""),
    # 170026 skipped: duplicate of seed PPC-2026-0002
    (ERP, "Retatrutide", "60mg", EN, JAN, "https://verify.janoshik.com/tests/170027-erp_dark_purple_cap_retatrutide_60_mg_XQ5RZ5XIE726", ""),
    (ERP, "Retatrutide", "10mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/Shan2606220266.pdf", ""),
    (ERP, "Retatrutide", "10mg", EN, FRE, "https://coas.freedomdiagnosticstesting.com/Shan2606220267.pdf", ""),
    (ERP, "Tirzepatide", "30mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/ERPP2606150526.pdf", ""),
    (ERP, "Semaglutide", "10mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/ERPP2606150525.pdf", ""),
    # ── HYB ──────────────────────────────────────────────────────────────
    (HYB, "Retatrutide", "30mg", CP, FRE, "https://coas.freedomdiagnosticstesting.com/hyb2507280017.pdf", ""),
    (HYB, "SS-31", "10mg", CP, FRE, "https://coas.freedomdiagnosticstesting.com/hyb2507280016.pdf", ""),
    (HYB, "MOTS-c", "40mg", CP, FRE, "https://coas.freedomdiagnosticstesting.com/hyb2507280015.pdf", ""),
    (HYB, "Epitalon", "", CP, FRE, "https://coas.freedomdiagnosticstesting.com/HYB2509250092.pdf", ""),
    (HYB, "Thymosin Alpha-1", "", CP, FRE, "https://coas.freedomdiagnosticstesting.com/HYB2509250091.pdf", ""),
    (HYB, "BPC-157 / Thymosin Beta-4", "", CP, FRE, "https://coas.freedomdiagnosticstesting.com/HYB2509250090.pdf", "Listed as BB10"),
    (HYB, "Tesamorelin", "10mg", CP, JAN, "https://verify.janoshik.com/tests/76885_2UFKQ28MDG12", ""),
    (HYB, "Tirzepatide", "60mg", CP, JAN, "https://verify.janoshik.com/tests/76872_SHGLH7GWJS4T", ""),
    (HYB, "Retatrutide", "30mg", CP, JAN, "https://verify.janoshik.com/tests/92484_B9EYF43GWC1K", ""),
    (HYB, "GHK-Cu", "100mg", CP, JAN, "https://verify.janoshik.com/tests/92507_LR8ML1VVINC1", ""),
]

ENTRIES += [
    # ── HPT ──────────────────────────────────────────────────────────────
    (HPT, "GHK-Cu", "100mg", [], JAN, "https://janoshik.com/tests/216611-ghkcu_100mg_3QFBLGMLBTTN", "Listed as GHKCU 100mg"),
    (HPT, "Semax", "10mg", [], JAN, "https://janoshik.com/tests/216612-Sample_2_1AW7B2N2J3UT", "Listed as XA10 (Semax 10mg)"),
    (HPT, "Selank", "10mg", [], JAN, "https://janoshik.com/tests/216613-Sample_3_TQE1GAPRXV6T", "Listed as SK10 (Selank 10mg)"),
    (HPT, "BPC-157", "10mg", [], JAN, "https://verify.janoshik.com/tests/216614-Sample_4_F9NSFTCYIEPX", "Listed as BC10 (BPC-157 10mg)"),
    (HPT, "TB-500", "5mg", [], JAN, "https://verify.janoshik.com/tests/216615-Sample_5_JATE7SCN1QIF", "Listed as TB5 (TB-500 5mg)"),
    (HPT, "Tirzepatide", "20mg", [], JAN, "https://verify.janoshik.com/tests/216616-Sample_6_VYA59HKMHLSC", "Listed as TR20"),
    (HPT, "Glow", "GHK-Cu 50mg + TB-500 10mg + BPC-157 10mg", [], JAN, "https://verify.janoshik.com/tests/216617-Sample_7_KVRP3JAQDZA4", "Listed as Glow"),
    (HPT, "Klow", "BPC-157 10mg + GHK-Cu 50mg + TB-500 10mg + KPV 10mg", [], JAN, "https://verify.janoshik.com/tests/216618-Sample_8_HVRSCMYEQVUL", "Listed as Klow"),
    (HPT, "Epithalon", "10mg", [], JAN, "https://verify.janoshik.com/tests/216619-Sample_9_U1MRVZB7AM9S", "Listed as ET10 (Epithalon 10mg)"),
    (HPT, "Melanotan II", "10mg", [], JAN, "https://verify.janoshik.com/tests/216620-Sample_10_A74AURKAEPVV", "Listed as MT2"),
    (HPT, "Melanotan I", "10mg", [], JAN, "https://verify.janoshik.com/tests/216621-Sample_11_G9GTMVF7KKX5", "Listed as MT1"),
    (HPT, "Tirzepatide", "30mg", [], JAN, "https://verify.janoshik.com/tests/215500-Tirzepatide_30mg_RH9H88JEP9K5", "Listed as TR30"),
    (HPT, "Tirzepatide", "60mg", [], JAN, "https://verify.janoshik.com/tests/215508-Tirzepatide_60mg_41GPTNUBTC2F", "Listed as TR60"),
    (HPT, "Retatrutide", "20mg", [], JAN, "https://verify.janoshik.com/tests/215548-Retatrutide_20mg_VI4YESPDYP6X", "Listed as RT20"),
    (HPT, "Tirzepatide", "10mg", [], JAN, "https://verify.janoshik.com/tests/215492-Tirzepatide_10mg_A9AXGRFERXKE", "Listed as TR10"),
    (HPT, "Retatrutide", "10mg", [], JAN, "https://verify.janoshik.com/tests/215484-Retatrutide_10mg_V15DZNDZDHFH", "Listed as RT10"),
    (HPT, "KPV + GHK-Cu", "KPV 10mg + GHK-Cu 50mg", [], JAN, "https://verify.janoshik.com/tests/215444-KPV_10mg_GHKCU_50mg_8W1IDR4XA4ZK", "Listed as KCU60"),
    # ── JEEP ─────────────────────────────────────────────────────────────
    (JEEP, "Tesamorelin", "10mg", MP, JAN, "https://verify.janoshik.com/tests/153788-TESA10_1HDFDF14VSD9", "Listed as TESA10"),
    (JEEP, "Tesamorelin", "10mg", EN, JAN, "https://janoshik.com/tests/153788-TESA10_1HDFDF14VSD9", "Listed as TESA10"),
    (JEEP, "Retatrutide", "60mg", MP, JAN, "https://verify.janoshik.com/tests/157417-RT60_CEQN8FBULFA8", "Listed as RT60"),
    (JEEP, "Retatrutide", "60mg", EN, JAN, "https://janoshik.com/tests/157418-RT60_JRSEEKRTW5YQ", "Listed as RT60"),
    (JEEP, "MOTS-c", "40mg", MP, JAN, "https://janoshik.com/tests/157419-MOTS40_VXJWRYZWM3X2", "Listed as MOTS40"),
    (JEEP, "MOTS-c", "40mg", EN, JAN, "https://janoshik.com/tests/157420-MOTS40_3SCM7SMJKGRV", "Listed as MOTS40"),
    (JEEP, "Tirzepatide", "20mg", MP, JAN, "https://janoshik.com/tests/208771-TR20_E72EZ3Z7BBUA", "Listed as TR20"),
    (JEEP, "Tirzepatide", "20mg", EN, JAN, "https://janoshik.com/tests/208772-TR20_8TD59QMAZR3I", "Listed as TR20"),
    (JEEP, "CJC-1295", "10mg", MP, JAN, "https://janoshik.com/tests/208775-CJC10_RLHT7G9ZT97P", "Listed as CJC10"),
    (JEEP, "CJC-1295", "10mg", EN, JAN, "https://janoshik.com/tests/208776-CJC10_94TXSFTN931U", "Listed as CJC10"),
    (JEEP, "MOTS-c", "10mg", MP, JAN, "https://janoshik.com/tests/208777-MOTS10_XWPQDXLEL7Z8", "Listed as MOTS10"),
    (JEEP, "MOTS-c", "10mg", EN, JAN, "https://janoshik.com/tests/208778-MOTS10_G53DQB18113M", "Listed as MOTS10"),
    (JEEP, "Klow", "BPC-157 10mg + GHK-Cu 50mg + TB-500 10mg + KPV 10mg", MP, JAN, "https://janoshik.com/tests/200491-KLOW80_BBI8X5D2EKTF", "Listed as KLOW80"),
    (JEEP, "Klow", "BPC-157 10mg + GHK-Cu 50mg + TB-500 10mg + KPV 10mg", EN, JAN, "https://janoshik.com/tests/200492-KLOW80_KB9ZV6RAM99W", "Listed as KLOW80"),
    (JEEP, "GHK-Cu", "50mg", MP, JAN, "https://janoshik.com/tests/198338-GHKCU50_7YWYHRHCLAXS", "Listed as GHKCU50"),
    (JEEP, "GHK-Cu", "50mg", EN, JAN, "https://janoshik.com/tests/198339-GHKCU50_K6K7811N1YSS", "Listed as GHKCU50"),
    (JEEP, "Retatrutide", "40mg", MP, JAN, "https://janoshik.com/tests/198332-RT40_YGMARYXXBXBM", "Listed as RT40"),
    (JEEP, "Retatrutide", "40mg", EN, JAN, "https://janoshik.com/tests/198333-RT40_LDFD7QFWQ3IW", "Listed as RT40"),
    (JEEP, "Retatrutide", "50mg", MP, JAN, "https://janoshik.com/tests/198334-RT50_E8YFEAFDQP22", "Listed as RT50"),
    (JEEP, "Retatrutide", "50mg", EN, JAN, "https://janoshik.com/tests/198335-RT50_IX65LB1KY1D5", "Listed as RT50"),
    (JEEP, "KPV", "10mg", MP, JAN, "https://janoshik.com/tests/153791-KPV_U16HY2YMVBQ1", "Listed as KPV10"),
    (JEEP, "KPV", "10mg", EN, JAN, "https://janoshik.com/tests/153792-KPV_QVTWP4Z4NTJD", "Listed as KPV10"),
    (JEEP, "Tirzepatide", "30mg", [], JAN, "https://janoshik.com/tests/164305-Blind_GLP_FBTCVF28PYQD", "TR30 3P COA set — multiple reports, see originals"),
    (JEEP, "Tirzepatide", "30mg", [], JAN, "https://janoshik.com/tests/164306-Blind_GLP_A5SZEDHTA4CW", "TR30 3P COA set — multiple reports, see originals"),
    (JEEP, "Tirzepatide", "30mg", [], JAN, "https://janoshik.com/tests/164307-Blind_GLP_5Y5XUNBIMN5U", "TR30 3P COA set — multiple reports, see originals"),
    (JEEP, "Tirzepatide", "30mg", [], JAN, "https://janoshik.com/tests/164308-Blind_GLP_JEAVFZKUAGRA", "TR30 3P COA set — multiple reports, see originals"),
    (JEEP, "Tirzepatide", "30mg", [], JAN, "https://janoshik.com/tests/164309-Blind_GLP_NNI9FPH1XH5P", "TR30 3P COA set — multiple reports, see originals"),
    (JEEP, "Tesamorelin", "10mg", [], JAN, "https://janoshik.com/tests/200153-Tesa10_A7TMX6Y17EQ4", "TESA10 3P COA set — multiple reports, see originals"),
    (JEEP, "Tesamorelin", "10mg", [], JAN, "https://janoshik.com/tests/200154-Tesa10_FUCSNHN5IVTR", "TESA10 3P COA set — multiple reports, see originals"),
    (JEEP, "Tesamorelin", "10mg", [], JAN, "https://janoshik.com/tests/200155-Tesa10_VVB1YKTY3GQM", "TESA10 3P COA set — multiple reports, see originals"),
    (JEEP, "NAD+", "1000mg", [], JAN, "https://janoshik.com/tests/204621-NAD_1000mg_8F13UIBDJHK3", "NAD1000 3P COA set — multiple reports, see originals"),
    (JEEP, "NAD+", "1000mg", [], JAN, "https://janoshik.com/tests/204622-NAD_1000mg_CU7INKURLE7R", "NAD1000 3P COA set — multiple reports, see originals"),
    (JEEP, "Klow", "BPC-157 10mg + GHK-Cu 50mg + TB-500 10mg + KPV 10mg", [], JAN, "https://janoshik.com/tests/206940-KLOW_G81ZDKH4WSKU", "KLOW80 3P COA set — multiple reports, see originals"),
    (JEEP, "Klow", "BPC-157 10mg + GHK-Cu 50mg + TB-500 10mg + KPV 10mg", [], JAN, "https://janoshik.com/tests/206941-KLOW_FRREUF4DQQJD", "KLOW80 3P COA set — multiple reports, see originals"),
]

ENTRIES += [
    # ── QST ──────────────────────────────────────────────────────────────
    (QST, "Retatrutide", "20mg", MP, JAN, "https://verify.janoshik.com/tests/198344_N6XP3AVIXFUV", "Listed as RT20"),
    (QST, "Tirzepatide", "30mg", MP, JAN, "https://verify.janoshik.com/tests/198343_AWMDVNIFAVV9", "Listed as TR30"),
    (QST, "Tirzepatide", "30mg", MP, JAN, "https://janoshik.com/tests/195214-Tirz_30_W2JNSQAKJW5Z", "Listed as TR30"),
    (QST, "Tirzepatide", "30mg", EN, JAN, "https://janoshik.com/tests/195215-Tirz_30_SIZJJFEWIRPW", "Listed as TR30"),
    (QST, "Retatrutide", "30mg", MP, JAN, "https://janoshik.com/tests/195212-Reta_30_BYCQY9R1FATW", "Listed as RT30"),
    (QST, "Retatrutide", "30mg", EN, JAN, "https://janoshik.com/tests/195213-Reta_30_BN1YNYVXIQNH", "Listed as RT30"),
    # ── ZLZ ──────────────────────────────────────────────────────────────
    (ZLZ, "Ipamorelin", "10mg", MP, JAN, "https://janoshik.com/tests/225610-Ipamorelin_10mg_TMUNSQJMFSDX", ""),
    (ZLZ, "Glow", "70mg (BT10 + BPC10 + CU50)", EN, JAN, "https://janoshik.com/tests/225586-Glow_70mg_IR5BNPSZK2QX", "Listed as Glow 70mg"),
    (ZLZ, "Glow", "70mg (BT10 + BPC10 + CU50)", HM, JAN, "https://janoshik.com/tests/219456-Glow_70mg_JDVJI7TX5K4D", "Listed as Glow 70mg"),
    (ZLZ, "BPC-157 + TB-500", "10mg", MP, JAN, "https://janoshik.com/tests/225599-BB10BPC157_TB500_10mg_JBBY3DKLJUZF", "Listed as BB10"),
    (ZLZ, "Retatrutide", "60mg", EN, JAN, "https://janoshik.com/tests/224379-Retatrutide_60mg_3V5NXAW4X8CK", ""),
    (ZLZ, "Retatrutide", "60mg", HM, JAN, "https://janoshik.com/tests/224390-Retatrutide_60mg_NKHZAB8YY7A1", ""),
    (ZLZ, "Retatrutide", "20mg", MP, JAN, "https://janoshik.com/tests/225608-Retatrutide_20mg_252A3L2K914R", ""),
    (ZLZ, "Retatrutide", "10mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/ZLZP2606220222.pdf", ""),
    (ZLZ, "Retatrutide", "30mg", MP, JAN, "https://verify.janoshik.com/tests/113771-retatrutide_30mg_LGHSF7VTYVAK", ""),
    (ZLZ, "Retatrutide", "30mg", EN, JAN, "https://verify.janoshik.com/tests/113772-retatrutide_30mg_UYD498BIMKS6", ""),
    (ZLZ, "Tirzepatide", "30mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/ZLZP2605290061.pdf", ""),
    (ZLZ, "Tesamorelin", "10mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/ZLZP2606190139.pdf", ""),
    (ZLZ, "NAD+", "500mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/ZLZP2606220221.pdf", ""),
    (ZLZ, "BPC-157", "10mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/ZLZP2606220226.pdf", ""),
    (ZLZ, "Semax", "5mg", MP, FRE, "https://coas.freedomdiagnosticstesting.com/ZLZP2606220225.pdf", ""),
]

REVIEW_NOTE = ("Link record added by administrator from supplied list. Document contents "
                 "not yet transcribed — open the original report to read results. "
                 "Lab attribution from the source URL host.")

def sql_str(s):
    return "'" + s.replace("'", "''") + "'"

def main():
    from pathlib import Path
    root = Path(__file__).resolve().parent.parent
    records = []
    for i, (vendor, compound, strength, tests, lab, url, notes) in enumerate(ENTRIES, start=1):
        n = 3 + i  # seeds occupy PPC-2026-0001..0003
        records.append({
            "id": f"link-{i:03d}", "ref": f"PPC-2026-{n:04d}",
            "compound": compound, "supplier": vendor, "batch": "",
            "labelStrength": strength, "lab": lab, "testDate": "",
            "submittedAt": "2026-10-24T12:00:00Z", "testTypes": tests,
            "results": {"identity": "", "measuredQuantity": "", "purity": "", "other": ""},
            "submitterName": "PPC", "notes": notes, "sourceUrl": url,
            "recordType": "link", "fileName": "", "filePath": "", "fileType": "",
            "fileSize": 0, "checksum": "", "status": "approved",
            "reviewNotes": REVIEW_NOTE, "rejectReason": "",
            "independentlyConfirmed": False, "confirmationNote": "",
        })
    js = ("// Link records — one per vendor COA URL supplied by Victor (2026-10-24).\n"
          "// Generated by tools/build-link-records.py. Results are NOT transcribed:\n"
          "// the detail page says so and links out to the laboratory's own report.\n"
          "window.PPC_LINKS = " + json.dumps(records, indent=2) + ";\n")
    (root / "link-records.js").write_text(js)
    lines = ["-- Link records (generated by tools/build-link-records.py). Run AFTER supabase/schema.sql.",
             "-- Adds the source_url / record_type columns, then inserts. Safe to re-run.",
             "alter table public.coa_records add column if not exists source_url text default '';",
             "alter table public.coa_records add column if not exists record_type text default 'document';",
             "insert into public.coa_records (ref, compound, supplier, batch, label_strength, lab, test_date,",
             "  submitted_at, test_types, results, submitter_name, notes, file_name, file_path, file_type,",
             "  file_size, checksum, status, review_notes, independently_confirmed, confirmation_note,",
             "  source_url, record_type) values"]
    vals = []
    for r in records:
        tests_sql = "array[" + ",".join(sql_str(t) for t in r["testTypes"]) + "]" if r["testTypes"] else "array[]::text[]"
        vals.append("  (%s, %s, %s, '', %s, %s, null, '2026-10-24 12:00:00+00', %s, "
                    "'{\"identity\":\"\",\"measuredQuantity\":\"\",\"purity\":\"\",\"other\":\"\"}'::jsonb, 'PPC', %s, "
                    "'', '', '', 0, '', 'approved', %s, false, '', %s, 'link')"
                    % (sql_str(r["ref"]), sql_str(r["compound"]), sql_str(r["supplier"]),
                       sql_str(r["labelStrength"]), sql_str(r["lab"]), tests_sql,
                       sql_str(r["notes"]), sql_str(REVIEW_NOTE), sql_str(r["sourceUrl"])))
    lines.append(",\n".join(vals) + "\non conflict (ref) do nothing;")
    (root / "supabase" / "link-records.sql").write_text("\n".join(lines) + "\n")
    (root / "tools" / "urls.txt").write_text("\n".join(r["sourceUrl"] for r in records) + "\n")
    from collections import Counter
    print(f"records: {len(records)}")
    print("per vendor:", dict(Counter(r["supplier"] for r in records)))
    print("distinct compounds:", len(set(r["compound"].lower() for r in records)))
    print("distinct labs:", sorted(set(r["lab"] for r in records)))
    print("refs:", records[0]["ref"], "…", records[-1]["ref"])

if __name__ == "__main__":
    main()
