"""
Tremor AI - Single-Session Patient PDF Report Generator
========================================================
Generates a clinical session PDF report using ReportLab, containing
signal waveforms, FFT spectral density with highlighted 4-6 Hz tremor band,
classification results, transparent severity score breakdown, explainability notes,
and required medical disclaimers.
"""

import os
import io
import datetime
from typing import Dict, Any, Optional
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Headless backend for report generation
import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable
)


CLINICAL_DISCLAIMER_TEXT = (
    "NOTICE & MEDICAL DISCLAIMER: Tremor AI is an experimental screening and longitudinal "
    "monitoring aid, NOT a diagnostic or medical treatment device. The metrics, classifications, "
    "and severity scores provided herein reflect biomechanical time-series observations and must "
    "be interpreted solely by a qualified neurologist or physician in clinical context. "
    "Never initiate, alter, or discontinue any medication based on this report."
)


def generate_session_plots(
    time_series: np.ndarray,
    freqs: np.ndarray,
    psd: np.ndarray,
    fs: float = 100.0,
    dominant_freq: float = 4.8
) -> io.BytesIO:
    """Render high-resolution dual plot (waveform + FFT) to an in-memory PNG buffer."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7.5, 2.5), dpi=200)
    plt.subplots_adjust(wspace=0.35, bottom=0.22, top=0.85, left=0.10, right=0.95)

    # 1. Waveform Plot
    t = np.arange(len(time_series)) / fs
    ax1.plot(t, time_series, color="#1E3A8A", linewidth=1.1, label="Accel Mag (g)")
    ax1.set_title("Dynamic Acceleration Waveform", fontsize=9, fontweight="bold", color="#1F2937")
    ax1.set_xlabel("Time (s)", fontsize=8)
    ax1.set_ylabel("Amplitude (g)", fontsize=8)
    ax1.grid(True, linestyle="--", alpha=0.4)
    ax1.tick_params(axis="both", which="major", labelsize=7)

    # 2. FFT Power Spectral Density
    mask = (freqs >= 0.5) & (freqs <= 16.0)
    f_sub = freqs[mask]
    p_sub = psd[mask]

    ax2.plot(f_sub, p_sub, color="#0D9488", linewidth=1.3, label="Power Spectral Density")
    # Highlight 4-6 Hz Parkinsonian band
    ax2.axvspan(4.0, 6.0, color="#F59E0B", alpha=0.25, label="PD Tremor Band (4-6 Hz)")
    if dominant_freq > 0:
        ax2.axvline(dominant_freq, color="#DC2626", linestyle=":", linewidth=1.4, label=f"Peak ({dominant_freq:.1f} Hz)")

    ax2.set_title("FFT Power Spectrum (0.5 - 16 Hz)", fontsize=9, fontweight="bold", color="#1F2937")
    ax2.set_xlabel("Frequency (Hz)", fontsize=8)
    ax2.set_ylabel("PSD (g²/Hz)", fontsize=8)
    ax2.grid(True, linestyle="--", alpha=0.4)
    ax2.legend(fontsize=6.5, loc="upper right")
    ax2.tick_params(axis="both", which="major", labelsize=7)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def generate_single_session_pdf(
    output_pdf_path: str,
    patient_id: str,
    session_data: Dict[str, Any],
    features: Dict[str, float],
    prediction: Dict[str, Any],
    severity: Dict[str, Any],
    explanation: Dict[str, Any]
) -> str:
    """Build and save the single-session clinical PDF report using ReportLab."""
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
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A")
    )

    subtitle_style = ParagraphStyle(
        "SubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748B")
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )

    disclaimer_style = ParagraphStyle(
        "DisclaimerText",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#78350F")
    )

    story = []

    # 1. Header Banner
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    header_data = [
        [
            Paragraph("<b>Tremor Ai</b> &mdash; Tremor Assessment & Telemetry Report", title_style),
            Paragraph(f"<b>Report ID:</b> TAI-{int(datetime.datetime.now().timestamp())}<br/><b>Date:</b> {now_str}", subtitle_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[4.8 * inch, 2.7 * inch])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284C7"), spaceAfter=10))

    # 2. Patient & Session Metadata Card
    is_synth = session_data.get("is_synthetic", False)
    is_live = session_data.get("is_live_hardware", False)
    if is_live:
        origin_str = "<font color='#0284C7'><b>⚡ Live Physical Hardware (ESP32/COM4)</b></font>"
        device_str = session_data.get("device_name", "ESP32 + MPU6050 Wearable IMU (COM4)")
    elif is_synth:
        origin_str = "<font color='#D97706'>Synthetic Fallback Dataset</font>"
        device_str = "MPU6050 6-DoF IMU Ring"
    else:
        origin_str = "Clinical Raw Recording"
        device_str = "MPU6050 6-DoF IMU Ring"

    meta_table_data = [
        [
            Paragraph("<b>Patient Identifier:</b>", body_style),
            Paragraph(str(patient_id), body_style),
            Paragraph("<b>Data Origin:</b>", body_style),
            Paragraph(origin_str, body_style)
        ],
        [
            Paragraph("<b>Sensor Device:</b>", body_style),
            Paragraph(device_str, body_style),
            Paragraph("<b>Sampling Rate:</b>", body_style),
            Paragraph(f"{session_data.get('fs', 50.0 if is_live else 100.0):.1f} Hz (Nyquist: {session_data.get('fs', 50.0 if is_live else 100.0)/2:.1f} Hz)", body_style)
        ],
        [
            Paragraph("<b>Assessment Duration:</b>", body_style),
            Paragraph(f"{session_data.get('duration_sec', 60):.1f} seconds", body_style),
            Paragraph("<b>Analysis Window:</b>", body_style),
            Paragraph("3.0 sec (50% sliding overlap)", body_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[1.8 * inch, 2.0 * inch, 1.8 * inch, 1.9 * inch])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EDF2F7")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # 3. Clinical Findings Summary Card
    pred_label = prediction.get("predicted_label", "Unknown").upper()
    conf = prediction.get("confidence", 0.0) * 100.0
    pd_prob = prediction.get("pd_probability", 0.0) * 100.0
    score = severity.get("severity_score", 0.0)
    grade = severity.get("grade", "N/A")

    # Pick grade color
    grade_color = "#DC2626" if score >= 70 else ("#EA580C" if score >= 40 else ("#D97706" if score >= 20 else "#16A34A"))

    findings_data = [
        [
            Paragraph("<b>AI Pattern Classification</b>", body_style),
            Paragraph("<b>Tremor Severity Index</b>", body_style),
            Paragraph("<b>Clinical Severity Grade</b>", body_style)
        ],
        [
            Paragraph(f"<font size='13' color='#0F172A'><b>{pred_label}</b></font><br/><font color='#64748B'>Confidence: {conf:.1f}% (PD Match: {pd_prob:.1f}%)</font>", body_style),
            Paragraph(f"<font size='16' color='{grade_color}'><b>{score:.1f}</b></font><font color='#64748B'> / 100</font>", body_style),
            Paragraph(f"<font size='12' color='{grade_color}'><b>{grade}</b></font><br/><font color='#64748B'>{severity.get('clinical_note', '')}</font>", body_style)
        ]
    ]
    findings_table = Table(findings_data, colWidths=[2.5 * inch, 2.0 * inch, 3.0 * inch])
    findings_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(findings_table)
    story.append(Spacer(1, 8))

    # 4. Embedded Signal Waveform & FFT Spectrum Plot
    story.append(Paragraph("<b>Biomechanical Time-Series & Spectral Isolation</b>", h2_style))
    accel_mag = session_data.get("accel_mag", np.sin(np.linspace(0, 30, 300)))
    freqs = np.array(session_data.get("freqs", np.linspace(0, 50, 150)))
    psd = np.array(session_data.get("psd", np.ones(150) * 0.001))
    dom_f = features.get("dominant_frequency", 4.8)

    plot_buf = generate_session_plots(accel_mag, freqs, psd, dominant_freq=dom_f)
    img = Image(plot_buf, width=7.4 * inch, height=2.45 * inch)
    story.append(img)
    story.append(Spacer(1, 6))

    # 5. Biomarkers Table
    story.append(Paragraph("<b>Extracted Digital Biomarkers (Window Metrics)</b>", h2_style))
    bio_data = [
        [
            Paragraph("<b>Biomarker</b>", body_style),
            Paragraph("<b>Observed Value</b>", body_style),
            Paragraph("<b>Reference Band / Diagnostic Context</b>", body_style)
        ],
        [
            Paragraph("Dominant Frequency", body_style),
            Paragraph(f"<b>{features.get('dominant_frequency', 0.0):.2f} Hz</b>", body_style),
            Paragraph("Parkinsonian Resting Tremor: 4.0 - 6.0 Hz", body_style)
        ],
        [
            Paragraph("Tremor Band Power Ratio", body_style),
            Paragraph(f"<b>{features.get('tremor_power_ratio', 0.0) * 100:.1f}%</b>", body_style),
            Paragraph("Ratio of power in 4-6 Hz band to broad spectrum (>40% indicates localized tremor)", body_style)
        ],
        [
            Paragraph("Dynamic Jerk RMS", body_style),
            Paragraph(f"<b>{features.get('jerk_rms', 0.0):.2f} g/s</b>", body_style),
            Paragraph("Time-derivative of acceleration measuring abrupt oscillatory changes", body_style)
        ],
        [
            Paragraph("Spectral Shannon Entropy", body_style),
            Paragraph(f"<b>{features.get('spectral_entropy', 0.0):.3f}</b>", body_style),
            Paragraph("Low (<0.45) indicates rhythmic periodicity; High (>0.70) indicates random/voluntary noise", body_style)
        ]
    ]
    bio_table = Table(bio_data, colWidths=[2.4 * inch, 1.8 * inch, 3.3 * inch])
    bio_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(bio_table)
    story.append(Spacer(1, 8))

    # 6. Explainability Summary
    story.append(Paragraph("<b>Physiological Interpretation & Explainability</b>", h2_style))
    exp_text = explanation.get("summary_paragraph", "Biomechanical features within normal resting bounds.")
    story.append(Paragraph(exp_text, body_style))
    story.append(Spacer(1, 10))

    # 7. Mandatory Disclaimer Box
    disclaimer_table = Table([[Paragraph(CLINICAL_DISCLAIMER_TEXT, disclaimer_style)]], colWidths=[7.5 * inch])
    disclaimer_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#F59E0B")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(disclaimer_table)

    doc.build(story)
    return output_pdf_path
