from __future__ import annotations

import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from reportlab.graphics import renderPDF, renderSVG
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Circle, Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Venture_Governance_System_Whitepaper_2026.pdf"
ASSET_DIR = ROOT / "assets" / "whitepaper-2026"

NAVY = colors.HexColor("#071B2E")
NAVY_2 = colors.HexColor("#0B2942")
GRAPHITE = colors.HexColor("#243746")
INK = colors.HexColor("#102435")
MUTED = colors.HexColor("#5E6E7A")
COOL = colors.HexColor("#EDF3F6")
PAPER = colors.HexColor("#F8FAF9")
PANEL = colors.HexColor("#F1F5F6")
LINE = colors.HexColor("#C7D4DC")
CYAN = colors.HexColor("#00A8C6")
CYAN_DARK = colors.HexColor("#007A92")
AMBER = colors.HexColor("#E5A53A")
RED = colors.HexColor("#C64949")
GREEN = colors.HexColor("#2E8B67")
WHITE = colors.white

SITE = "https://venturegovernance.com/"
LAB = "https://venturegovernance.com/lab"
DEMO = "https://venturegovernance.com/lab/demo"
METHOD = "https://venturegovernance.com/lab/methodology"
APPS = "https://venturegovernance.com/applications"


def register_fonts() -> None:
    candidates = [
        ("VG Sans", Path(r"C:\Windows\Fonts\arial.ttf")),
        ("VG Sans Bold", Path(r"C:\Windows\Fonts\arialbd.ttf")),
        ("VG Mono", Path(r"C:\Windows\Fonts\consola.ttf")),
        ("VG Mono Bold", Path(r"C:\Windows\Fonts\consolab.ttf")),
        ("VG Serif", Path(r"C:\Windows\Fonts\georgia.ttf")),
        ("VG Serif Bold", Path(r"C:\Windows\Fonts\georgiab.ttf")),
    ]
    for name, path in candidates:
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))
    if "VG Sans" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("VG Sans", str(Path(r"C:\Windows\Fonts\segoeui.ttf"))))
        pdfmetrics.registerFont(TTFont("VG Sans Bold", str(Path(r"C:\Windows\Fonts\segoeuib.ttf"))))
    if "VG Serif" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("VG Serif", str(Path(r"C:\Windows\Fonts\segoeui.ttf"))))
        pdfmetrics.registerFont(TTFont("VG Serif Bold", str(Path(r"C:\Windows\Fonts\segoeuib.ttf"))))


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def slug(text: str) -> str:
    value = text.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:60]


def styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    result = {
        "title": ParagraphStyle("title", fontName="VG Sans Bold", fontSize=23, leading=26, textColor=INK, spaceAfter=6),
        "title_dark": ParagraphStyle("title_dark", fontName="VG Sans Bold", fontSize=25, leading=28, textColor=WHITE, spaceAfter=8),
        "kicker": ParagraphStyle("kicker", fontName="VG Mono Bold", fontSize=7.2, leading=9, textColor=CYAN_DARK, tracking=1.1, spaceAfter=6),
        "kicker_dark": ParagraphStyle("kicker_dark", fontName="VG Mono Bold", fontSize=7.2, leading=9, textColor=CYAN, tracking=1.1, spaceAfter=6),
        "lead": ParagraphStyle("lead", fontName="VG Sans", fontSize=12.2, leading=16, textColor=GRAPHITE, spaceAfter=9),
        "lead_dark": ParagraphStyle("lead_dark", fontName="VG Sans", fontSize=12.2, leading=16, textColor=colors.HexColor("#DDE8EE"), spaceAfter=9),
        "body": ParagraphStyle("body", fontName="VG Sans", fontSize=9.1, leading=12.3, textColor=INK, spaceAfter=5),
        "body_dark": ParagraphStyle("body_dark", fontName="VG Sans", fontSize=9.1, leading=12.3, textColor=colors.HexColor("#DFEAF0"), spaceAfter=5),
        "label": ParagraphStyle("label", fontName="VG Mono Bold", fontSize=6.8, leading=8, textColor=CYAN_DARK, tracking=.8, spaceAfter=2),
        "label_dark": ParagraphStyle("label_dark", fontName="VG Mono Bold", fontSize=6.8, leading=8, textColor=CYAN, tracking=.8, spaceAfter=2),
        "small": ParagraphStyle("small", fontName="VG Sans", fontSize=7.4, leading=9.6, textColor=MUTED),
        "small_dark": ParagraphStyle("small_dark", fontName="VG Sans", fontSize=7.4, leading=9.6, textColor=colors.HexColor("#BFD0DA")),
        "table": ParagraphStyle("table", fontName="VG Sans", fontSize=7.2, leading=9, textColor=INK),
        "table_bold": ParagraphStyle("table_bold", fontName="VG Sans Bold", fontSize=7.2, leading=9, textColor=INK),
        "toc": ParagraphStyle("toc", fontName="VG Sans", fontSize=7.4, leading=9.6, textColor=INK),
        "cover_title": ParagraphStyle("cover_title", fontName="VG Sans Bold", fontSize=34, leading=36, textColor=WHITE, spaceAfter=12),
        "cover_sub": ParagraphStyle("cover_sub", fontName="VG Sans", fontSize=15, leading=20, textColor=colors.HexColor("#D7E7EF"), spaceAfter=14),
        "cover_meta": ParagraphStyle("cover_meta", fontName="VG Mono", fontSize=8, leading=11, textColor=CYAN),
        "center": ParagraphStyle("center", fontName="VG Sans", fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=INK),
        "card_kicker": ParagraphStyle("card_kicker", fontName="VG Mono Bold", fontSize=6.2, leading=7.5, textColor=CYAN_DARK, tracking=.75),
        "card_kicker_dark": ParagraphStyle("card_kicker_dark", fontName="VG Mono Bold", fontSize=6.2, leading=7.5, textColor=CYAN, tracking=.75),
        "card_title": ParagraphStyle("card_title", fontName="VG Serif Bold", fontSize=15.5, leading=17.5, textColor=INK),
        "card_title_dark": ParagraphStyle("card_title_dark", fontName="VG Serif Bold", fontSize=15.5, leading=17.5, textColor=WHITE),
        "card_thesis": ParagraphStyle("card_thesis", fontName="VG Sans", fontSize=8.9, leading=11.3, textColor=GRAPHITE),
        "card_thesis_dark": ParagraphStyle("card_thesis_dark", fontName="VG Sans", fontSize=8.9, leading=11.3, textColor=colors.HexColor("#DCE8EF")),
        "card_label": ParagraphStyle("card_label", fontName="VG Mono Bold", fontSize=5.8, leading=7, textColor=CYAN_DARK, tracking=.55),
        "card_label_dark": ParagraphStyle("card_label_dark", fontName="VG Mono Bold", fontSize=5.8, leading=7, textColor=CYAN, tracking=.55),
        "card_body": ParagraphStyle("card_body", fontName="VG Sans", fontSize=6.9, leading=8.6, textColor=INK),
        "card_body_dark": ParagraphStyle("card_body_dark", fontName="VG Sans", fontSize=6.9, leading=8.6, textColor=colors.HexColor("#DEE9EF")),
        "contents": ParagraphStyle("contents", fontName="VG Sans", fontSize=5.4, leading=6.6, textColor=INK),
    }
    return result


class StatusStrip(Flowable):
    def __init__(self, status: str, dark: bool = False):
        super().__init__()
        self.status = status
        self.dark = dark
        self.width = 110 * mm
        self.height = 8 * mm

    def draw(self) -> None:
        palette = {
            "IMPLEMENTED": GREEN,
            "DEMONSTRATED": CYAN_DARK,
            "PROTOTYPE": AMBER,
            "DESIGNED": colors.HexColor("#6C72B8"),
            "PROPOSED": GRAPHITE,
            "FUTURE": MUTED,
            "VALIDATED": GREEN,
            "LIMITED": AMBER,
        }
        c = self.canv
        bg = palette.get(self.status, GRAPHITE)
        c.setFillColor(bg)
        c.roundRect(0, 0, 37 * mm, 6 * mm, 2 * mm, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("VG Mono Bold", 6.5)
        c.drawCentredString(18.5 * mm, 2.1 * mm, self.status)
        c.setFillColor(colors.HexColor("#C7D6DF") if self.dark else MUTED)
        c.setFont("VG Sans", 6.8)
        c.drawString(41 * mm, 2.1 * mm, "Implementation status - evidence bounded")


STATUS_COLORS = {
    "IMPLEMENTED": GREEN,
    "DEMONSTRATED": CYAN_DARK,
    "PROTOTYPE": AMBER,
    "DESIGNED": colors.HexColor("#6C72B8"),
    "PROPOSED": GRAPHITE,
    "FUTURE": MUTED,
    "VALIDATED": GREEN,
    "LIMITED": AMBER,
}


class BriefCard(Flowable):
    """A dense, editorial brief that lets several concepts share one page."""

    def __init__(self, spec: "PageSpec", style_map: dict[str, ParagraphStyle], drawing: Drawing | None):
        super().__init__()
        self.spec = spec
        self.style_map = style_map
        self.drawing = drawing
        self.width = 0.0
        self.height = 0.0
        self._layout: dict[str, object] = {}

    def _paragraph(self, text: str, key: str) -> Paragraph:
        return Paragraph(esc(text), self.style_map[key])

    def _block(self, label: str, text: str, width: float, suffix: str) -> tuple[Paragraph, Paragraph, float]:
        label_p = self._paragraph(label, f"card_label{suffix}")
        body_p = self._paragraph(text, f"card_body{suffix}")
        _, label_h = label_p.wrap(width, 1000)
        _, body_h = body_p.wrap(width, 1000)
        return label_p, body_p, label_h + body_h + 3.4 * mm

    def wrap(self, avail_width: float, avail_height: float) -> tuple[float, float]:
        self.width = avail_width
        pad = 6.2 * mm
        inner = avail_width - 2 * pad
        suffix = "_dark" if self.spec.dark else ""

        kicker = self._paragraph(f"{self.spec.section} / DECISION BRIEF", f"card_kicker{suffix}")
        title = self._paragraph(self.spec.title, f"card_title{suffix}")
        thesis = self._paragraph(self.spec.thesis, f"card_thesis{suffix}")
        _, kicker_h = kicker.wrap(inner, 1000)
        _, title_h = title.wrap(inner, 1000)
        _, thesis_h = thesis.wrap(inner, 1000)

        column_gap = 4.8 * mm
        column_width = (inner - column_gap) / 2
        left = [
            self._block("OPERATING IDEA", self.spec.plain, column_width, suffix),
            self._block("SYSTEM DESIGN", self.spec.technical, column_width, suffix),
        ]
        right = [
            self._block("IN PRACTICE", self.spec.example, column_width, suffix),
            self._block("GUARDRAIL", self.spec.limitation, column_width, suffix),
        ]
        left_h = sum(block[2] for block in left)
        right_h = sum(block[2] for block in right)
        panels_h = max(left_h, right_h) + 4.4 * mm
        figure_h = 31 * mm if self.drawing else 0
        figure_gap = 3.2 * mm if self.drawing else 0
        header_h = kicker_h + 1.7 * mm + title_h + 2.2 * mm + thesis_h + 6.8 * mm + 7.0 * mm
        raw_h = 2 * pad + header_h + figure_h + figure_gap + panels_h
        min_h = 102 * mm if self.drawing else 73 * mm
        self.height = max(raw_h, min_h)
        self._layout = {
            "pad": pad,
            "inner": inner,
            "suffix": suffix,
            "kicker": kicker,
            "title": title,
            "thesis": thesis,
            "kicker_h": kicker_h,
            "title_h": title_h,
            "thesis_h": thesis_h,
            "left": left,
            "right": right,
            "column_width": column_width,
            "column_gap": column_gap,
            "panels_h": panels_h,
            "figure_h": figure_h,
            "figure_gap": figure_gap,
        }
        return avail_width, self.height

    def _draw_block_column(self, blocks: list[tuple[Paragraph, Paragraph, float]], x: float, top: float, width: float) -> None:
        c = self.canv
        y = top
        for label_p, body_p, block_h in blocks:
            _, label_h = label_p.wrap(width, 1000)
            _, body_h = body_p.wrap(width, 1000)
            label_p.drawOn(c, x, y - label_h)
            y -= label_h + 1.0 * mm
            body_p.drawOn(c, x, y - body_h)
            y -= body_h + 2.4 * mm

    def draw(self) -> None:
        c = self.canv
        layout = self._layout
        pad = float(layout["pad"])
        inner = float(layout["inner"])
        suffix = str(layout["suffix"])
        dark = self.spec.dark
        card_bg = NAVY_2 if dark else PAPER
        card_line = colors.HexColor("#1B4B65") if dark else LINE
        panel_bg = colors.HexColor("#102E45") if dark else PANEL
        body_text = colors.HexColor("#C7D6DF") if dark else MUTED

        c.saveState()
        c.setFillColor(card_bg)
        c.setStrokeColor(card_line)
        c.setLineWidth(.65)
        c.roundRect(0, 0, self.width, self.height, 3.5 * mm, fill=1, stroke=1)
        c.setFillColor(STATUS_COLORS.get(self.spec.status, GRAPHITE))
        c.roundRect(0, self.height - 2.4 * mm, self.width, 2.4 * mm, 3.5 * mm, fill=1, stroke=0)

        y = self.height - pad
        kicker = layout["kicker"]
        kicker.drawOn(c, pad, y - float(layout["kicker_h"]))
        y -= float(layout["kicker_h"]) + 1.7 * mm
        title = layout["title"]
        title.drawOn(c, pad, y - float(layout["title_h"]))
        y -= float(layout["title_h"]) + 2.2 * mm
        thesis = layout["thesis"]
        thesis.drawOn(c, pad, y - float(layout["thesis_h"]))
        y -= float(layout["thesis_h"]) + 4.1 * mm

        chip_width = 31 * mm
        chip_h = 5.7 * mm
        c.setFillColor(STATUS_COLORS.get(self.spec.status, GRAPHITE))
        c.roundRect(pad, y - chip_h, chip_width, chip_h, 1.7 * mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("VG Mono Bold", 5.8)
        c.drawCentredString(pad + chip_width / 2, y - 3.75 * mm, self.spec.status)
        c.setFillColor(body_text)
        c.setFont("VG Sans", 6.1)
        c.drawString(pad + chip_width + 3.2 * mm, y - 3.75 * mm, "evidence-bounded implementation status")
        y -= chip_h + 2.5 * mm

        figure_h = float(layout["figure_h"])
        if self.drawing and figure_h:
            available_w = inner
            scale = min(available_w / self.drawing.width, figure_h / self.drawing.height)
            rendered_w = self.drawing.width * scale
            rendered_h = self.drawing.height * scale
            c.saveState()
            c.translate(pad + (available_w - rendered_w) / 2, y - rendered_h)
            c.scale(scale, scale)
            renderPDF.draw(self.drawing, c, 0, 0)
            c.restoreState()
            y -= figure_h + float(layout["figure_gap"])

        panels_h = float(layout["panels_h"])
        panel_y = y - panels_h
        column_width = float(layout["column_width"])
        column_gap = float(layout["column_gap"])
        for x in (pad, pad + column_width + column_gap):
            c.setFillColor(panel_bg)
            c.setStrokeColor(card_line)
            c.setLineWidth(.35)
            c.roundRect(x, panel_y, column_width, panels_h, 1.8 * mm, fill=1, stroke=1)
        text_top = y - 2.2 * mm
        self._draw_block_column(layout["left"], pad + 2.8 * mm, text_top, column_width - 5.6 * mm)
        self._draw_block_column(layout["right"], pad + column_width + column_gap + 2.8 * mm, text_top, column_width - 5.6 * mm)
        c.restoreState()


def qr_drawing(url: str, size: float = 31 * mm) -> Drawing:
    qr = QrCodeWidget(url)
    x1, y1, x2, y2 = qr.getBounds()
    scale = size / max(x2 - x1, y2 - y1)
    d = Drawing(size, size, transform=[scale, 0, 0, scale, 0, 0])
    d.add(qr)
    return d


FIGURES: list[tuple[str, str]] = [
    ("system-overview", "Venture Governance System overview"),
    ("fragment-to-decision", "From fragmented information to governed decisions"),
    ("mission-lifecycle", "Mission lifecycle"),
    ("seven-planes", "Seven-plane architecture"),
    ("plane-relations", "Relationships across architectural planes"),
    ("decision-graph", "Venture Governance Decision Graph"),
    ("evidence-graph", "Evidence Graph"),
    ("source-claim", "Source-to-claim provenance"),
    ("agent-registry", "Agent Registry"),
    ("capability-graph", "Capability Graph"),
    ("agent-selection", "Dynamic specialist selection"),
    ("maturity-ladder", "Agent maturity ladder"),
    ("execution-dag", "Execution DAG"),
    ("human-gates", "Human Gate architecture"),
    ("model-selector", "Mathematical model selector"),
    ("monte-carlo", "Monte Carlo workflow"),
    ("bayesian", "Bayesian update"),
    ("sensitivity", "Sensitivity and critical drivers"),
    ("pareto", "Pareto frontier"),
    ("red-team", "Adversarial review loop"),
    ("public-local", "Public Web versus Local Platform"),
    ("local-deployment", "Local-first deployment"),
    ("application-landscape", "Application landscape"),
    ("cross-domain", "Cross-domain mission map"),
    ("venture-funnel", "Venture opportunity funnel"),
    ("defense-boundary", "Defense governance boundary"),
    ("security-boundary", "Security boundary"),
    ("audit-timeline", "Audit timeline"),
    ("value-map", "Value mechanism map"),
    ("roadmap", "Product roadmap and System North Star"),
]


def arrow(d: Drawing, x1: float, y1: float, x2: float, y2: float, color=CYAN_DARK, width=1.2) -> None:
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=width))
    angle = math.atan2(y2 - y1, x2 - x1)
    s = 5
    pts = [
        x2,
        y2,
        x2 - s * math.cos(angle - .5),
        y2 - s * math.sin(angle - .5),
        x2 - s * math.cos(angle + .5),
        y2 - s * math.sin(angle + .5),
    ]
    d.add(Polygon(pts, fillColor=color, strokeColor=color))


def box(d: Drawing, x: float, y: float, w: float, h: float, label: str, fill=COOL, stroke=LINE, text=INK, fs=7.4) -> None:
    d.add(Rect(x, y, w, h, rx=5, ry=5, fillColor=fill, strokeColor=stroke, strokeWidth=.8))
    d.add(String(x + w / 2, y + h / 2 - 2.5, label, fontName="VG Sans Bold", fontSize=fs, fillColor=text, textAnchor="middle"))


def make_figure(kind: str, title: str, number: int) -> Drawing:
    w, h = 475, 150
    d = Drawing(w, h)
    d.add(Rect(0, 0, w, h, rx=8, ry=8, fillColor=colors.HexColor("#F5F8FA"), strokeColor=LINE, strokeWidth=.8))
    d.add(String(14, 134, f"FIGURE {number:02d}", fontName="VG Mono Bold", fontSize=6.7, fillColor=CYAN_DARK))
    d.add(String(75, 133.5, title, fontName="VG Sans Bold", fontSize=8.2, fillColor=INK))

    if kind in {"system-overview", "fragment-to-decision", "mission-lifecycle", "source-claim", "agent-selection", "monte-carlo", "audit-timeline", "venture-funnel", "roadmap"}:
        labels_by_kind = {
            "system-overview": ["Mission", "Evidence", "Specialists", "Models", "Human decision"],
            "fragment-to-decision": ["Fragments", "Claims", "Alternatives", "Scenarios", "Decision record"],
            "mission-lifecycle": ["Mandate", "Acquire", "Analyze", "Challenge", "Authorize"],
            "source-claim": ["Source", "Evidence", "Claim", "Inference", "Recommendation"],
            "agent-selection": ["Mission", "Capabilities", "Registry", "Small team", "Review"],
            "monte-carlo": ["Inputs", "Distributions", "Correlations", "Simulation", "P10/P50/P90"],
            "audit-timeline": ["Mandate", "Run", "Override", "Gate", "Outcome"],
            "venture-funnel": ["Thesis", "Signals", "6-12 synthetic", "Compare", "Human review"],
            "roadmap": ["Public demo", "Private pilot", "Validated modules", "Governed deployment", "Learning"],
        }
        labels = labels_by_kind[kind]
        bw = 78
        gap = 13
        x0 = 18
        for i, label in enumerate(labels):
            x = x0 + i * (bw + gap)
            box(d, x, 54, bw, 36, label, fill=WHITE if i % 2 == 0 else COOL)
            if i < len(labels) - 1:
                arrow(d, x + bw, 72, x + bw + gap - 3, 72)

    elif kind in {"seven-planes", "plane-relations", "public-local", "local-deployment", "security-boundary"}:
        if kind == "seven-planes":
            labels = ["Mission & Governance", "Evidence & Knowledge", "Agent Intelligence", "Math & Simulation", "Workflow", "Applications", "Security & Audit"]
        elif kind == "plane-relations":
            labels = ["Mandate", "Knowledge", "Specialists", "Models", "Workflow", "Workspace", "Control"]
        elif kind == "public-local":
            labels = ["PUBLIC WEB", "Synthetic data", "4 public agents", "LOCAL PLATFORM", "Authorized registry", "Private evidence", "Human authority"]
        elif kind == "local-deployment":
            labels = ["127.0.0.1", "Local UI", "Mission services", "Workers", "SQLite/DuckDB", "Documents", "Audit"]
        else:
            labels = ["Identity", "Permissions", "Data boundary", "Tools", "Models", "Audit", "Incident response"]
        for i, label in enumerate(labels):
            x = 28 + (i % 4) * 108
            y = 80 if i < 4 else 34
            fill = NAVY_2 if kind == "security-boundary" else (WHITE if i % 2 == 0 else COOL)
            text = WHITE if kind == "security-boundary" else INK
            box(d, x, y, 93, 28, label, fill=fill, stroke=CYAN_DARK if kind == "security-boundary" else LINE, text=text, fs=6.8)
            if i < len(labels) - 1 and i not in {3}:
                arrow(d, x + 93, y + 14, x + 105, y + 14, color=CYAN)

    elif kind in {"decision-graph", "evidence-graph", "agent-registry", "capability-graph", "cross-domain", "application-landscape"}:
        center = (238, 70)
        center_label = {
            "decision-graph": "MISSION",
            "evidence-graph": "CLAIM",
            "agent-registry": "REGISTRY",
            "capability-graph": "CAPABILITY",
            "cross-domain": "MISSION",
            "application-landscape": "DECISION PATTERN",
        }[kind]
        d.add(Circle(center[0], center[1], 26, fillColor=NAVY_2, strokeColor=CYAN, strokeWidth=1.5))
        d.add(String(center[0], center[1] - 2.5, center_label, fontName="VG Mono Bold", fontSize=7, fillColor=WHITE, textAnchor="middle"))
        labels_by_kind = {
            "decision-graph": ["Evidence", "Claim", "Model", "Scenario", "Risk", "Decision", "Outcome", "Audit"],
            "evidence-graph": ["Source", "Extract", "Supports", "Contradicts", "Assumption", "Gap", "Time", "Owner"],
            "agent-registry": ["Domain", "Capability", "State", "Limits", "Version", "Tests", "Owner", "Access"],
            "capability-graph": ["Research", "Finance", "Math", "Strategy", "Risk", "Science", "Policy", "Review"],
            "cross-domain": ["Venture", "Science", "Energy", "Logistics", "Government", "Biotech", "Finance", "Resilience"],
            "application-landscape": ["Discover", "Design", "Evaluate", "Simulate", "Optimize", "Govern", "Monitor", "Learn"],
        }
        labels = labels_by_kind[kind]
        for i, label in enumerate(labels):
            a = 2 * math.pi * i / len(labels)
            x = center[0] + 168 * math.cos(a)
            y = center[1] + 45 * math.sin(a)
            d.add(Line(center[0], center[1], x, y, strokeColor=LINE, strokeWidth=.8))
            d.add(Circle(x, y, 15, fillColor=WHITE, strokeColor=CYAN_DARK, strokeWidth=1))
            d.add(String(x, y - 2.4, label, fontName="VG Sans Bold", fontSize=5.7, fillColor=INK, textAnchor="middle"))

    elif kind == "maturity-ladder":
        labels = ["Documented", "Configured", "Executable", "Tested", "Validated", "Restricted"]
        for i, label in enumerate(labels):
            x = 36 + i * 66
            y = 34 + i * 11
            d.add(Rect(x, y, 64, 21, fillColor=colors.Color(.04, .35 + .05 * i, .47 + .05 * i), strokeColor=WHITE, strokeWidth=.5))
            d.add(String(x + 32, y + 7, label, fontName="VG Sans Bold", fontSize=5.8, fillColor=WHITE, textAnchor="middle"))

    elif kind in {"execution-dag", "human-gates", "red-team", "defense-boundary"}:
        if kind == "execution-dag":
            nodes = [(30, 70, "Plan"), (120, 93, "Evidence"), (120, 45, "Model"), (235, 93, "Synthesis"), (235, 45, "Challenge"), (350, 70, "Gate")]
        elif kind == "human-gates":
            nodes = [(30, 70, "Mandate"), (120, 70, "System work"), (220, 70, "GATE 1"), (310, 70, "Review"), (400, 70, "GATE 2")]
        elif kind == "red-team":
            nodes = [(35, 70, "Claim"), (130, 95, "Falsify"), (225, 70, "Revise"), (130, 40, "Countermodel"), (345, 70, "Human review")]
        else:
            nodes = [(25, 70, "Defensive mission"), (135, 95, "Resilience"), (135, 42, "Logistics"), (260, 70, "Human command"), (380, 70, "Authorized output")]
        for i, (x, y, label) in enumerate(nodes):
            fill = NAVY_2 if "GATE" in label or "Human" in label else WHITE
            text = WHITE if fill == NAVY_2 else INK
            box(d, x, y, 76, 27, label, fill=fill, stroke=CYAN_DARK, text=text, fs=6.2)
            if i > 0:
                px, py, _ = nodes[i - 1]
                arrow(d, px + 76, py + 13, x - 3, y + 13, color=CYAN_DARK)
        if kind == "defense-boundary":
            d.add(String(238, 27, "PROHIBITED: targeting, weapons, malware, lethal action, sabotage", fontName="VG Mono Bold", fontSize=6.3, fillColor=RED, textAnchor="middle"))

    elif kind in {"model-selector", "bayesian", "sensitivity", "pareto", "value-map"}:
        if kind == "model-selector":
            rows = [("Uncertainty", "Monte Carlo"), ("Choice", "MCDA / utility"), ("Allocation", "Optimization"), ("Cause", "Causal design")]
            for i, (q, m) in enumerate(rows):
                y = 101 - i * 23
                box(d, 36, y, 130, 18, q, fill=WHITE, fs=6.5)
                arrow(d, 168, y + 9, 255, y + 9)
                box(d, 270, y, 155, 18, m, fill=COOL, fs=6.5)
        elif kind == "bayesian":
            xs = [45, 205, 365]
            labels = ["Prior", "Evidence likelihood", "Posterior"]
            vals = [35, 70, 58]
            for x, label, val in zip(xs, labels, vals):
                d.add(Rect(x, 35, 70, val, fillColor=CYAN if label == "Posterior" else NAVY_2, strokeColor=None))
                d.add(String(x + 35, 22, label, fontName="VG Sans Bold", fontSize=6.2, fillColor=INK, textAnchor="middle"))
        elif kind == "sensitivity":
            labels = ["Evidence", "Demand", "Margin", "Timing", "Execution"]
            vals = [130, 104, 82, 58, 40]
            for i, (label, val) in enumerate(zip(labels, vals)):
                y = 105 - i * 18
                d.add(String(22, y + 3, label, fontName="VG Sans", fontSize=6.2, fillColor=INK))
                d.add(Rect(90, y, val * 2.4, 8, fillColor=CYAN_DARK if i < 2 else LINE, strokeColor=None))
        elif kind == "pareto":
            d.add(Line(55, 32, 55, 115, strokeColor=GRAPHITE))
            d.add(Line(55, 32, 430, 32, strokeColor=GRAPHITE))
            pts = [(90, 45), (130, 70), (170, 55), (220, 90), (270, 68), (320, 108), (380, 82)]
            for i, (x, y) in enumerate(pts):
                c = CYAN if i in {1, 3, 5} else MUTED
                d.add(Circle(x, y, 5, fillColor=c, strokeColor=WHITE))
            d.add(Line(130, 70, 220, 90, strokeColor=CYAN_DARK, strokeWidth=1.4))
            d.add(Line(220, 90, 320, 108, strokeColor=CYAN_DARK, strokeWidth=1.4))
            d.add(String(390, 20, "objective A", fontName="VG Mono", fontSize=6, fillColor=MUTED))
            d.add(String(15, 112, "objective B", fontName="VG Mono", fontSize=6, fillColor=MUTED))
        else:
            labels = ["Growth", "Efficiency", "Capital", "Risk", "Knowledge", "Public value"]
            for i, label in enumerate(labels):
                x = 28 + (i % 3) * 145
                y = 82 if i < 3 else 38
                box(d, x, y, 126, 28, label, fill=WHITE if i % 2 == 0 else COOL)

    return d


def export_figures() -> dict[str, tuple[int, Drawing]]:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    mapping: dict[str, tuple[int, Drawing]] = {}
    for number, (kind, title) in enumerate(FIGURES, start=1):
        drawing = make_figure(kind, title, number)
        renderSVG.drawToFile(drawing, str(ASSET_DIR / f"figure-{number:02d}-{kind}.svg"))
        mapping[kind] = (number, drawing)
    return mapping


@dataclass
class PageSpec:
    section: str
    title: str
    thesis: str
    plain: str
    technical: str
    example: str
    limitation: str
    status: str
    figure: str | None = None
    dark: bool = False


PLANES = [
    ("01", "Mission and Governance Plane", "El mandato humano define qué pregunta vale la pena responder y qué acciones están fuera de alcance.", "Mission, Decision Owner, objetivos, restricciones, políticas, reviewers, disenso, Human Gates, aprobación y kill switch.", "Un comité define que una recomendación de capital requiere una fuente primaria y una revisión independiente.", "Un gate documentado no reemplaza controles organizacionales, jurídicos ni fiduciarios.", "DESIGNED"),
    ("02", "Evidence and Knowledge Plane", "La evidencia se conserva como objetos trazables, no como texto indistinto.", "Sources, Evidence, Claims, Assumptions, Hypotheses, provenance, document lineage, temporal memory y un Evidence Graph.", "Un claim de demanda enlaza entrevistas, fecha, población observada y evidencia contradictoria.", "RAG recupera contexto; no garantiza verdad, actualidad ni representatividad.", "PROTOTYPE"),
    ("03", "Agent Intelligence Plane", "Cada misión selecciona un equipo pequeño de capacidades especializadas.", "Agent Registry, capability graph, Mission Planner conceptual, routing, synthesis, evaluator y revisión adversarial.", "Una misión de pricing puede requerir Finance, Strategy, Marketing y Mathematics, con límites explícitos.", "La arquitectura completa y sus prompts privados no están contenidos en este repositorio público.", "DESIGNED"),
    ("04", "Mathematical and Simulation Plane", "Los modelos se eligen por la pregunta, no por prestigio técnico.", "Model registry, incertidumbre, decisión, optimización, forecasting, causalidad, simulación, stress testing y model cards.", "Monte Carlo expresa un rango cuando inputs inciertos pueden describirse como distribuciones defendibles.", "Un modelo elegante aplicado a una pregunta equivocada produce precisión aparente.", "DEMONSTRATED"),
    ("05", "Workflow and Execution Plane", "La misión avanza mediante estados, checkpoints y presupuestos observables.", "DAG, jobs, queues, retries, timeouts, scheduling, checkpoints, state machines, recovery y cost budgets.", "La síntesis no comienza hasta completar evidencia mínima o registrar una excepción humana.", "La web pública no contiene una orquestación privada de producción.", "PROPOSED"),
    ("06", "Applications and Decision Workspace Plane", "Las aplicaciones son vistas de una misión común, no productos desconectados.", "Decision, Research, Simulation, Portfolio y Scenario Labs; Mission Builder; Agent Library; Model Library.", "Una misma evidencia puede alimentar una comparación de oportunidades y un memo de comité.", "La preview autenticada usa fixtures sintéticos y no equivale a un sistema productivo.", "PROTOTYPE"),
    ("07", "Security, Audit and Observability Plane", "La autoridad, los límites de datos y la trazabilidad atraviesan todos los planos.", "Identity, authorization, RBAC futuro, isolation, audit ledger, traces, evaluations, incident response, secrets y data boundaries.", "Un override registra actor, razón, timestamp, artefacto afectado y revisión posterior.", "No se afirma seguridad enterprise: hay controles demostrados, prototipos y diseño pendiente.", "DESIGNED"),
]


MODEL_FAMILIES = [
    ("Incertidumbre", "¿Qué rango de resultados es compatible con supuestos explícitos?", "Monte Carlo, Latin Hypercube, bootstrap, Bayesian updating, heavy tails.", "Distribuciones, dependencia, horizon, seed y evidencia de calibración.", "Percentiles, probabilidad de umbral, error de simulación y drivers.", "Convergencia, backtesting, sensibilidad y challenger distributions.", "No usar distribuciones decorativas cuando no hay base para parametrizarlas.", "Aprobar supuestos y tolerancia al riesgo."),
    ("Decisión", "¿Cómo comparar alternativas cuando importan varios objetivos?", "Expected utility, decision trees, value of information, MCDA y Pareto.", "Alternativas, criterios, preferencias, restricciones y consecuencias.", "Comparación explicable, trade-offs y evidencia adicional de mayor valor.", "Robustez a pesos, dominancia, regret y análisis de escenarios.", "No comprimir desacuerdos normativos en un único score silencioso.", "Definir preferencias y autorizar la decisión."),
    ("Optimización", "¿Cómo asignar recursos bajo restricciones?", "LP, MILP, convexa, robusta, estocástica, network flow y scheduling.", "Función objetivo, variables, restricciones, recursos y tolerancias.", "Solución factible, restricciones activas, gap y alternativas cercanas.", "Diagnóstico del solver, perturbaciones, factibilidad y prueba independiente.", "No usar si la función objetivo omite consecuencias materiales.", "Aprobar objetivo, restricciones y excepción."),
    ("Interacción estratégica", "¿Cómo cambian los resultados cuando otros actores responden?", "Juegos secuenciales, información incompleta, coaliciones y racionalidad acotada.", "Actores, incentivos, información, acciones y reglas de interacción.", "Equilibrios candidatos, escenarios de respuesta y puntos de negociación.", "Pruebas contra conductas alternativas y datos observados.", "No confundir equilibrio matemático con predicción conductual.", "Validar actores, incentivos y consecuencias."),
    ("Sistemas complejos", "¿Qué patrones emergen de interacciones locales y feedback?", "Agent-based models, system dynamics, Markov, networks, diffusion y cascading failure.", "Reglas micro, stocks, flows, topología, shocks y condiciones iniciales.", "Trayectorias, cascadas, cuellos de botella y resiliencia.", "Pattern-oriented validation, extremos, sensibilidad y comparación histórica.", "No usar agentes simulados como sustituto de evidencia social.", "Aprobar abstracción, escenarios y uso permitido."),
    ("Finanzas", "¿Qué rango económico y de riesgo soporta una alternativa?", "DCF por escenarios, unit economics, survival, portfolio, CVaR, liquidity stress y real options.", "Cash flows, timing, correlaciones, costos, churn, liquidez y escenarios.", "Rangos, break-even, exposure, downside y opciones de staging.", "Reconciliación, benchmarks, backtesting y stress inverso.", "No presentar valuaciones como precio verdadero ni asesoramiento.", "Aprobar supuestos, materialidad y límites fiduciarios."),
    ("Forecasting y causalidad", "¿Qué puede anticiparse y qué puede atribuirse?", "Baselines, state-space, forecast combinations; DAGs, DiD, synthetic control e IV.", "Series históricas, intervención, comparadores, timing y supuestos identificadores.", "Distribuciones predictivas o efectos estimados con intervalos y diagnóstico.", "Holdouts temporales, placebo tests, pre-trends y sensibilidad a confusión.", "Predicción no prueba causalidad; causalidad requiere diseño defendible.", "Aprobar interpretación y decisiones derivadas."),
    ("Operaciones", "¿Cómo se comporta un sistema de capacidad, colas y recursos?", "Discrete-event simulation, queueing, inventory, routing, PERT, reliability y maintenance.", "Arrivals, service times, resources, network, failure rates y políticas.", "Utilización, espera, throughput, bottlenecks y service levels.", "Trazas, casos benchmark, warm-up, replicaciones y datos operativos.", "No optimizar un proxy que empeore seguridad o calidad.", "Aprobar trade-offs operativos y cambios reales."),
]


APPLICATIONS = [
    ("Venture Capital", "¿Qué oportunidades merecen investigación o capital adicional?", "Mathematics, Finance, Strategy y Marketing", "MCDA, Monte Carlo, real options, sensitivity y portfolio scenarios", "Opportunity set, memo, preguntas, experiments y decisión trazable", "No automatiza confianza, carácter, términos ni decisión fiduciaria.", "HUMAN INVESTMENT COMMITTEE"),
    ("Business discovery", "¿Qué problemas y señales débiles justifican exploración?", "Strategy, Marketing, Mathematics y Finance", "Research synthesis, Bayesian update, clustering conceptual y VOI ordinal", "Problem landscape, hypotheses y validation plan", "La síntesis pública usa datos sintéticos o aportados; no valida demanda real.", "HUMAN MISSION OWNER"),
    ("Corporate strategy", "¿Cómo comparar apuestas estratégicas bajo incertidumbre?", "Strategy, Finance, Mathematics y Marketing", "Scenarios, real options, game theory y multiobjective comparison", "Strategic alternatives, assumptions, triggers y staged roadmap", "El contexto político y organizacional no cabe enteramente en un modelo.", "EXECUTIVE COMMITTEE"),
    ("Research and science", "¿Qué hipótesis o portfolios de investigación priorizar?", "Capability families for literature, methodology, math and independent review", "Bayesian design, causal inference, power, portfolio y replication risk", "Evidence map, protocol concept y replication questions", "No ejecuta investigación, experimentos ni revisión ética.", "SCIENTIFIC AND ETHICS REVIEW"),
    ("Government and infrastructure", "¿Cómo comparar proyectos y políticas con efectos distribuidos?", "Policy, evidence, finance, operations, risk and human review capabilities", "CBA scenarios, MCDA, network flow, system dynamics y stress testing", "Options, distributional impacts, constraints y public decision record", "No reemplaza mandato democrático, legalidad ni participación pública.", "AUTHORIZED PUBLIC OFFICIAL"),
    ("Defense and resilience", "¿Cómo fortalecer preparación, logística y continuidad defensiva?", "Resilience, logistics, infrastructure, cyber defense and human command capabilities", "Scenario analysis, network resilience, inventory, reliability y stress tests", "Preparedness options, dependencies y defensive capability portfolio", "Se prohíben targeting, armas, acción letal, malware, sabotaje y maximización de daño.", "HUMAN COMMAND AUTHORITY"),
]


BASE_PAGES = [
    PageSpec("00", "Nota de alcance", "Este documento describe una arquitectura institucional y separa con precisión lo implementado de lo propuesto.", "Venture Governance se presenta como una arquitectura orientada a misiones para coordinar evidencia, especialistas artificiales, modelos, simulaciones y autoridad humana.", "La base verificable incluye el sitio público, el Lab determinista, el catálogo de aplicaciones, la preview protegida y dos whitepapers publicados. El ZIP de biblioteca y el DOCX maestro no estuvieron disponibles para este build.", "El lector puede recorrer una misión de venture y observar cómo se distinguen evidencia, supuestos, incertidumbre y decisión.", "MASTER CANDIDATE. No reemplaza revisión jurídica, de seguridad, matemática, científica ni institucional.", "LIMITED"),
    PageSpec("00", "Estado de madurez", "La madurez se informa por componente; una pantalla o un PDF no prueban capacidad operativa.", "Implemented significa código verificable; Demonstrated, una función pública reproducible; Prototype, una interacción acotada; Designed o Proposed, una arquitectura aún no operacional.", "El Public Lab demuestra 4 agentes públicos, 12 modelos, generación seeded, ranking, export y revisión local. La preview protegida mezcla Demo, Prototype, Preview y Planned según el módulo.", "La página de System Health declara telemetría no expuesta en vez de inventar valores.", "La biblioteca conceptual mencionada por documentos previos no se cuenta como agentes ejecutables ni validados.", "DEMONSTRATED"),
]


def page_specs() -> list[PageSpec]:
    pages: list[PageSpec] = []
    pages += BASE_PAGES
    pages += [
        PageSpec("EXEC", "Carta ejecutiva", "Las instituciones no necesitan más respuestas aisladas; necesitan una forma gobernada de decidir qué evidencia, modelos y autoridad requiere cada misión.", "Venture Governance propone que la unidad de trabajo sea una misión con dueño, límites, evidencia, alternativas, objeciones, gates y outcome posterior.", "La arquitectura evita tratar agentes, dashboards o scores como fines. Los encadena mediante contratos, provenance y revisión proporcional a la consecuencia.", "Una misión de inversión y una misión de infraestructura comparten trazabilidad, aunque sus datos, modelos y autoridad sean distintos.", "La amplitud de aplicaciones es una tesis arquitectónica, no evidencia de despliegue en todos los dominios.", "DESIGNED", dark=True),
        PageSpec("EXEC", "Resumen ejecutivo", "Venture Governance transforma problemas institucionales difusos en misiones estructuradas y auditables.", "Cada misión combina evidencia, un equipo pequeño de capacidades, modelos seleccionados por pregunta, escenarios, revisión adversarial y una decisión humana registrada.", "Siete planos conectados separan mandato, conocimiento, especialistas, matemática, workflow, aplicaciones y control. El Decision Graph enlaza objetos y relaciones sin reducir la organización a texto.", "En venture capital, el flujo va de tesis a 6-12 oportunidades sintéticas, cuatro perspectivas públicas, comparación y revisión humana.", "El sistema reduce incertidumbre; no elimina juicio, conflicto de valores ni responsabilidad.", "DEMONSTRATED"),
        PageSpec("EXEC", "Venture Governance en una página", "Una misión gobernada es el contenedor mínimo de evidencia, análisis y autoridad.", "La misión empieza con una pregunta y un Decision Owner; termina con una decisión, un handoff autorizado y observación del outcome.", "Objetivo, restricciones, actores, sources, claims, assumptions, models, scenarios, risks, dissent, Human Gates, outputs, decision y audit events forman un registro conectado.", "La pregunta '¿qué oportunidad merece validación?' se configura con agentes públicos y modelos demostrativos sin autorizar inversión.", "La calidad del resultado está limitada por evidencia, diseño del modelo, contexto y revisión humana.", "DEMONSTRATED", "system-overview"),
        PageSpec("I", "El problema institucional", "La información fragmentada impide ver qué soporta una conclusión, qué la contradice y quién puede actuar.", "Documentos, planillas, conversaciones y modelos suelen vivir separados. La decisión pierde lineage y el aprendizaje posterior no vuelve al sistema.", "El problema combina semántica, workflow, model risk, permisos y gobernanza. Resolver solo búsqueda o solo automatización deja huecos críticos.", "Un score de proyecto puede circular sin supuestos de demanda ni evidencia de costos, produciendo una falsa sensación de objetividad.", "Estructurar información aumenta legibilidad, pero no corrige evidencia sesgada por sí sola.", "DESIGNED", "fragment-to-decision"),
        PageSpec("I", "La tesis", "La arquitectura se configura alrededor de la misión, no alrededor de un agente universal.", "Una misión define el problema, los límites y el nivel de control. Luego selecciona evidencia, capacidades y modelos proporcionales.", "La tesis combina problem decomposition, capability requirements, model selection, execution DAG, independent review y Human Gates.", "Una misión de pricing puede usar sensibilidad y escenarios; una de causalidad exige diseño identificador y revisión metodológica.", "La arquitectura es una propuesta de coordinación. Su eficacia debe validarse por misión y organización.", "DESIGNED"),
        PageSpec("I", "Qué es y qué no es", "Es infraestructura para decisiones trazables; no es un oráculo, un swarm indiscriminado ni una autoridad autónoma.", "El sistema investiga, organiza, modela, simula, compara, cuestiona y recomienda dentro de límites.", "No aprueba inversiones, no despliega empresas, no reemplaza autoridad legal, no ejecuta código de usuario y no expone prompts o modelos privados.", "El Lab puede proponer un experimento de validación, pero no contactar clientes ni gastar capital.", "Una recomendación de alta calidad sigue siendo una entrada para decisión humana.", "DEMONSTRATED"),
        PageSpec("II", "El modelo de misión", "Toda misión conserva objetivo, propietario, alcance, restricciones, evidencia, modelos, objeciones y resultado posterior.", "La secuencia visible hace que las excepciones sean revisables y que los outputs no pierdan su contexto.", "El estado se expresa como objetos versionados; los gates consumen artefactos y políticas, y producen decisiones firmadas o excepciones.", "Un cambio de supuesto invalida downstream artifacts y dispara revisión, no una edición silenciosa del score.", "La implementación pública solo demuestra una fracción local de este modelo.", "DEMONSTRATED", "mission-lifecycle"),
        PageSpec("II", "Principios no negociables", "Evidencia antes que elocuencia; incertidumbre explícita; autoridad humana; lectura por defecto; complejidad progresiva; reproducibilidad; revisión adversarial; gobierno proporcional.", "Cada claim material identifica si es observado, inferido, supuesto, hipotético o recomendado.", "Los modelos registran inputs, versión, seed, limitaciones y condiciones de no uso. La acción crítica exige permiso, trazabilidad y reversibilidad.", "Un resultado alto con evidencia débil no recibe automáticamente la clase más prometedora.", "Los principios son controles de diseño; requieren políticas y conducta organizacional para funcionar.", "DEMONSTRATED"),
        PageSpec("III", "Siete planos conectados", "La arquitectura separa responsabilidades sin crear silos: cada plano consume y produce objetos para los demás.", "Mission, Evidence, Agent, Math, Workflow, Applications y Security forman un tejido común.", "Los contratos tipados y el Decision Graph enlazan provenance, ejecución, decisión y outcome. Security y audit atraviesan todas las transiciones.", "Un modelo solo puede correr con inputs autorizados y su output conserva versión, assumptions y reviewer.", "La topología es conceptual; los componentes de producción requieren diseño e integración adicionales.", "DESIGNED", "seven-planes", dark=True),
    ]
    for number, title, thesis, technical, example, limitation, status in PLANES:
        pages.append(PageSpec("III", title, thesis, thesis, technical, example, limitation, status))
    pages += [
        PageSpec("III", "Los planos funcionan como una red de contratos", "La misión gobierna el propósito; evidencia y modelos gobiernan la justificación; workflow gobierna el proceso; seguridad gobierna la posibilidad de actuar.", "Ningún plano puede declarar éxito aisladamente.", "Cada handoff conserva schema, provenance, policy checks, budget y correlation ID. Un fallo puede pausar, reintentar o escalar sin borrar el historial.", "Si Evidence marca una fuente como obsoleta, Workflow bloquea la síntesis o registra una excepción humana.", "La consistencia distribuida, recuperación y retención aún son diseño futuro.", "DESIGNED", "plane-relations"),
        PageSpec("IV", "Venture Governance Decision Graph", "El Decision Graph representa decisiones, no solo documentos.", "Organizaciones, usuarios, misiones, agentes, modelos, sources, evidence, claims, assumptions, scenarios, risks, policies, decisions, outcomes y audit events son objetos relacionados.", "Las relaciones soporta, contradice, depende de, deriva de, evalúa, simula, restringe, aprueba, rechaza, afecta y reemplaza conservan dirección y tiempo.", "Un claim superseded permanece visible y el memo final señala cuál versión fue autorizada.", "El grafo no convierte relaciones ambiguas en causalidad ni reemplaza un modelo de dominio validado.", "DESIGNED", "decision-graph"),
        PageSpec("IV", "Entidades del Decision Graph", "Los objetos separan identidad, estado, contenido y autoridad.", "Mission, Evidence, Claim y Decision poseen IDs estables; Source conserva origen y fecha; Model conserva versión y intended use; Audit Event conserva actor y razón.", "Schemas validan cardinalidad, ownership, timestamps y estados. Las propiedades sensibles se limitan por policy y contexto.", "Una hipótesis puede enlazarse a tres claims de soporte, dos contradicciones y un experimento pendiente.", "Un esquema inicial debe evolucionar con gobernanza; no puede anticipar toda realidad institucional.", "PROPOSED"),
        PageSpec("IV", "Relaciones y acciones gobernadas", "Las relaciones explican por qué un objeto importa; las acciones definen qué puede cambiar.", "Review, compare, update, approve, reject, archive, simulate, escalate y export son acciones permitidas por policy.", "Una acción valida identidad, permiso, precondiciones, materialidad, reversibilidad y logging antes de cambiar estado.", "Archive puede ocultar una alternativa de vistas activas sin borrar el audit trail.", "La web pública mantiene acciones locales y no autoriza operaciones institucionales.", "PROTOTYPE"),
        PageSpec("V", "Evidence Graph", "La evidencia se evalúa por provenance, cobertura, recencia, contradicción y adecuación al claim.", "Sources producen evidence units; evidence units soportan o contradicen claims; claims alimentan hipótesis, modelos y decisiones.", "El grafo registra observed, inferred, assumed, simulated y recommended como categorías distintas.", "Una entrevista es evidencia observada para esa persona y fecha; extrapolar mercado es una inferencia adicional.", "Trazabilidad no garantiza calidad ni representatividad.", "DESIGNED", "evidence-graph"),
        PageSpec("V", "Source-to-claim provenance", "Cada conclusión debe permitir volver a la fuente y reconstruir la transformación.", "Lineage registra source locator, extract, transformation, reviewer, timestamp, version y downstream consumers.", "Cuando una fuente cambia, el sistema identifica claims y outputs afectados para revisión selectiva.", "Una cifra de costos enlaza al documento, celda, moneda, período y ajuste aplicado.", "Fuentes con licencias o permisos restrictivos requieren controles adicionales.", "DESIGNED", "source-claim"),
        PageSpec("V", "Agent Intelligence Fabric", "La biblioteca es un catálogo de especialización; la misión activa solo un equipo pequeño.", "Mission -> decomposition -> capability requirements -> Registry query -> specialist team -> DAG -> independent review -> Human Gate.", "Cada perfil declara capability, inputs, outputs, limits, tools, policy, version, tests y maturity.", "Una misión de supply risk selecciona investigación, network analysis, finance y review; no miles de agentes.", "El número de conceptos catalogados no equivale a perfiles ejecutables.", "DESIGNED", "agent-registry", dark=True),
        PageSpec("V", "Agent Registry", "El registro distingue documentación de ejecución y validación.", "Documented, Configured, Executable, Tested, Validated, Restricted y Deprecated son estados separados.", "Las transiciones requieren artefactos: schema, tests, evals, security review, owner y intended-use approval.", "Un PDF puede describir un rol Documented sin contener runtime, tools ni evaluación.", "El ZIP primario no estuvo disponible; los recuentos históricos se excluyen de claims operativos.", "LIMITED", "capability-graph"),
        PageSpec("V", "Selección dinámica de especialistas", "La selección minimiza complejidad compatible con cobertura y revisión independientes.", "El router conceptual puntúa fit de capability, evidencia requerida, risk tier, access y cost budget.", "La selección incluye una función de síntesis y una revisión independiente cuando la consecuencia lo exige.", "Una pregunta sencilla usa reglas y un modelo básico; una asignación material agrega challenger y Human Gate.", "Routing automático puede heredar sesgos del registro y requiere evaluación.", "DESIGNED", "agent-selection"),
        PageSpec("V", "Escalera de madurez", "La madurez no se infiere por cantidad de archivos.", "Documented describe; Configured posee contrato; Executable corre; Tested supera casos; Validated sirve un intended use; Restricted limita uso.", "Deprecated conserva lineage para reproducir decisiones históricas.", "Un agente puede estar Validated para síntesis documental y Restricted para recomendaciones regulatorias.", "La validación es específica de contexto y caduca con cambios materiales.", "DESIGNED", "maturity-ladder"),
        PageSpec("V", "Execution DAG", "El DAG hace visibles dependencias, checkpoints y rutas de recuperación.", "Nodes consumen artefactos versionados; edges declaran precondiciones; retries y timeouts están acotados; budgets evitan expansión incontrolada.", "Los nodos críticos pueden requerir approval tokens emitidos por Human Gates.", "Una simulación fallida no borra evidencia; registra error y permite usar un challenger o escalar.", "El orquestador privado completo está fuera de este repositorio.", "PROPOSED", "execution-dag"),
        PageSpec("V", "Revisión adversarial", "Toda conclusión material debe poder ser contradicha, falsada y escalada.", "Red Team es una función acotada: busca evidencia faltante, supuestos frágiles, incentivos, modelos alternativos y failure modes.", "La respuesta se registra como dissent, revision, unresolved risk o accepted exception.", "Una oportunidad líder pierde clasificación si su evidencia central no resiste un escenario de demanda baja.", "Crítica sin mandato puede generar ruido; necesita criterios de salida.", "DESIGNED", "red-team"),
        PageSpec("VI", "Selector de modelos", "La primera pregunta es qué decisión debe informarse, no qué algoritmo está disponible.", "Un árbol de selección cruza tipo de pregunta, datos, causalidad, incertidumbre, reversibilidad, materialidad y tiempo.", "Model cards declaran intended use, assumptions, outputs, validation, limitations y required Human Gate.", "Para un portfolio con restricciones se considera optimización; para causalidad, un diseño identificador antes que forecasting.", "Algunas decisiones no mejoran con un modelo cuantitativo.", "DESIGNED", "model-selector", dark=True),
    ]
    for idx, (name, question, methods, inputs, outputs, validation, nonuse, gate) in enumerate(MODEL_FAMILIES, start=1):
        fig = {1: "monte-carlo", 2: "pareto", 7: "bayesian", 8: "sensitivity"}.get(idx)
        pages.append(PageSpec("VI", f"Modelos para {name.lower()}", question, f"Métodos: {methods}", f"Inputs: {inputs} Outputs: {outputs}", f"Validación: {validation}", f"No usar: {nonuse} Human Gate: {gate}", "DESIGNED" if idx not in {1, 2, 6, 8} else "DEMONSTRATED", fig))
    pages += [
        PageSpec("VI", "Mathematical Assurance", "La meta no es 'matemática sin errores', sino reducir, detectar, documentar y contener errores.", "Specification, dimensional checks, schema and domain validation, bounds, numerical stability, property tests y benchmark cases forman la primera línea.", "Independent implementations, solver diagnostics, convergence, seeds, sensitivity, challenger models, calibration y versioning forman la segunda.", "Un Monte Carlo reporta P10/P50/P90, error de simulación, correlaciones, convergence y drivers.", "Assurance reduce riesgo; no demuestra que el modelo represente correctamente el mundo.", "DESIGNED"),
        PageSpec("VI", "Aseguramiento de Monte Carlo", "La simulación solo es informativa cuando inputs, dependencia y error numérico son visibles.", "Se registran distribuciones, parámetros, correlaciones, iteraciones, seed, convergence y threshold definitions.", "Replicaciones y intervalos de error separan variación del sistema de ruido de simulación.", "Un P90 de retorno no significa 90% de probabilidad de éxito si el modelo omite fallas estructurales.", "Resultados dependen del modelo generador y no predicen eventos fuera de alcance.", "DEMONSTRATED", "monte-carlo"),
        PageSpec("VI", "Aseguramiento de optimización", "Una solución óptima debe ser primero factible y después interpretable.", "Se declaran objective, constraints, solver, tolerances, optimality gap, active constraints y alternative solutions.", "Stress tests perturban capacidad, costos y demanda; un challenger busca soluciones con menor fragilidad.", "Una asignación levemente subóptima puede preferirse por resiliencia o equidad.", "Optimalidad matemática no autoriza el objetivo ni sus impactos.", "DESIGNED"),
        PageSpec("VI", "Bayesian update", "Nueva evidencia modifica una creencia previa; no convierte una señal en certeza.", "Posterior es proporcional a likelihood por prior. Ambos deben exponerse junto con sensibilidad y evidencia faltante.", "El update puede informar qué experimento reduce más incertidumbre relevante.", "Una entrevista favorable actualiza una hipótesis de demanda, pero no prueba causalidad ni tamaño de mercado.", "Priors y likelihoods mal especificados producen confianza engañosa.", "DEMONSTRATED", "bayesian"),
        PageSpec("VI", "Sensibilidad y drivers críticos", "La decisión es frágil si pequeños cambios razonables alteran ranking o recomendación.", "One-at-a-time tornado es pedagógico; global sensitivity es preferible cuando existen interacciones materiales.", "Se reportan rangos, rank reversals, elasticidades y parámetros que justifican evidencia adicional.", "Si evidencia y margen dominan el ranking, el siguiente paso valida esas variables.", "Sensibilidad no corrige un modelo estructuralmente equivocado.", "DEMONSTRATED", "sensitivity"),
        PageSpec("VI", "Pareto y comparación responsable", "Las alternativas no dominadas preservan trade-offs que un score único puede ocultar.", "Una alternativa domina a otra si es al menos igual en todos los objetivos y mejor en uno, dadas las métricas definidas.", "La frontera se combina con restricciones, uncertainty bands y preferencias humanas.", "Una opción de menor retorno puede permanecer por menor riesgo y mayor reversibilidad.", "La frontera depende de objetivos y mediciones elegidos.", "DEMONSTRATED", "pareto"),
        PageSpec("VII", "Simulation and scenarios", "Los escenarios exploran condiciones plausibles; no predicen el futuro.", "El sistema separa deterministic scenarios, probabilistic simulation, stress tests, reverse stress y complex-system models.", "Cada escenario declara narrative, variables, correlations, time horizon, triggers y signposts.", "Un shock de supply chain revela dependencias y acciones de resiliencia antes de una crisis.", "Escenarios pueden omitir discontinuidades y conductas no modeladas.", "DESIGNED"),
        PageSpec("VII", "Ranking y comparación", "El ranking organiza atención; no debe borrar incertidumbre, evidencia débil ni disenso.", "MCDA normaliza pesos a 100%, muestra contribuciones y aplica ajustes visibles por risk, evidence y uncertainty.", "Robustness tests perturban pesos y reportan mean rank, first-place frequency y top-three retention.", "Una opción con score alto y weak evidence queda como 'requiere validación', no 'altamente prometedora'.", "Los pesos públicos son ficticios y no replican scoring privado.", "DEMONSTRATED"),
        PageSpec("VIII", "Human-in-Command", "Las personas autorizadas definen mandato, aprueban supuestos críticos, aceptan riesgo y deciden.", "Human-in-the-loop participa en pasos; human-on-the-loop supervisa; Human-in-Command conserva autoridad y puede detener el sistema.", "La materialidad, autonomía, irreversibilidad, incertidumbre y población afectada elevan el nivel de control.", "El sistema recomienda; un comité interpreta contexto y autoriza o rechaza.", "La presencia de un humano no garantiza revisión efectiva; roles y tiempo deben ser reales.", "DESIGNED", "human-gates", dark=True),
        PageSpec("VIII", "Matriz de autoridad", "El sistema ejecuta análisis; el humano controla límites, interpretación y autorización.", "Buscar y sintetizar pueden automatizarse dentro de fuentes permitidas. Formular hipótesis es propuesta. Modelar exige supuestos aprobados. Autorizar es humano.", "Las acciones críticas permanecen read-only by default y requieren identidad, policy, reason y audit.", "En salud, defensa, justicia, finanzas, gobierno, infraestructura y biotech se exige revisión reforzada.", "La matriz debe adaptarse a ley, política y riesgo local.", "DESIGNED"),
        PageSpec("VIII", "Governance and audit", "Toda excepción material debe quedar visible para revisión posterior.", "El audit record incluye actor, role, mission, artifact, action, reason, policy, timestamp, correlation ID y outcome.", "Append-only es un objetivo de diseño; retención, firmas y controles de integridad requieren implementación validada.", "Un override de un constraint dispara segunda aprobación y monitoreo.", "Este repositorio no posee un ledger productivo ni retención enterprise.", "PROTOTYPE", "audit-timeline"),
        PageSpec("IX", "Public Web", "La web pública explica y demuestra sin exponer datos, prompts o ejecución privada.", "Incluye home, applications, Lab, demo, methodology, whitepaper y request access.", "Usa datos sintéticos, cuatro agentes públicos, 12 modelos simplificados, localStorage y export. Investigación web opcional es off-by-default y no altera ranking.", "Un visitante puede reproducir una ejecución con inputs sanitizados y seed.", "No contiene archivos privados, calibración histórica ni operaciones críticas.", "IMPLEMENTED", "public-local"),
        PageSpec("IX", "Venture Governance Local", "La plataforma local propuesta protege evidencia y workflows autorizados en una superficie separada.", "Local-only por defecto; Hybrid y External-enabled requieren política explícita. Conceptualmente usa 127.0.0.1, SQLite, DuckDB, document store, workers, checkpoints, logs y backups.", "Mission Builder, Research, Decision, Simulation y Portfolio Labs comparten un Decision Graph y audit.", "Una organización puede mantener documentos y modelos dentro de su boundary local.", "La aplicación privada completa no está contenida ni afirmada como terminada.", "DESIGNED", "local-deployment"),
        PageSpec("IX", "Separación público/local", "La separación es una frontera de seguridad, propiedad intelectual y honestidad de producto.", "Public Web contiene contratos visibles, synthetic fixtures y límites. Local Platform admite solo registros, modelos, datos y permisos autorizados.", "Adaptadores futuros deben validate, allow-list, strip secrets y fail closed.", "Un catálogo externo nunca expone prompts, provider metadata ni internal identifiers al browser.", "Conectar superficies sin threat model degradaría ambas.", "DESIGNED"),
    ]
    for i, (name, question, team, models, outputs, limitation, gate) in enumerate(APPLICATIONS):
        fig = {0: "venture-funnel", 4: "application-landscape", 5: "defense-boundary"}.get(i)
        pages.append(PageSpec("X", name, question, f"Equipo: {team}.", f"Modelos: {models}. Outputs: {outputs}.", f"Human Gate: {gate}.", limitation, "DEMONSTRATED" if i == 0 else "DESIGNED", fig))
    pages += [
        PageSpec("X", "Cross-domain mission map", "Las aplicaciones se agrupan por patrón decisional: Discover, Design, Evaluate, Simulate, Optimize y Govern.", "La misma arquitectura puede configurarse para venture studios, PE, M&A, banca, seguros, ciencia, energía, agua, logística, manufactura, ciudades, telecom, espacio, compliance y resiliencia.", "Cada configuración cambia data, capabilities, models, outputs, risk tier y Human Gate.", "Una misión de energía combina escenarios, capacity planning, finance y policy review.", "El mapa expresa potencial arquitectónico, no clientes ni implementaciones validadas.", "PROPOSED", "cross-domain"),
        PageSpec("XI", "Value creation", "El valor se explica por mecanismos, no por ROI inventado.", "Growth descubre oportunidades; Efficiency reduce duplicación; Capital mejora staging; Risk anticipa fallas; Knowledge preserva memoria; Public value mejora capacidad institucional.", "Cada misión debe separar potential value, validated value, capturable value y actual revenue.", "Reutilizar un Evidence Graph puede reducir trabajo de investigación sin prometer un porcentaje.", "El valor depende de datos, adopción, integración y decisiones humanas.", "DESIGNED", "value-map"),
        PageSpec("XI", "Business model", "El wedge inicial es venture capital; la arquitectura se expande solo donde evidencia y gobernanza justifican inversión.", "Opciones futuras incluyen private workstation, mission pilots, validated model packs y governed deployment support.", "Pricing debe reflejar scope, evidence sensitivity, validation, support y risk tier, no número de agentes.", "Un piloto valida una misión específica antes de generalizar plataforma.", "No se declaran clientes, ingresos, ROI ni product-market fit.", "PROPOSED"),
        PageSpec("XII", "Deployment architecture", "El despliegue debe preservar data boundaries y ofrecer modos explícitos de conectividad.", "Local-only bloquea egress; Hybrid permite providers autorizados; External-enabled agrega tools bajo policy, allowlists, timeouts y audit.", "Workers usan checkpoints y cost budgets; los secrets nunca llegan al cliente; backups prueban restore.", "Una misión sensible puede prohibir red y permitir solo modelos locales revisados.", "El diseño requiere threat modeling, performance tests y operational runbooks.", "DESIGNED"),
        PageSpec("XII", "Security", "La seguridad se construye con identidad, least privilege, aislamiento, provenance, audit y respuesta a incidentes.", "Controles: authentication, authorization, RBAC futuro, encryption, secrets, prompt-injection defense, tool allowlists, egress control, rate limits y kill switch.", "Las acciones de alto impacto se revalidan server-side; ocultar un botón no es autorización.", "El Worker público añade anti-framing, MIME-sniffing, referrer y device-permission headers.", "No se afirma seguridad enterprise ni multi-tenant isolation productiva.", "PROTOTYPE", "security-boundary", dark=True),
        PageSpec("XII", "Risks and limitations", "El mayor riesgo es confundir una arquitectura legible con una capacidad validada.", "Riesgos: evidencia sesgada, automation bias, model misuse, data leakage, prompt injection, brittle orchestration, stale knowledge, cost expansion y governance theater.", "Mitigaciones: labels, abstention, challengers, staged autonomy, independent review, audits, tests y incident response.", "Un dashboard convincente puede aumentar confianza sin aumentar verdad; por eso madurez y limitaciones son visibles.", "No existe control que elimine todos los riesgos.", "DESIGNED"),
        PageSpec("XIII", "Roadmap", "La secuencia correcta valida misiones y controles antes de ampliar autonomía.", "Phase 1 fortalece demo y evidencia. Phase 2 valida private pilots. Phase 3 prueba model packs y audit. Phase 4 integra deployments gobernados. Phase 5 aprende de outcomes.", "Cada fase tiene exit criteria de seguridad, calidad, utilidad y human authority.", "No se activa un provider externo hasta validar schemas, timeouts, logging y fallback.", "Fechas y alcance dependen de recursos y resultados; el roadmap no es compromiso comercial.", "PROPOSED", "roadmap"),
        PageSpec("XIII", "Conclusión", "Venture Governance no busca producir una respuesta universal.", "Construye, para cada misión, una arquitectura específica de evidencia, especialistas, modelos, simulaciones y revisión humana.", "El sistema es valioso si hace visible qué se sabe, qué se supone, qué puede fallar, qué alternativa existe y quién tiene autoridad.", "El éxito no es más agentes ni más tokens; es una mejor reducción de incertidumbre relevante.", "La tesis exige validación empírica por misión y una disciplina constante de límites.", "DESIGNED"),
        PageSpec("APP", "Glossary", "Un vocabulario común reduce ambigüedad entre ejecutivos, analistas e ingenieros.", "Mission: unidad gobernada. Claim: afirmación evaluable. Evidence: observación con provenance. Assumption: condición aceptada. Scenario: configuración exploratoria. Human Gate: decisión humana requerida.", "Model card: intended use, inputs, assumptions, validation y limits. Decision Graph: objetos y relaciones de decisión. Outcome: resultado observado posterior.", "Restricted significa uso limitado; Deprecated conserva lineage pero no debe seleccionarse.", "Las definiciones son operativas y pueden requerir adaptación legal o sectorial.", "DESIGNED"),
        PageSpec("APP", "Bibliography - governance and architecture", "Las fuentes externas sustentan principios generales; no determinan la identidad ni el diseño visual del sistema.", "NIST AI RMF 1.0 (2023), NIST.AI.100-1; NIST Generative AI Profile (2024), NIST.AI.600-1; Federal Reserve SR 26-2 Revised Guidance on Model Risk Management (2026); ISO 31000:2018; NIST CSF 2.0 (2024); NIST SP 800-53 Rev. 5.", "W3C PROV-O (2013); W3C Data on the Web Best Practices (2017); NASA Systems Engineering Handbook Rev. 2 (2016).", "Palantir Architecture Center fue revisado solo para principios generales de comunicación e integración; no se copiaron productos, texto, diagramas, layouts ni assets.", "Las normas deben verificarse contra su edición y aplicabilidad vigente antes de implementación.", "VALIDATED"),
        PageSpec("APP", "Bibliography - mathematics and decision science", "La biblioteca matemática se apoya en literatura primaria y textos de referencia, no en una lista ornamental.", "Pearl, Causality (2009); Rubin (1974), estimating causal effects; Saltelli et al. (2008), Global Sensitivity Analysis; Sobol (1993), sensitivity estimates; Rockafellar and Uryasev (2000), CVaR optimization.", "Law (2015), Simulation Modeling and Analysis; Fishman (1996), Monte Carlo; Box, Jenkins, Reinsel and Ljung (2015), Time Series; Keeney and Raiffa (1976), Decisions with Multiple Objectives.", "Black and Litterman (1992), global portfolio optimization; Puterman (1994), Markov Decision Processes; Sterman (2000), Business Dynamics.", "La pertinencia de cada método depende de intended use, datos y validación.", "VALIDATED"),
        PageSpec("APP", "Technical appendix A - public implementation", "La demostración pública es determinista, acotada y reproducible.", "Next.js App Router, React, strict TypeScript, Vinext/Vite y Sites. El engine usa pure functions, sanitized inputs, numeric bounds y seeded randomness.", "Doce modelos públicos exponen supuestos, interpretación y limitaciones; pesos normalizan a 100%. State permanece en localStorage y export JSON/CSV.", "Investigación web opcional usa un endpoint fijo, guarda snippets como unverified context y no altera ranking.", "No hay paid API, private dataset, production database ni arbitrary fetch.", "IMPLEMENTED"),
        PageSpec("APP", "Technical appendix B - claims register", "Los claims se clasifican por evidencia y riesgo antes de publicación.", "Implemented: rutas, código y tests. Demonstrated: flujo público reproducible. Prototype: preview acotada. Designed/Proposed/Future: arquitectura no operacional. Unsupported: remover.", "Claim crítico: '1.970 agentes'. Estado: Unsupported como capacidad; solo aparece como un recuento histórico secundario de conceptos y requiere ZIP primario.", "Claim crítico: 'enterprise security'. Estado: Remove; existe diseño y algunos controles, no assurance enterprise.", "El registro debe actualizarse con cada release y evidencia nueva.", "LIMITED"),
        PageSpec("APP", "Technical appendix C - originality matrix", "Los principios generales estudiados se traducen en soluciones propias y verificables.", "Representación operativa -> Venture Governance Decision Graph. Equipos humano-agente -> Human-in-Command y pequeños equipos. Capa común -> siete planos conectados. Despliegue gobernado -> Local-only por defecto.", "Diferencias: vocabulario propio, misión como unidad, cuatro agentes públicos, estados de madurez, paleta y composición originales.", "Controles: no third-party assets, no copied diagrams, no proprietary product names, no exact palettes o layouts.", "La revisión interna no sustituye asesoría legal de propiedad intelectual.", "VALIDATED"),
        PageSpec("APP", "Technical appendix D - route and source map", "Solo se enlazan rutas realmente presentes en el repositorio.", "Home /; Applications /applications; Lab /lab; Demo /lab/demo; Methodology /lab/methodology; Results /lab/results/[id]; Request access /request-access; protected preview /app/login y /app.", "Fuentes internas: README, docs/public-lab*, docs/applications, docs/platform-architecture, src/lab, src/applications y tests.", "Whitepapers inspeccionados: venture-governance-system-whitepaper-publico-v2.pdf y venture-intelligence-whitepaper.pdf.", "Rutas dinámicas y autenticadas dependen de parámetros o identidad y deben probarse en su contexto.", "VALIDATED"),
        PageSpec("NORTH STAR", "System North Star", "Maximizar la reducción de incertidumbre relevante por unidad de tiempo, costo y riesgo, preservando la autoridad humana.", "La métrica guía selección de evidencia, capacidades, modelos y experimentos. No premia volumen de output ni apariencia de certeza.", "Cada misión define uncertainty targets, cost/risk budgets, Human Gates y outcome metrics.", "La mejor siguiente acción puede ser obtener evidencia, simplificar el modelo, posponer o detener.", "La North Star orienta; no reemplaza valores, ley ni responsabilidad.", "DESIGNED", dark=True),
    ]
    return pages


def label_block(label: str, text: str, style_map: dict[str, ParagraphStyle], dark: bool) -> list[Flowable]:
    suffix = "_dark" if dark else ""
    return [Paragraph(label, style_map[f"label{suffix}"]), Paragraph(esc(text), style_map[f"body{suffix}"])]


def data_table(rows: list[list[str]], widths: list[float], style_map: dict[str, ParagraphStyle]) -> Table:
    data = []
    for r, row in enumerate(rows):
        data.append([Paragraph(esc(cell), style_map["table_bold" if r == 0 else "table"]) for cell in row])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY_2),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), .35, LINE),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F7F9FA")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def link_table(items: list[tuple[str, str]], style_map: dict[str, ParagraphStyle]) -> Table:
    cells = []
    for label, url in items:
        cells.append(Paragraph(f'<a href="{url}" color="#007A92">{esc(label)}</a>', style_map["small"]))
    rows = []
    for i in range(0, len(cells), 2):
        rows.append([cells[i], cells[i + 1] if i + 1 < len(cells) else ""])
    table = Table(rows, colWidths=[80.5 * mm, 80.5 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F5F8FA")),
        ("BOX", (0, 0), (-1, -1), .4, LINE),
        ("INNERGRID", (0, 0), (-1, -1), .3, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def on_page(canvas, doc) -> None:
    page = canvas.getPageNumber()
    dark = page in DARK_PAGES
    canvas.saveState()
    canvas.setFillColor(NAVY if dark else WHITE)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    if dark:
        canvas.setStrokeColor(colors.HexColor("#0D3C5B"))
        for y in range(80, 760, 48):
            canvas.line(0, y, A4[0], y)
        canvas.setStrokeColor(CYAN)
        canvas.setLineWidth(2)
        canvas.line(20 * mm, 22 * mm, 46 * mm, 22 * mm)
    else:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(.5)
        canvas.line(18 * mm, 17 * mm, A4[0] - 18 * mm, 17 * mm)
        canvas.line(18 * mm, A4[1] - 15 * mm, A4[0] - 18 * mm, A4[1] - 15 * mm)
    if page > 1:
        canvas.setFont("VG Mono", 6.5)
        canvas.setFillColor(colors.HexColor("#B7CAD4") if dark else MUTED)
        canvas.drawString(18 * mm, A4[1] - 11.5 * mm, "VENTURE GOVERNANCE SYSTEM / MASTER CANDIDATE")
        canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 11.5 * mm, "HUMAN APPROVAL REQUIRED")
        canvas.drawString(18 * mm, 10.5 * mm, "JULY 2026")
        canvas.drawRightString(A4[0] - 18 * mm, 10.5 * mm, f"{page:02d}")
    canvas.restoreState()


def add_cover(story: list[Flowable], st: dict[str, ParagraphStyle]) -> None:
    story.append(Spacer(1, 32 * mm))
    story.append(Paragraph("VENTURE GOVERNANCE SYSTEM™", st["cover_meta"]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Una arquitectura orientada a misiones para decisiones complejas", st["cover_title"]))
    story.append(Paragraph("Evidencia trazable, especialistas artificiales, modelos matemáticos, simulaciones y autoridad humana.", st["cover_sub"]))
    story.append(Spacer(1, 18 * mm))
    story.append(StatusStrip("LIMITED", dark=True))
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("MASTER CANDIDATE - HUMAN APPROVAL REQUIRED", st["cover_meta"]))
    story.append(Paragraph("Whitepaper institucional / Julio 2026 / Versión 2026.2", st["cover_meta"]))
    story.append(Spacer(1, 28 * mm))
    link = Paragraph(f'<a href="{SITE}" color="#00A8C6">venturegovernance.com</a>', st["cover_meta"])
    story.append(Table([[link, qr_drawing(SITE, 27 * mm)]], colWidths=[110 * mm, 30 * mm], style=TableStyle([("VALIGN", (0, 0), (-1, -1), "BOTTOM")]), hAlign="LEFT"))
    story.append(PageBreak())


def add_front_lists(story: list[Flowable], st: dict[str, ParagraphStyle], specs: list[PageSpec]) -> None:
    # Pages 4 and 5: table of contents. Page numbers account for cover, scope and maturity.
    for part, entries in enumerate((specs[:39], specs[39:]), start=1):
        story.append(Paragraph(f"CONTENTS / {part:02d}", st["kicker"]))
        story.append(Paragraph("Índice", st["title"]))
        rows = []
        start_page = 8 if part == 1 else 8 + 39
        for i, spec in enumerate(entries, start=start_page):
            rows.append([
                Paragraph(f'<a href="#{slug(spec.title)}" color="#102435">{esc(spec.section)} / {esc(spec.title)}</a>', st["toc"]),
                Paragraph(str(i), ParagraphStyle("tocnum", parent=st["toc"], alignment=TA_RIGHT)),
            ])
        row_height = 5.6 * mm if len(rows) > 30 else 7.2 * mm
        table = Table(rows, colWidths=[151 * mm, 10 * mm], rowHeights=row_height)
        table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LINEBELOW", (0, 0), (-1, -1), .25, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
        story.append(table)
        story.append(PageBreak())

    story.append(Paragraph("REFERENCE / FIGURES", st["kicker"]))
    story.append(Paragraph("Lista de figuras", st["title"]))
    fig_rows = []
    for i, (_, title) in enumerate(FIGURES, start=1):
        fig_rows.append([f"{i:02d}", title])
    left = fig_rows[:15]
    right = fig_rows[15:]
    two_col = []
    for i in range(15):
        two_col.append([f"{left[i][0]}  {left[i][1]}", f"{right[i][0]}  {right[i][1]}"])
    story.append(data_table([["FIGURES 01-15", "FIGURES 16-30"]] + two_col, [80.5 * mm, 80.5 * mm], st))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Todas las figuras son originales y se generan como vectores reproducibles. No contienen assets, iconografía ni composiciones de terceros.", st["small"]))
    story.append(PageBreak())

    story.append(Paragraph("REFERENCE / TABLES", st["kicker"]))
    story.append(Paragraph("Lista de tablas", st["title"]))
    table_rows = [
        ["01", "Maturity status vocabulary"], ["02", "Seven architectural planes"], ["03", "Decision Graph entities"],
        ["04", "Agent maturity states"], ["05", "Model family selection"], ["06", "Mathematical assurance controls"],
        ["07", "Human-in-Command authority matrix"], ["08", "Public Web versus Local Platform"], ["09", "Application decision patterns"],
        ["10", "Security controls and maturity"], ["11", "Claims register"], ["12", "Route and source map"],
    ]
    story.append(data_table([["TABLE", "SUBJECT"]] + table_rows, [22 * mm, 139 * mm], st))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("Reading layers", st["label"]))
    story.append(Paragraph("Cada tema combina una tesis ejecutiva, explicación simple, detalle técnico, ejemplo, limitación e implementación. Esta estructura permite lectura ejecutiva, profesional y técnica sin ocultar incertidumbre.", st["body"]))
    story.append(PageBreak())


def add_editorial_contents(story: list[Flowable], st: dict[str, ParagraphStyle], specs: list[PageSpec], figs: dict[str, tuple[int, Drawing]]) -> None:
    """A compact entry page; it replaces four sparse reference pages."""
    story.append(Paragraph("READING THE SYSTEM / 2026.2 EDITION", st["kicker"]))
    story.append(Paragraph("Una arquitectura para decisiones que deben poder explicarse.", st["title"]))
    story.append(Paragraph(
        "Este whitepaper usa briefs densos para conectar tesis, diseño, caso de uso y límite en una misma lectura. "
        "La estética combina una capa de control operacional con una jerarquía editorial sobria; todas las figuras y composiciones son originales.",
        st["lead"],
    ))
    overview = figs["system-overview"][1]
    story.append(renderPDF.GraphicsFlowable(overview))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("MAPA DEL DOCUMENTO", st["label"]))

    midpoint = math.ceil(len(specs) / 2)
    rows: list[list[Flowable]] = []
    for i in range(midpoint):
        left = specs[i]
        left_cell = Paragraph(f"<b>{esc(left.section)}</b> &nbsp; {esc(left.title)}", st["contents"])
        if i + midpoint < len(specs):
            right = specs[i + midpoint]
            right_cell: Flowable | str = Paragraph(f"<b>{esc(right.section)}</b> &nbsp; {esc(right.title)}", st["contents"])
        else:
            right_cell = ""
        rows.append([left_cell, right_cell])
    contents = Table(rows, colWidths=[81 * mm, 81 * mm], hAlign="LEFT")
    contents.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), .45, LINE),
        ("INNERGRID", (0, 0), (-1, -1), .25, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 1.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.4),
    ]))
    story.append(contents)
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "Estados de madurez: Implemented describe código verificable; Demonstrated, un flujo público reproducible; "
        "Prototype, interacción acotada; Designed y Proposed, arquitectura aún no operacional. Ningún estado implica aprobación de inversión o ejecución autónoma.",
        st["small"],
    ))
    story.append(PageBreak())


def add_spec_page(story: list[Flowable], spec: PageSpec, st: dict[str, ParagraphStyle], figs: dict[str, tuple[int, Drawing]]) -> None:
    dark = spec.dark
    suffix = "_dark" if dark else ""
    anchor = slug(spec.title)
    story.append(Paragraph(f'<a name="{anchor}"/>{esc(spec.section)} / MISSION-ORIENTED DECISION INTELLIGENCE', st[f"kicker{suffix}"]))
    story.append(Paragraph(esc(spec.title), st[f"title{suffix}"]))
    story.append(Paragraph(esc(spec.thesis), st[f"lead{suffix}"]))
    story.append(StatusStrip(spec.status, dark=dark))
    story.append(Spacer(1, 4 * mm))
    if spec.figure and spec.figure in figs:
        story.append(renderPDF.GraphicsFlowable(figs[spec.figure][1]))
        story.append(Spacer(1, 4 * mm))
    story.extend(label_block("IN PLAIN LANGUAGE", spec.plain, st, dark))
    story.extend(label_block("TECHNICAL DETAIL", spec.technical, st, dark))
    story.extend(label_block("EXAMPLE", spec.example, st, dark))
    story.extend(label_block("LIMITATION", spec.limitation, st, dark))
    if spec.title == "Matriz de autoridad":
        rows = [
            ["Activity", "System", "Human"],
            ["Search evidence", "Executes", "Defines sources and limits"],
            ["Synthesize", "Executes", "Reviews"],
            ["Form hypotheses", "Proposes", "Accepts or rejects"],
            ["Model", "Executes", "Approves assumptions"],
            ["Simulate", "Executes", "Interprets"],
            ["Recommend", "Limited", "Evaluates"],
            ["Authorize", "No", "Yes"],
        ]
        story.append(data_table(rows, [55 * mm, 39 * mm, 67 * mm], st))
    elif spec.title == "Estado de madurez":
        rows = [
            ["Status", "Meaning", "Evidence required"],
            ["Implemented", "Code exists", "Repository and tests"],
            ["Demonstrated", "Bounded reproducible flow", "Observed public run"],
            ["Prototype", "Partial interaction", "Known gaps"],
            ["Designed", "Specified architecture", "No production claim"],
            ["Validated", "Approved intended use", "Independent evidence"],
        ]
        story.append(data_table(rows, [31 * mm, 57 * mm, 73 * mm], st))
    elif spec.title == "Public Web":
        story.append(link_table([
            ("Home", SITE), ("Applications", APPS), ("Public Lab", LAB),
            ("Demo", DEMO), ("Methodology", METHOD), ("Contact", "mailto:franciscoariellopez22@gmail.com"),
        ], st))
    elif spec.title == "Bibliography - governance and architecture":
        story.append(link_table([
            ("NIST AI RMF 1.0", "https://doi.org/10.6028/NIST.AI.100-1"),
            ("NIST Generative AI Profile", "https://doi.org/10.6028/NIST.AI.600-1"),
            ("Federal Reserve SR 26-2", "https://www.federalreserve.gov/supervisionreg/srletters/SR2602.htm"),
            ("ISO 31000:2018", "https://www.iso.org/standard/65694.html"),
            ("W3C PROV-O", "https://www.w3.org/TR/prov-o/"),
            ("Architecture reference reviewed", "https://www.palantir.com/docs/foundry/architecture-center/overview"),
        ], st))
    elif spec.title == "Bibliography - mathematics and decision science":
        story.append(link_table([
            ("Rockafellar and Uryasev - CVaR", "https://doi.org/10.21314/JOR.2000.038"),
            ("Rubin - causal effects", "https://doi.org/10.1037/h0037350"),
            ("Saltelli et al. - sensitivity", "https://onlinelibrary.wiley.com/doi/book/10.1002/9780470725184"),
            ("Puterman - MDP", "https://doi.org/10.1002/9780470316887"),
        ], st))
    elif spec.title == "Technical appendix D - route and source map":
        story.append(link_table([
            ("venturegovernance.com", SITE), ("Applications", APPS), ("Lab", LAB),
            ("Demo", DEMO), ("Methodology", METHOD), ("Request access", "https://venturegovernance.com/request-access"),
        ], st))
    story.append(PageBreak())


def build_pdf() -> dict[str, object]:
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    figs = export_figures()
    st = styles()
    specs = page_specs()
    global DARK_PAGES
    # Only the cover takes the full dark field. Dark concepts appear as contained cards,
    # keeping the report readable and avoiding the former one-topic-per-page rhythm.
    DARK_PAGES = {1}

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=19 * mm,
        title="Venture Governance System - Whitepaper Institucional 2026",
        author="Venture Governance System",
        subject="Mission-Oriented Decision Intelligence Architecture",
        creator="Venture Governance System / reproducible ReportLab build",
    )
    story: list[Flowable] = []
    add_cover(story, st)
    add_editorial_contents(story, st, specs, figs)
    for spec in specs:
        drawing = figs.get(spec.figure, (0, None))[1] if spec.figure else None
        story.append(BriefCard(spec, st, drawing))
        story.append(Spacer(1, 4 * mm))
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return {"output": str(OUTPUT), "spec_pages": len(specs), "figures": len(FIGURES), "assets": str(ASSET_DIR)}


if __name__ == "__main__":
    print(build_pdf())
