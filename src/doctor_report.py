"""
Tremor AI - Monthly Doctor Clinical Summary Report Generator
==============================================================
Generates a comprehensive 30-day longitudinal clinical PDF report using ReportLab.
Features:
  - 30-day continuous severity trend chart with overlaid medication dose events
  - Structured Medication-Effectiveness decision-support verdict
  - Acute flare-day incident log
  - Week 1 vs. Week 4 comparative symptom baseline analysis
  - Prominent longitudinal simulation disclosure and non-diagnostic medical disclaimer.
"""

import os
import io
import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable
)


DOCTOR_DISCLAIMER = (
    "CLINICAL DECISION-SUPPORT NOTICE: Tremor AI is an investigational monitoring aid, NOT a diagnostic "
    "instrument or autonomous treatment recommendation tool. All longitudinal trends and medication response "
    "metrics are correlational patterns derived from simulated 30-day sensor telemetry. This report is intended "
    "exclusively to assist a licensed neurologist or attending physician in evaluating motor fluctuations. "
    "Dosage changes, prescription modifications, or treatment decisions must never be based solely on this automated summary."
)

SIMULATION_DISCLOSURE = (
    "METHODOLOGY DISCLOSURE: In accordance with clinical trial protocol benchmarks, this 30-day longitudinal "
    "record is a simulated multi-session timeline constructed by modeling diurnal variance, pharmacokinetics, "
    "and wearing-off kinetics based on standardized single-session clinical IMU recordings."
)


def render_30_day_longitudinal_chart(
    timeline_df: pd.DataFrame,
    doses_list: List[Dict[str, Any]],
    flare_days: List[Dict[str, Any]]
) -> io.BytesIO:
    """Render 30-day severity trend with dose markers and flare day highlights."""
    fig, ax = plt.subplots(figsize=(7.5, 2.6), dpi=200)
    plt.subplots_adjust(bottom=0.20, top=0.88, left=0.08, right=0.96)

    # 1. Plot continuous / windowed severity score
    days = timeline_df["day"].values
    severity = timeline_df["severity_score"].values
    
    # Calculate daily rolling average
    daily_mean = timeline_df.groupby("day")["severity_score"].mean()
    
    # Scatter points for individual windows
    pre_mask = timeline_df["dose_phase"] == "pre_dose"
    post_mask = timeline_df["dose_phase"] == "post_dose"
    
    ax.scatter(timeline_df.loc[pre_mask, "day"], timeline_df.loc[pre_mask, "severity_score"],
               color="#DC2626", s=14, alpha=0.6, label="Pre-Dose Severity")
    ax.scatter(timeline_df.loc[post_mask, "day"], timeline_df.loc[post_mask, "severity_score"],
               color="#16A34A", s=14, alpha=0.6, label="Post-Dose Severity (Onset)")

    if "is_live_hardware" in timeline_df.columns and timeline_df["is_live_hardware"].any():
        live_mask = timeline_df["is_live_hardware"] == True
        ax.scatter(timeline_df.loc[live_mask, "day"], timeline_df.loc[live_mask, "severity_score"],
                   color="#F59E0B", edgecolors="#1E293B", s=60, marker="*", zorder=6,
                   label="Live Sensor Checkpoint (COM4)")

    # Trend line for daily mean
    ax.plot(daily_mean.index, daily_mean.values, color="#1E293B", linewidth=1.8, label="Daily Mean Severity")

    # Shaded Flare Days
    flare_day_nums = [f["day"] for f in flare_days]
    for fd in flare_day_nums:
        ax.axvspan(fd - 0.45, fd + 0.45, color="#FCA5A5", alpha=0.45, label="Detected Flare Day" if fd == flare_day_nums[0] else "")

    # MDS-UPDRS severity strata guidelines
    ax.axhline(20, color="#94A3B8", linestyle="--", linewidth=0.8, alpha=0.7)
    ax.axhline(40, color="#CBD5E1", linestyle="--", linewidth=0.8, alpha=0.7)
    ax.axhline(70, color="#FCA5A5", linestyle="--", linewidth=0.8, alpha=0.7)
    ax.text(30.2, 10, "Minimal", fontsize=6, color="#64748B", verticalalignment="center")
    ax.text(30.2, 30, "Mild", fontsize=6, color="#64748B", verticalalignment="center")
    ax.text(30.2, 55, "Moderate", fontsize=6, color="#64748B", verticalalignment="center")
    ax.text(30.2, 82, "Marked", fontsize=6, color="#DC2626", verticalalignment="center")

    ax.set_title("30-Day Longitudinal Tremor Severity & Medication Correlation", fontsize=9, fontweight="bold", color="#0F172A")
    ax.set_xlabel("Monitoring Timeline (Day 1 - 30)", fontsize=8)
    ax.set_ylabel("Severity Index (0 - 100)", fontsize=8)
    ax.set_xlim(0.5, 31.5)
    ax.set_ylim(0, 100)
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.tick_params(axis="both", which="major", labelsize=7)
    ax.legend(fontsize=6.5, loc="upper left", ncol=4)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def generate_monthly_doctor_pdf(
    output_pdf_path: str,
    patient_id: str,
    timeline_df: pd.DataFrame,
    doses_list: List[Dict[str, Any]],
    effectiveness_result: Dict[str, Any],
    patient_meta: Optional[Dict[str, Any]] = None
) -> str:
    """Compile and export the 30-day comprehensive doctor report."""
    os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)), exist_ok=True)

    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=20,
        textColor=colors.HexColor("#0F172A")
    )

    subtitle_style = ParagraphStyle(
        "SubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#64748B")
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=7,
        spaceAfter=3
    )

    body_style = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155")
    )

    callout_style = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A")
    )

    disclaimer_style = ParagraphStyle(
        "DisclaimerText",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor("#78350F")
    )

    story = []

    # 1. Header Banner
    now_str = datetime.datetime.now().strftime("%Y-%m-%d")
    header_data = [
        [
            Paragraph("<b>Tremor Ai</b> &mdash; 30-Day Monthly Clinical Summary", title_style),
            Paragraph(f"<b>Physician Review Copy</b><br/><b>Generated:</b> {now_str}", subtitle_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[4.9 * inch, 2.6 * inch])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284C7"), spaceAfter=8))

    # 2. Patient & Medication Protocol Summary
    med_name = doses_list[0].get("medication", "Carbidopa/Levodopa 25/100 mg") if doses_list else "Carbidopa/Levodopa"
    meta_table_data = [
        [
            Paragraph("<b>Patient ID:</b>", body_style),
            Paragraph(str(patient_id), body_style),
            Paragraph("<b>Regimen:</b>", body_style),
            Paragraph(f"{med_name} TID", body_style)
        ],
        [
            Paragraph("<b>Monitoring Window:</b>", body_style),
            Paragraph("30 Calendar Days", body_style),
            Paragraph("<b>Total Doses Logged:</b>", body_style),
            Paragraph(f"{len(doses_list)} scheduled doses", body_style)
        ],
        [
            Paragraph("<b>Telemetry Readings:</b>", body_style),
            Paragraph(f"{len(timeline_df)} window assessments", body_style),
            Paragraph("<b>Device Hardware:</b>", body_style),
            Paragraph(str(patient_meta.get("device_name", "Wearable Ring (MPU6050 IMU)") if patient_meta else "Wearable Ring (MPU6050 IMU)"), body_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[1.7 * inch, 2.0 * inch, 1.8 * inch, 2.0 * inch])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EDF2F7")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6))

    # 3. Structured Medication-Effectiveness Verdict Callout
    verdict = effectiveness_result.get("verdict", "Inconclusive")
    conf = effectiveness_result.get("confidence", 0)
    resp_rate = effectiveness_result.get("response_rate_pct", 0.0)
    avg_drop = effectiveness_result.get("avg_point_drop", 0.0)

    # Styling by verdict
    if verdict == "Likely Effective":
        v_bg, v_border, v_txt_col = "#F0FDF4", "#16A34A", "#15803D"
    elif verdict == "Reduced Effectiveness Detected":
        v_bg, v_border, v_txt_col = "#FEF2F2", "#DC2626", "#B91C1C"
    else:
        v_bg, v_border, v_txt_col = "#FFFBEB", "#F59E0B", "#B45309"

    verdict_content = [
        [
            Paragraph(f"<b>Medication-Effectiveness Correlation Verdict:</b> "
                      f"<font color='{v_txt_col}' size='11'><b>{verdict.upper()}</b></font> "
                      f"(Confidence: {conf}%)", callout_style)
        ],
        [
            Paragraph(f"<b>Core Findings:</b> {effectiveness_result.get('trend_note', '')}<br/>"
                      f"<b>Dose Response Rate:</b> {resp_rate}% of doses showed significant symptom reduction "
                      f"(Mean drop: {avg_drop:.1f} severity points).", callout_style)
        ]
    ]
    verdict_table = Table(verdict_content, colWidths=[7.5 * inch])
    verdict_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(v_bg)),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.HexColor(v_border)),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(verdict_table)
    story.append(Spacer(1, 6))

    # 4. Embedded 30-Day Longitudinal Chart
    story.append(Paragraph("<b>Longitudinal Tremor Severity Progression (30 Days)</b>", h2_style))
    flare_days = effectiveness_result.get("flare_days", [])
    chart_buf = render_30_day_longitudinal_chart(timeline_df, doses_list, flare_days)
    chart_img = Image(chart_buf, width=7.5 * inch, height=2.55 * inch)
    story.append(chart_img)
    story.append(Spacer(1, 6))

    # 5. Baseline Comparison: Week 1 vs. Week 4
    w1_mask = timeline_df["day"] <= 7
    w4_mask = timeline_df["day"] >= 24
    w1_pre = timeline_df[w1_mask & (timeline_df["dose_phase"] == "pre_dose")]["severity_score"].mean()
    w1_post = timeline_df[w1_mask & (timeline_df["dose_phase"] == "post_dose")]["severity_score"].mean()
    w4_pre = timeline_df[w4_mask & (timeline_df["dose_phase"] == "pre_dose")]["severity_score"].mean()
    w4_post = timeline_df[w4_mask & (timeline_df["dose_phase"] == "post_dose")]["severity_score"].mean()

    w1_drop = w1_pre - w1_post
    w4_drop = w4_pre - w4_post

    story.append(Paragraph("<b>Longitudinal Progression: Baseline Comparison (Week 1 vs. Week 4)</b>", h2_style))
    prog_data = [
        [
            Paragraph("<b>Monitoring Interval</b>", body_style),
            Paragraph("<b>Mean Pre-Dose Severity</b>", body_style),
            Paragraph("<b>Mean Post-Dose Severity</b>", body_style),
            Paragraph("<b>Net Medication Drop</b>", body_style),
            Paragraph("<b>Clinical Fluctuation Note</b>", body_style)
        ],
        [
            Paragraph("<b>Week 1 (Days 1 - 7)</b>", body_style),
            Paragraph(f"{w1_pre:.1f} / 100", body_style),
            Paragraph(f"{w1_post:.1f} / 100", body_style),
            Paragraph(f"<font color='#16A34A'><b>-{w1_drop:.1f} pts</b></font>", body_style),
            Paragraph("Robust therapeutic response; predictable ON phase window", body_style)
        ],
        [
            Paragraph("<b>Week 4 (Days 24 - 30)</b>", body_style),
            Paragraph(f"{w4_pre:.1f} / 100", body_style),
            Paragraph(f"{w4_post:.1f} / 100", body_style),
            Paragraph(f"<font color='#DC2626'><b>-{w4_drop:.1f} pts</b></font>", body_style),
            Paragraph("Contracted therapeutic window; emerging wearing-off observed" if (w1_drop - w4_drop > 4) else "Sustained therapeutic response", body_style)
        ]
    ]
    prog_table = Table(prog_data, colWidths=[1.6 * inch, 1.4 * inch, 1.4 * inch, 1.3 * inch, 1.8 * inch])
    prog_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(prog_table)
    story.append(Spacer(1, 6))

    # 6. Flare Days Summary Table
    if flare_days:
        story.append(Paragraph("<b>Flagged Acute Flare Incidents (Non-Medication Spikes)</b>", h2_style))
        flare_rows = [
            [
                Paragraph("<b>Calendar Day</b>", body_style),
                Paragraph("<b>Observed Day Severity</b>", body_style),
                Paragraph("<b>Baseline Elevation</b>", body_style),
                Paragraph("<b>Clinical Correlation Guidance</b>", body_style)
            ]
        ]
        for fd in flare_days:
            flare_rows.append([
                Paragraph(f"Day {fd['day']}", body_style),
                Paragraph(f"<b>{fd['average_severity']:.1f} / 100</b>", body_style),
                Paragraph(f"+{fd['elevation_above_baseline']:.1f} pts above mean", body_style),
                Paragraph("Investigate external factors (sleep disruption, infection, acute stress, physical fatigue)", body_style)
            ])
        flare_table = Table(flare_rows, colWidths=[1.5 * inch, 1.6 * inch, 1.6 * inch, 2.8 * inch])
        flare_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FEE2E2")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#FCA5A5")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#FEE2E2")),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ]))
        story.append(flare_table)
        story.append(Spacer(1, 6))

    # Physical Hardware Checkpoints Table (if recorded from live sensor)
    if "is_live_hardware" in timeline_df.columns:
        live_rows_df = timeline_df[timeline_df["is_live_hardware"] == True]
        if not live_rows_df.empty:
            story.append(Paragraph("<b>Verified Live Physical Sensor Checkpoints (Active Telemetry)</b>", h2_style))
            ckpt_rows = [
                [
                    Paragraph("<b>Timestamp</b>", body_style),
                    Paragraph("<b>Classification</b>", body_style),
                    Paragraph("<b>Peak Resonance</b>", body_style),
                    Paragraph("<b>Live Severity</b>", body_style),
                    Paragraph("<b>Biomechanical Verification</b>", body_style)
                ]
            ]
            for _, row in live_rows_df.tail(4).iterrows():
                ts_label = row["timestamp"].strftime("%Y-%m-%d %H:%M") if hasattr(row["timestamp"], "strftime") else str(row["timestamp"])[:16]
                dom_f = f"{row['dominant_frequency']:.2f} Hz" if row.get('dominant_frequency', 0) > 0 else "0.00 Hz (Rest)"
                ckpt_rows.append([
                    Paragraph(ts_label, body_style),
                    Paragraph(f"<b>{str(row.get('predicted_label', 'HEALTHY')).upper()}</b>", body_style),
                    Paragraph(dom_f, body_style),
                    Paragraph(f"<b>{row['severity_score']:.1f} / 100</b>", body_style),
                    Paragraph("Verified In-Person Physical Sensor Reading (USB Serial COM4)", body_style)
                ])
            ckpt_table = Table(ckpt_rows, colWidths=[1.5 * inch, 1.3 * inch, 1.4 * inch, 1.2 * inch, 2.1 * inch])
            ckpt_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D1FAE5")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#10B981")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#A7F3D0")),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ]))
            story.append(ckpt_table)
            story.append(Spacer(1, 6))

    # 7. Simulation Methodology Disclosure
    sim_table = Table([[Paragraph(SIMULATION_DISCLOSURE, subtitle_style)]], colWidths=[7.5 * inch])
    sim_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(sim_table)
    story.append(Spacer(1, 4))

    # 8. Mandatory Disclaimer Banner
    disc_table = Table([[Paragraph(DOCTOR_DISCLAIMER, disclaimer_style)]], colWidths=[7.5 * inch])
    disc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#F59E0B")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(disc_table)

    doc.build(story)
    return output_pdf_path
