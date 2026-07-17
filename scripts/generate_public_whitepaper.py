from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


NAVY = colors.HexColor("#0A223D")
NAVY_2 = colors.HexColor("#12395F")
BLUE = colors.HexColor("#176B9B")
CYAN = colors.HexColor("#17A7C6")
INK = colors.HexColor("#14253A")
SLATE = colors.HexColor("#5D7187")
MUTED = colors.HexColor("#8192A3")
LINE = colors.HexColor("#D6E0E7")
PAPER = colors.HexColor("#F3F7FA")
PALE_CYAN = colors.HexColor("#E8F7FA")
AMBER = colors.HexColor("#D9952B")
WHITE = colors.white

PAGE_WIDTH, PAGE_HEIGHT = A4
CONTENT_WIDTH = PAGE_WIDTH - 36 * mm

DOMAIN_COUNTS = [
    ("Economía", 109), ("Matemática", 108), ("Finanzas", 80), ("Salud y Medicina", 79),
    ("Derecho y Justicia", 78), ("Gestión Empresarial", 74), ("Energía", 65),
    ("Defensa y Seguridad Nacional", 59), ("Arquitectura Multiagente", 57),
    ("Agricultura y Alimentos", 54), ("Inteligencia Artificial", 52), ("Gobierno y Estado", 50),
    ("Ingeniería", 50), ("Ciencias Sociales", 48), ("Sociedad y Desarrollo Humano", 48),
    ("Ambiente y Clima", 46), ("Educación", 46), ("Mente y Comportamiento", 46),
    ("Computación y Software", 45), ("Biología", 42), ("Biotecnología", 42),
    ("Ciberseguridad", 37), ("Innovación y Capital Emprendedor", 36), ("Filosofía y Ética", 35),
    ("Física", 32), ("Industria y Comercio", 32), ("Relaciones Internacionales", 32),
    ("Gobierno, Riesgo y Cumplimiento", 30), ("Humanidades", 30),
    ("Ciencia e Investigación", 29), ("Sistemas Complejos y Prospectiva", 28),
    ("Criptografía y Blockchain", 27), ("Astronomía y Espacio", 26),
    ("Diseño y Arquitectura", 26), ("Salud Pública", 24), ("Materiales y Nanotecnología", 23),
    ("Telecomunicaciones", 20), ("Turismo y Hospitalidad", 20), ("Deportes y Rendimiento", 19),
    ("Logística y Supply Chain", 19), ("Transporte", 19), ("Cultura y Artes", 18),
    ("Emergencias y Protección Civil", 18), ("Urbanismo y Vivienda", 18),
    ("Comunicación y Medios", 17), ("Química", 16), ("Agua y Saneamiento", 15),
    ("Recursos Naturales", 13), ("Infraestructura", 12), ("Seguridad Pública", 12), ("Residuos", 9),
]

PUBLIC_AGENTS = [
    {
        "name": "Mathematics",
        "subtitle": "Robustez, incertidumbre y decisión cuantitativa",
        "purpose": "Convierte supuestos visibles en comparaciones reproducibles y prueba si una conclusión resiste cambios razonables.",
        "questions": [
            "¿Qué resultado cambia si varía un supuesto?",
            "¿Qué parte de la conclusión depende de evidencia débil?",
            "¿Qué alternativas permanecen no dominadas?",
        ],
        "inputs": ["dimensiones 0-100", "pesos públicos", "riesgos", "calidad de evidencia", "semilla"],
        "methods": ["MCDA", "Monte Carlo", "Bayes demostrativo", "tornado", "Pareto", "rank robustness"],
        "outputs": ["score comparativo", "percentiles", "drivers", "intervalos", "estabilidad", "límites"],
        "abstain": "Se abstiene de elevar confianza cuando faltan datos discriminantes o el resultado es altamente sensible.",
        "metrics": ["reproducibilidad", "sensibilidad", "disagreement", "incertidumbre", "estabilidad del top-k"],
        "limit": "No predice éxito real, no utiliza la fórmula privada y no convierte datos sintéticos en evidencia observada.",
    },
    {
        "name": "Finance",
        "subtitle": "Economía unitaria, capital y downside",
        "purpose": "Evalúa la coherencia económica de una oportunidad sintética y hace visibles las condiciones necesarias para financiar su validación.",
        "questions": [
            "¿Existe contribución positiva por cliente retenido?",
            "¿Qué combinación de precio, CAC, churn y margen rompe el caso?",
            "¿Cuánto capital temprano exige la hipótesis?",
        ],
        "inputs": ["precio", "CAC", "churn", "margen", "capital inicial", "adopción", "horizonte"],
        "methods": ["break-even", "payback", "escenarios", "stress testing", "Monte Carlo"],
        "outputs": ["contribución", "clientes de equilibrio", "payback", "bandas", "alertas", "supuestos"],
        "abstain": "Se abstiene de valorar cuando las unidades, periodos o fuentes no están definidos.",
        "metrics": ["margen", "payback", "capital requerido", "probabilidad de pérdida simulada", "evidencia económica"],
        "limit": "No es valuación, contabilidad ni asesoramiento financiero; todos los importes son escenarios demostrativos.",
    },
    {
        "name": "Strategy",
        "subtitle": "Elecciones, ventaja y secuencia de validación",
        "purpose": "Evalúa el encaje entre problema, capacidades, timing, competencia, regulación y una secuencia reversible de experimentos.",
        "questions": [
            "¿Qué elección estratégica crea una diferencia comprobable?",
            "¿Qué dependencia podría invalidar la tesis?",
            "¿Qué hito permite expandir, pivotar o abandonar?",
        ],
        "inputs": ["problema", "tesis", "alternativas", "restricciones", "timing", "evidencia"],
        "methods": ["escenarios", "trade-offs", "Pareto", "opcionalidad", "experimentos Lean"],
        "outputs": ["tesis", "opciones", "dependencias", "riesgos", "hitos", "criterios de abandono"],
        "abstain": "Se abstiene de declarar ventaja cuando sólo existe novedad narrativa o no hay alternativa comparada.",
        "metrics": ["claridad de elección", "reversibilidad", "evidencia diferencial", "tiempo a aprendizaje"],
        "limit": "No demuestra defensibilidad, no observa planes privados de competidores y no ejecuta una empresa.",
    },
    {
        "name": "Marketing",
        "subtitle": "Cliente, adopción y demanda accesible",
        "purpose": "Evalúa si existe un segmento definible, un problema verificable y una ruta de adquisición que pueda probarse con bajo costo.",
        "questions": [
            "¿Quién tiene el problema, presupuesto y autoridad?",
            "¿Qué mensaje y canal permiten observar conducta?",
            "¿La demanda accesible es distinta del TAM teórico?",
        ],
        "inputs": ["ICP", "JTBD", "mensaje", "canal", "pricing", "conversión", "retención"],
        "methods": ["segmentación", "funnel", "sensibilidad CAC-LTV", "experimentos", "prioridad de validación"],
        "outputs": ["hipótesis de ICP", "posicionamiento", "canales", "experimentos", "riesgos de adopción"],
        "abstain": "Se abstiene de llamar tracción a interés declarado o datos sintéticos.",
        "metrics": ["conversión observada", "costo por aprendizaje", "concentración de canal", "retención"],
        "limit": "No transforma demanda sintética en voluntad de pago ni garantiza adquisición eficiente.",
    },
]

MODELS = [
    ("01", "MCDA", "Priorización", "score = sum(weight_j * value_j) + ajustes visibles", "Contribuciones, penalizaciones e intervalo.", "No es una probabilidad de éxito."),
    ("02", "Monte Carlo", "Incertidumbre", "outcome_i = f(inputs perturbados, seed)", "P10, mediana, P90, pérdida y umbral.", "La distribución depende de supuestos sintéticos."),
    ("03", "Sensitivity", "Robustez", "recalcular al cambiar pesos y tolerancias", "Movimiento de score y ranking.", "La interacción manual no sustituye sensibilidad formal."),
    ("04", "Bayesian Update", "Aprendizaje", "posterior = likelihood * prior / evidence", "Prior, posterior y delta.", "Las likelihoods son públicas y demostrativas."),
    ("05", "Scenarios", "Incertidumbre", "Downside / Base / Upside", "Score, return index, riesgo y recomendación.", "Tres escenarios no cubren todos los shocks."),
    ("06", "Risk Matrix", "Riesgo", "exposure = probability * impact", "Probabilidad, impacto, incertidumbre y mitigación.", "La exposición ordinal requiere dueño humano."),
    ("07", "Pareto", "Multiobjetivo", "dominated(a) si existe b mejor o igual en todos los objetivos", "Frontera no dominada.", "La frontera cambia con los ejes elegidos."),
    ("08", "Least Squares", "Descriptivo", "y_hat = intercept + slope * x", "Pendiente, R2, RMSE y residuales.", "6-12 puntos sintéticos no son predictivos."),
    ("09", "Tornado Sensitivity", "Robustez", "impact_j = score(x_j + delta) - score(x_j - delta)", "Orden de drivers y rango local.", "One-at-a-time no captura interacciones."),
    ("10", "Break-even", "Economía", "customers = fixed_cost / retained_contribution", "Contribución, clientes, adopción y payback.", "No incluye impuestos, cohortes ni capital de trabajo."),
    ("11", "Rank Robustness", "Robustez", "frecuencia de rango bajo perturbaciones seeded", "Media, rango, #1 y top-3.", "No es calibración histórica."),
    ("12", "Validation Priority", "Aprendizaje", "0.55 * evidence_gain + 0.45 * sensitivity - cost", "Índice ordinal por agente y próxima evidencia.", "No es EVSI monetario ni autoriza gasto."),
]


def register_fonts() -> None:
    fonts = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("VG-Regular", str(fonts / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("VG-Bold", str(fonts / "arialbd.ttf")))
    pdfmetrics.registerFont(TTFont("VG-Italic", str(fonts / "ariali.ttf")))
    pdfmetrics.registerFontFamily(
        "VG",
        normal="VG-Regular",
        bold="VG-Bold",
        italic="VG-Italic",
        boldItalic="VG-Bold",
    )


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle("cover_kicker", parent=base["Normal"], fontName="VG-Bold", fontSize=9, leading=12, textColor=CYAN, spaceAfter=18, tracking=1.3),
        "cover_title": ParagraphStyle("cover_title", parent=base["Title"], fontName="VG-Bold", fontSize=36, leading=36, textColor=WHITE, spaceAfter=22),
        "cover_subtitle": ParagraphStyle("cover_subtitle", parent=base["Normal"], fontName="VG-Regular", fontSize=16, leading=21, textColor=colors.HexColor("#D6E7F3"), spaceAfter=18),
        "cover_meta": ParagraphStyle("cover_meta", parent=base["Normal"], fontName="VG-Regular", fontSize=8.5, leading=12, textColor=colors.HexColor("#A9C0D1")),
        "eyebrow": ParagraphStyle("eyebrow", parent=base["Normal"], fontName="VG-Bold", fontSize=7.2, leading=10, textColor=CYAN, spaceAfter=7, tracking=1.0),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="VG-Bold", fontSize=25, leading=29, textColor=NAVY, spaceBefore=0, spaceAfter=14),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="VG-Bold", fontSize=15, leading=19, textColor=NAVY_2, spaceBefore=15, spaceAfter=8),
        "h3": ParagraphStyle("h3", parent=base["Heading3"], fontName="VG-Bold", fontSize=10.5, leading=14, textColor=NAVY_2, spaceBefore=9, spaceAfter=5),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName="VG-Regular", fontSize=9.2, leading=13.4, textColor=INK, spaceAfter=8, allowWidows=0, allowOrphans=0),
        "body_small": ParagraphStyle("body_small", parent=base["BodyText"], fontName="VG-Regular", fontSize=7.8, leading=11, textColor=SLATE, spaceAfter=5),
        "bold_small": ParagraphStyle("bold_small", parent=base["BodyText"], fontName="VG-Bold", fontSize=7.8, leading=10, textColor=NAVY),
        "bullet": ParagraphStyle("bullet", parent=base["BodyText"], fontName="VG-Regular", fontSize=8.8, leading=12.5, textColor=INK, leftIndent=12, firstLineIndent=-7, bulletIndent=0, spaceAfter=4),
        "table": ParagraphStyle("table", parent=base["BodyText"], fontName="VG-Regular", fontSize=7.2, leading=9.5, textColor=INK),
        "table_bold": ParagraphStyle("table_bold", parent=base["BodyText"], fontName="VG-Bold", fontSize=7.2, leading=9.5, textColor=NAVY),
        "callout": ParagraphStyle("callout", parent=base["BodyText"], fontName="VG-Regular", fontSize=9, leading=13.2, textColor=NAVY, spaceAfter=0),
        "metric_value": ParagraphStyle("metric_value", parent=base["Normal"], fontName="VG-Bold", fontSize=20, leading=23, alignment=TA_CENTER, textColor=NAVY),
        "metric_label": ParagraphStyle("metric_label", parent=base["Normal"], fontName="VG-Regular", fontSize=6.8, leading=9, alignment=TA_CENTER, textColor=SLATE),
        "formula": ParagraphStyle("formula", parent=base["Code"], fontName="Courier", fontSize=7.4, leading=10, textColor=NAVY, backColor=PALE_CYAN, borderPadding=7, spaceAfter=6),
        "center": ParagraphStyle("center", parent=base["BodyText"], fontName="VG-Regular", fontSize=8.2, leading=11, alignment=TA_CENTER, textColor=SLATE),
    }


def paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def bullets(items: list[str], styles: dict[str, ParagraphStyle]) -> list[Paragraph]:
    return [Paragraph(f"<font color='#17A7C6'>■</font> {escape(item)}", styles["bullet"]) for item in items]


def chapter(story: list, number: str, title: str, intro: str, styles: dict[str, ParagraphStyle], page_break: bool = True) -> None:
    if page_break:
        story.append(PageBreak())
    story.extend([
        Paragraph(f"CAPÍTULO {escape(number)}", styles["eyebrow"]),
        Paragraph(escape(title), styles["h1"]),
        Paragraph(escape(intro), styles["body"]),
        HRFlowable(width="100%", thickness=0.6, color=LINE, spaceBefore=2, spaceAfter=13),
    ])


def callout(title: str, text: str, styles: dict[str, ParagraphStyle], color: colors.Color = CYAN) -> Table:
    content = Paragraph(f"<b>{escape(title)}</b><br/>{escape(text)}", styles["callout"])
    table = Table([[content]], colWidths=[CONTENT_WIDTH])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("LINEBEFORE", (0, 0), (0, -1), 3, color),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    return table


def metrics(values: list[tuple[str, str]], styles: dict[str, ParagraphStyle]) -> Table:
    cells = [[Paragraph(escape(value), styles["metric_value"]), Paragraph(escape(label), styles["metric_label"])] for value, label in values]
    table = Table([cells], colWidths=[CONTENT_WIDTH / len(cells)] * len(cells))
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def two_column_cards(cards: list[tuple[str, str]], styles: dict[str, ParagraphStyle]) -> Table:
    rows = []
    for index in range(0, len(cards), 2):
        row = []
        for title, body in cards[index:index + 2]:
            row.append(Paragraph(f"<b>{escape(title)}</b><br/><font color='#5D7187'>{escape(body)}</font>", styles["body_small"]))
        while len(row) < 2:
            row.append("")
        rows.append(row)
    table = Table(rows, colWidths=[CONTENT_WIDTH / 2] * 2, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, WHITE),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def flow_table(styles: dict[str, ParagraphStyle]) -> Table:
    labels = ["Input humano", "Validación", "6-12 oportunidades", "4 agentes", "12 modelos", "Ranking", "Revisión humana"]
    cells = []
    for index, label in enumerate(labels):
        cells.append(Paragraph(f"<b>{index + 1:02d}</b><br/>{escape(label)}", styles["center"]))
        if index < len(labels) - 1:
            cells.append(Paragraph("→", styles["center"]))
    widths = []
    for index in range(len(cells)):
        widths.append(58 if index % 2 == 0 else 11)
    scale = CONTENT_WIDTH / sum(widths)
    table = Table([cells], colWidths=[width * scale for width in widths])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (1, 0), (-1, -1), WHITE),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def agent_page(agent: dict[str, object], styles: dict[str, ParagraphStyle]) -> list:
    questions = agent["questions"]
    sections = [
        ("Propósito", str(agent["purpose"])),
        ("Preguntas", " • ".join(str(item) for item in questions)),
        ("Inputs", " • ".join(str(item) for item in agent["inputs"])),
        ("Métodos", " • ".join(str(item) for item in agent["methods"])),
        ("Outputs", " • ".join(str(item) for item in agent["outputs"])),
        ("Criterio de abstención", str(agent["abstain"])),
        ("Métricas visibles", " • ".join(str(item) for item in agent["metrics"])),
        ("Límite", str(agent["limit"])),
    ]
    rows = [[Paragraph(escape(label), styles["table_bold"]), Paragraph(escape(value), styles["table"])] for label, value in sections]
    table = Table(rows, colWidths=[40 * mm, CONTENT_WIDTH - 40 * mm], repeatRows=0)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, -1), PAPER),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return [
        Paragraph("AGENTE PÚBLICO", styles["eyebrow"]),
        Paragraph(escape(str(agent["name"])), styles["h1"]),
        Paragraph(escape(str(agent["subtitle"])), styles["h2"]),
        Spacer(1, 4),
        table,
        Spacer(1, 12),
        callout("Contrato común", "Assessment, metrics, evidence, assumptions, uncertainty, limitations y nextExperiments. Nunca se publica chain of thought.", styles),
    ]


def model_cards(models: list[tuple[str, str, str, str, str, str]], styles: dict[str, ParagraphStyle]) -> list:
    result = []
    for number, name, family, formula, output, limitation in models:
        block = Table([
            [Paragraph(f"<font color='#17A7C6'>{number}</font>  {escape(name)}", styles["h3"]), Paragraph(escape(family.upper()), styles["eyebrow"])],
            [Paragraph(escape(formula), styles["formula"]), Paragraph(f"<b>Salida</b><br/>{escape(output)}<br/><br/><b>Límite</b><br/>{escape(limitation)}", styles["body_small"])],
        ], colWidths=[CONTENT_WIDTH * 0.58, CONTENT_WIDTH * 0.42])
        block.setStyle(TableStyle([
            ("SPAN", (0, 0), (0, 0)),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (-1, -1), 0.5, LINE),
            ("BACKGROUND", (0, 0), (-1, 0), PAPER),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        result.extend([KeepTogether([block]), Spacer(1, 8)])
    return result


def domain_table(styles: dict[str, ParagraphStyle]) -> Table:
    midpoint = (len(DOMAIN_COUNTS) + 1) // 2
    left = DOMAIN_COUNTS[:midpoint]
    right = DOMAIN_COUNTS[midpoint:]
    rows = [[Paragraph("Dominio", styles["table_bold"]), Paragraph("Conceptos", styles["table_bold"]), Paragraph("Dominio", styles["table_bold"]), Paragraph("Conceptos", styles["table_bold"])]]
    for index in range(midpoint):
        right_item = right[index] if index < len(right) else ("", "")
        rows.append([
            Paragraph(escape(left[index][0]), styles["table"]), str(left[index][1]),
            Paragraph(escape(str(right_item[0])), styles["table"]), str(right_item[1]),
        ])
    table = Table(rows, colWidths=[CONTENT_WIDTH * 0.36, CONTENT_WIDTH * 0.10, CONTENT_WIDTH * 0.36, CONTENT_WIDTH * 0.10], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("ALIGN", (3, 1), (3, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PAPER]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def draw_cover(canvas, doc) -> None:
    canvas.saveState()
    canvas.setTitle("Venture Governance System - Whitepaper Público v2.0")
    canvas.setAuthor("Venture Governance System")
    canvas.setSubject("Arquitectura pública, cuatro agentes y modelos demostrativos")
    canvas.setCreator("Venture Governance System - ReportLab")
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
    canvas.setFillColor(NAVY_2)
    canvas.rect(0, 0, PAGE_WIDTH, 34 * mm, stroke=0, fill=1)
    for index in range(7):
        path = canvas.beginPath()
        y = 90 * mm + index * 11 * mm
        path.moveTo(-10 * mm, y)
        path.curveTo(45 * mm, y + 22 * mm, 120 * mm, y - 25 * mm, 220 * mm, y + 10 * mm)
        canvas.setStrokeColor(CYAN if index == 3 else colors.Color(0.20, 0.48, 0.66, alpha=0.30))
        canvas.setLineWidth(1.4 if index == 3 else 0.45)
        canvas.drawPath(path, stroke=1, fill=0)
    canvas.setFillColor(CYAN)
    canvas.rect(16 * mm, PAGE_HEIGHT - 18 * mm, 28 * mm, 2.2 * mm, stroke=0, fill=1)
    canvas.restoreState()


def draw_page(canvas, doc) -> None:
    canvas.saveState()
    # Paint an explicit opaque page background. Some PDF viewers render an
    # unpainted canvas against their dark theme, which would make the navy
    # body copy unreadable even though the PDF content itself is valid.
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, PAGE_HEIGHT - 16 * mm, PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 16 * mm)
    canvas.line(18 * mm, 15 * mm, PAGE_WIDTH - 18 * mm, 15 * mm)
    canvas.setFont("VG-Bold", 6.5)
    canvas.setFillColor(NAVY)
    canvas.drawString(18 * mm, PAGE_HEIGHT - 12 * mm, "VENTURE GOVERNANCE SYSTEM")
    canvas.setFont("VG-Regular", 6.5)
    canvas.setFillColor(SLATE)
    canvas.drawRightString(PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 12 * mm, "WHITEPAPER PÚBLICO V2.0")
    canvas.drawString(18 * mm, 9 * mm, "Documento conceptual | Julio 2026")
    canvas.drawRightString(PAGE_WIDTH - 18 * mm, 9 * mm, str(doc.page))
    canvas.restoreState()


def build_story(styles: dict[str, ParagraphStyle]) -> list:
    story: list = []

    story.extend([
        Spacer(1, 28 * mm),
        Paragraph("DOCUMENTO ESTRATÉGICO | VERSIÓN 2.0", styles["cover_kicker"]),
        Paragraph("Venture<br/>Governance System<super>™</super>", styles["cover_title"]),
        Paragraph("Arquitectura pública para explorar, comparar y priorizar oportunidades sintéticas bajo revisión humana", styles["cover_subtitle"]),
        Spacer(1, 12 * mm),
        Paragraph("Cuatro agentes visibles. Doce modelos demostrativos. Evidencia, incertidumbre y límites separados.", styles["cover_meta"]),
        Spacer(1, 74 * mm),
        Paragraph("Whitepaper público | Julio de 2026<br/>Documento conceptual - no constituye asesoramiento financiero ni aprobación de inversión", styles["cover_meta"]),
    ])

    chapter(story, "0", "Nota de alcance público", "Este documento reemplaza el enfoque público del whitepaper v1. Conserva la ambición conceptual, pero reduce la superficie a lo que el repositorio realmente implementa y puede demostrar sin APIs pagas, datos privados ni infraestructura enterprise.", styles)
    story.extend([
        callout("Regla principal", "El sistema amplía la capacidad humana para explorar y comparar. No invierte, no financia, no despliega empresas y no predice éxito.", styles),
        Spacer(1, 12),
        metrics([("4", "agentes públicos"), ("6-12", "oportunidades por ejecución"), ("12", "modelos visibles"), ("100%", "pesos normalizados")], styles),
        Paragraph("Naturaleza de los resultados", styles["h2"]),
        *bullets([
            "Las oportunidades, perfiles y métricas del Lab son sintéticos salvo que una etiqueta indique evidencia aportada por el usuario.",
            "La evidencia aportada por el usuario se conserva como no verificada; el Lab no navega, no descarga y no confirma fuentes remotas.",
            "Las fórmulas públicas son demostrativas y no representan la puntuación, calibración u orquestación privadas.",
            "Toda recomendación es una sugerencia de validación o revisión, nunca una autorización de capital o ejecución.",
        ], styles),
        Paragraph("Fuentes auditadas para esta versión", styles["h2"]),
        two_column_cards([
            ("Whitepaper v1", "57 páginas. Contiene 20 roles conceptuales y capacidades que exceden el alcance público actual."),
            ("Biblioteca inicial", "Índice de 1.970 conceptos, 51 dominios y 123 familias. Todos permanecen pendientes."),
            ("Repositorio", "Next.js App Router, React, TypeScript estricto, Vinext/Vite y almacenamiento local."),
            ("Lab público", "Cuatro agentes, generación seeded, ranking, exportación, persistencia y revisión humana."),
        ], styles),
    ])

    chapter(story, "1", "Resumen ejecutivo", "Venture Governance System propone una interfaz de decisión trazable: parte de una tesis humana, genera un conjunto acotado de oportunidades sintéticas, las somete a cuatro perspectivas públicas y permite inspeccionar cómo cambian al variar supuestos.", styles)
    story.extend([
        Paragraph("La oportunidad de diseño", styles["h2"]),
        Paragraph("La exploración de venture combina señales incompletas, hipótesis no observadas, incertidumbre profunda y trade-offs difíciles de reducir a un único score. El objetivo público no es automatizar el juicio, sino hacer visibles las variables, evidencias, desacuerdos y condiciones que deben revisarse antes de actuar.", styles["body"]),
        Paragraph("North star", styles["h2"]),
        callout("Reducir incertidumbre relevante", "Maximizar aprendizaje útil por unidad de tiempo, costo y riesgo, preservando responsabilidad y decisión humanas.", styles),
        Spacer(1, 10),
        flow_table(styles),
        Paragraph("Resultado esperado", styles["h2"]),
        *bullets([
            "Una lista reproducible de 6-12 oportunidades sintéticas, no una cartera recomendada.",
            "Cuatro evaluaciones estructuradas con evidencia, supuestos, incertidumbre, límites y crítica cruzada.",
            "Un dashboard que muestra score, evidencia, riesgo, incertidumbre, desacuerdo, escenarios, robustez y economía unitaria.",
            "Un estado de revisión humana que puede guardar, comparar, pedir evidencia, marcar incertidumbre o rechazar.",
        ], styles),
    ])

    chapter(story, "2", "Auditoría de la biblioteca inicial", "La biblioteca adjunta es una infraestructura de control y una taxonomía de investigación. No contiene una red ejecutable de 1.970 agentes ni fichas técnicas validadas.", styles)
    story.extend([
        metrics([("1.970", "conceptos catalogados"), ("51", "dominios"), ("123", "familias"), ("0", "perfiles PDF validados")], styles),
        Paragraph("Qué existe realmente", styles["h2"]),
        two_column_cards([
            ("Índice maestro", "Seis hojas, 1.970 IDs únicos y continuos, rutas previstas y 197 lotes de diez."),
            ("Controles", "progreso.csv, errores.csv, inventario_pdfs.csv y README.pdf."),
            ("Estado", "Todos los registros están Pendiente; fuentes Pendiente; revisión No; páginas y hashes vacíos."),
            ("Contenido", "Las descripciones usan siete plantillas genéricas. Son rótulos taxonómicos, no especificaciones operativas."),
        ], styles),
        Paragraph("Hallazgos que deben permanecer visibles", styles["h2"]),
        *bullets([
            "La planilla fuente citada por el README no está incluida, por lo que no puede verificarse su hash ni la preservación de metadatos.",
            "El README dice 'agentes verificados', pero la evidencia disponible demuestra 1.970 conceptos pendientes y cero perfiles generados.",
            "El gráfico de dominios del Excel incluye 50 de 51 dominios y omite Residuos; el total tabular sí alcanza 1.970.",
            "El PDF de control es legible, pero no está etiquetado para accesibilidad.",
        ], styles),
        callout("Interpretación responsable", "La taxonomía sirve para investigación futura y selección de especialistas. No debe presentarse como capacidad ya implementada.", styles, AMBER),
    ])

    chapter(story, "3", "Frontera pública, privada y futura", "La separación protege propiedad intelectual, reduce afirmaciones exageradas y hace que cada capacidad pública sea verificable.", styles)
    boundary_rows = [
        ("Agentes", "Mathematics, Finance, Strategy y Marketing", "Red extendida, prompts, pesos, entrenamiento y topología privada"),
        ("Datos", "Sintéticos, seed, texto validado y evidencia aportada", "Datasets privados, históricos, conectores y material confidencial"),
        ("Modelos", "Doce fórmulas visibles y ficticias", "Scoring propietario, calibración, aprendizaje y modelos locales"),
        ("Infraestructura", "Navegador, exportación y persistencia local", "Auth, billing, multitenancy, RBAC y SaaS enterprise"),
        ("Acciones", "Comparar, guardar, solicitar evidencia y registrar revisión", "Inversión, financiación, despliegue, transacción o ejecución autónoma"),
    ]
    boundary_table = Table([[Paragraph("Área", styles["table_bold"]), Paragraph("Incluido públicamente", styles["table_bold"]), Paragraph("Fuera del repositorio", styles["table_bold"])]] + [
        [Paragraph(escape(area), styles["table_bold"]), Paragraph(escape(public), styles["table"]), Paragraph(escape(private), styles["table"])]
        for area, public, private in boundary_rows
    ], colWidths=[28 * mm, 70 * mm, CONTENT_WIDTH - 98 * mm], repeatRows=1)
    boundary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PAPER]),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([boundary_table, Spacer(1, 12), callout("Límite de IP", "El documento describe contratos públicos y resultados observables. No publica chain of thought, prompts privados, red completa, calibración ni lógica propietaria.", styles)])

    chapter(story, "4", "Flujo público reproducible", "La ejecución completa usa funciones deterministas, límites finitos y una semilla estable. El mismo input validado, versión de modelo, pesos y seed producen el mismo conjunto reproducible.", styles)
    story.extend([
        flow_table(styles), Spacer(1, 12),
        two_column_cards([
            ("1. Intake", "Sanitiza texto, limita longitudes, acota números y trata el input como datos."),
            ("2. Generación", "Crea 6-12 alternativas sintéticas desde blueprints públicos y una semilla."),
            ("3. Evaluación", "Los cuatro agentes devuelven contratos estructurados, no razonamiento privado."),
            ("4. Modelos", "MCDA, distribución, escenarios, riesgo, trade-offs, economía y robustez."),
            ("5. Ranking", "Normaliza pesos al 100% y aplica gates de evidencia, riesgo e incertidumbre."),
            ("6. Revisión", "La persona compara, solicita evidencia y registra un estado sin activar ejecución."),
        ], styles),
        Paragraph("Identidad de ejecución", styles["h2"]),
        Paragraph("El identificador incluye la versión pública del modelo, el input validado completo y los pesos normalizados. Esto evita que dos análisis diferentes compartan ID y se sobrescriban en el historial local.", styles["body"]),
        Paragraph("Degradación segura", styles["h2"]),
        *bullets([
            "Configuración inválida: detener y mostrar errores; no adivinar datos faltantes.",
            "Evidencia débil: limitar la categoría y elevar una solicitud de validación.",
            "Muestra insuficiente: mostrar estado no informativo, no NaN ni una precisión ficticia.",
            "Persistencia antigua o malformada: validar, normalizar o descartar de forma segura.",
        ], styles),
    ])

    chapter(story, "5", "Los cuatro agentes públicos", "Cada agente es una lente agregada con contrato, límites y criterios de abstención. La orquestación, el ranking, la validación y el almacenamiento son módulos determinísticos, no agentes adicionales.", styles)
    overview = [(str(agent["name"]), str(agent["subtitle"])) for agent in PUBLIC_AGENTS]
    story.extend([two_column_cards(overview, styles), Spacer(1, 10), callout("Regla de exposición", "Se publican outputs, evidencia, supuestos, incertidumbre, límites y crítica. No se publican prompts, razonamiento paso a paso ni topología privada.", styles)])
    for agent in PUBLIC_AGENTS:
        story.append(PageBreak())
        story.extend(agent_page(agent, styles))

    chapter(story, "6", "Contrato de evidencia y resultados", "Toda afirmación material debe declarar qué tipo de información la sostiene. La etiqueta no cambia por el tono del texto ni por la confianza subjetiva del usuario.", styles)
    evidence_cards = [
        ("Evidencia observada", "Resultado medido o documento aportado. En el Lab permanece 'no verificado' salvo proceso externo autorizado."),
        ("Dato sintético", "Valor creado por reglas públicas y seed. Nunca aumenta por sí solo la evidencia observada."),
        ("Supuesto", "Creencia editable usada para calcular un escenario."),
        ("Estimación", "Valor aproximado derivado de supuestos identificados."),
        ("Inferencia", "Interpretación que conecta evidencia y supuesto; no crea evidencia nueva."),
        ("Simulación", "Resultado de variar inputs dentro de un modelo demostrativo."),
        ("Decisión humana", "Estado de revisión. Está fuera de la taxonomía de evidencia y no ejecuta una acción."),
        ("Limitación", "Condición que reduce validez, alcance o confianza y que debe acompañar el output."),
    ]
    story.extend([
        two_column_cards(evidence_cards, styles),
        Paragraph("Contrato mínimo de cada agente", styles["h2"]),
        Paragraph("assessment · metrics · evidence · assumptions · uncertainty · limitations · nextExperiments", styles["formula"]),
        *bullets([
            "Los campos de texto se limitan y sanitizan; nunca se ejecutan como instrucciones.",
            "Agregar la misma evidencia dos veces no puede aumentar indefinidamente la calidad.",
            "Una evidencia aportada pero no verificada sólo produce un ajuste acotado y mantiene su etiqueta.",
            "La confianza se recalcula junto con incertidumbre y no se presenta como probabilidad de éxito empresarial.",
        ], styles),
    ])

    chapter(story, "7", "Biblioteca matemática demostrativa", "El catálogo público está versionado. Cada modelo declara pregunta de decisión, inputs, límites, semilla, outputs y limitaciones. Los cuatro modelos nuevos fortalecen el dashboard sin modificar la red de agentes.", styles)
    story.extend([
        metrics([("12", "modelos"), ("v2.0.0", "versión del catálogo"), ("0-100", "rangos públicos"), ("seeded", "simulación reproducible")], styles),
        Paragraph("Contrato escalable del registro", styles["h2"]),
        Paragraph("id · version · family · decisionQuestion · inputSchema · bounds · seedPolicy · compute · outputs · limitations", styles["formula"]),
        callout("Modelos diagnósticos", "Tornado, break-even, rank robustness, validation priority y least squares ayudan a interpretar. No cambian automáticamente el ranking base.", styles),
    ])
    for page_index in range(0, len(MODELS), 3):
        story.append(PageBreak())
        story.extend([
            Paragraph(f"MODELOS {page_index + 1:02d}-{min(page_index + 3, len(MODELS)):02d}", styles["eyebrow"]),
            Paragraph("Mecánica visible y límite explícito", styles["h1"]),
            *model_cards(MODELS[page_index:page_index + 3], styles),
        ])

    chapter(story, "8", "Ranking, gates y clasificación responsable", "Un score alto no puede compensar evidencia insuficiente, incertidumbre extrema o riesgo material. La categoría final se calcula después de los gates.", styles)
    story.extend([
        Paragraph("Secuencia", styles["h2"]),
        Paragraph("1) normalizar pesos -> 2) calcular contribuciones -> 3) aplicar ajustes visibles -> 4) revisar evidencia, riesgo, incertidumbre y desacuerdo -> 5) ordenar -> 6) revisión humana", styles["formula"]),
        two_column_cards([
            ("Gate de evidencia", "Evidencia menor a 28: Insufficient Evidence, sin importar score bruto."),
            ("Gate de incertidumbre", "Incertidumbre mayor a 66 o desacuerdo mayor a 22: Uncertain."),
            ("Gate de riesgo", "Riesgo alto puede elevar Priority for Human Review y exige mitigación."),
            ("Gate humano", "Ninguna categoría aprueba inversión, financiación, despliegue ni transacción."),
        ], styles),
        Paragraph("Corrección matemática v2", styles["h2"]),
        Paragraph("La penalización de incertidumbre usa un porcentaje normalizado: uncertainty * ((100 - tolerance) / 100) * 0.08. La versión anterior omitía /100 y saturaba casi todos los scores en cero.", styles["body"]),
        callout("Explicación del movimiento", "La interfaz identifica el parámetro que realmente cambió, en lugar de atribuir todo movimiento al agente con mayor peso.", styles),
    ])

    chapter(story, "9", "Cómo leer el dashboard", "La lectura correcta empieza por el conjunto de señales. Ningún gráfico, score o probabilidad simulada debe interpretarse de forma aislada.", styles)
    story.extend([
        two_column_cards([
            ("Score", "Prioridad relativa bajo pesos actuales. No es probabilidad de éxito."),
            ("Evidencia", "Soporte declarado. Debe distinguir observado, aportado y sintético."),
            ("Riesgo", "Probabilidad, impacto, incertidumbre y mitigación, leídos juntos."),
            ("Incertidumbre", "Fragilidad de la conclusión frente a inputs y evidencia faltante."),
            ("Disagreement", "Diferencia entre los cuatro agentes. El conflicto es información."),
            ("Rank robustness", "Frecuencia de permanencia en top-k bajo pesos perturbados."),
            ("Break-even", "Umbral económico bajo unidades y periodo explícitos."),
            ("Validation priority", "Orden de experimentos por aprendizaje esperado, sensibilidad y costo."),
        ], styles),
        Paragraph("Secuencia recomendada", styles["h2"]),
        *bullets([
            "1. Comparar score con evidencia, riesgo e incertidumbre.",
            "2. Abrir los cuatro agentes y localizar desacuerdo o abstención.",
            "3. Usar Monte Carlo y escenarios para observar asimetría.",
            "4. Usar tornado y rank robustness para medir fragilidad.",
            "5. Revisar Pareto para conservar alternativas no dominadas.",
            "6. Elegir el próximo experimento mediante validation priority y criterio humano.",
        ], styles),
        callout("Accesibilidad", "Cada gráfico tiene texto equivalente, etiquetas, valores y una explicación de lectura. El significado nunca depende sólo del color.", styles),
    ])

    chapter(story, "10", "Arquitectura de software escalable", "El Lab mantiene Next.js App Router, React, TypeScript estricto y Vinext/Vite. Los modelos son funciones puras y el dashboard consume un catálogo versionado.", styles)
    architecture_rows = [
        ("Presentación", "Rutas /lab, componentes accesibles, controles y tablas textuales"),
        ("Aplicación", "intake, ejecución, ranking, revisión, exportación y persistencia"),
        ("Dominio", "LabInput, Opportunity, AgentResult, LabWeights y contratos de modelo"),
        ("Modelos", "funciones puras, bounds, semillas, outputs tipados y catálogo v2.0.0"),
        ("Infraestructura", "localStorage validado, descarga local, audio centralizado y opcional"),
    ]
    arch_table = Table([[Paragraph(escape(layer), styles["table_bold"]), Paragraph(escape(copy), styles["table"]) ] for layer, copy in architecture_rows], colWidths=[38 * mm, CONTENT_WIDTH - 38 * mm])
    arch_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (0, -1), NAVY),
        ("TEXTCOLOR", (0, 0), (0, -1), WHITE), ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("ROWBACKGROUNDS", (1, 0), (-1, -1), [WHITE, PAPER]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([
        arch_table,
        Paragraph("Principios de extensión", styles["h2"]),
        *bullets([
            "Agregar un modelo mediante un contrato versionado; no sumar un agente público por cada cálculo.",
            "Mantener estado nuevo como derivado hasta definir una migración explícita de persistencia.",
            "Aislar cálculos costosos y diferir controles interactivos para evitar trabajo en cada píxel del slider.",
            "Probar determinismo, bounds, invariantes, casos no informativos y paridad entre catálogo, UI y metodología.",
        ], styles),
        callout("Compatibilidad", "La arquitectura pública conserva el build Cloudflare Worker-compatible y evita dependencias runtime externas innecesarias.", styles),
    ])

    chapter(story, "11", "Seguridad, privacidad y accesibilidad", "La seguridad pública parte de una regla simple: el texto del usuario es datos. El Lab no ejecuta scripts, comandos, URLs ni código producido por agentes.", styles)
    story.extend([
        two_column_cards([
            ("Validación", "Longitudes, conteos, números finitos y enums acotados."),
            ("Red", "Sin fetch arbitrario, SSRF, CORS abierto, uploads ni conectores."),
            ("Persistencia", "Estado local validado y limitado; datos malformados se descartan."),
            ("LLM futuro", "Sólo servidor, timeouts, fallback seguro, prompts mínimos y sin logs secretos."),
            ("Audio", "Sin autoplay, preferencia guardada y alternativa visual completa."),
            ("Movimiento", "Respeta prefers-reduced-motion y evita animaciones imprescindibles."),
            ("Teclado", "Controles semánticos, foco visible, regiones desplazables enfocables y ARIA live."),
            ("Gráficos", "Resumen textual, labels numéricos y estados vacíos explícitos."),
        ], styles),
        Paragraph("Amenazas excluidas por diseño", styles["h2"]),
        *bullets([
            "Ejecución de instrucciones ocultas en la idea o evidencia.",
            "Lectura de secretos, prompts, chain of thought o rutas privadas.",
            "Navegación de URLs y descarga de contenido no autorizado.",
            "Aprobación de inversión o acción operativa derivada de un score.",
        ], styles),
    ])

    chapter(story, "12", "Calidad, pruebas y definición de done", "La corrección de un modelo no termina cuando compila. Debe mostrar invariantes matemáticos, comportamiento accesible y rutas renderizadas.", styles)
    story.extend([
        two_column_cards([
            ("Unitarias", "Semilla, bounds, monotonicidad, fórmulas manuales, casos vacíos y duplicados."),
            ("Integración", "Rutas, cuatro agentes, catálogo sincronizado, límites públicos y ausencia de autoplay."),
            ("Type checking", "Contratos estrictos para inputs, resultados, modelos, comparaciones y persistencia."),
            ("Lint", "Convenciones, hooks, accesibilidad y riesgos de código no usado."),
            ("Build", "Salida de producción compatible con el entorno de hosting."),
            ("PDF", "Render a PNG, inspección visual, metadatos, numeración y extracción de texto."),
        ], styles),
        Paragraph("Invariantes principales", styles["h2"]),
        *bullets([
            "Pesos de agentes y dimensiones suman 100% antes de calcular y al persistir.",
            "Misma versión + input + pesos + seed produce el mismo resultado reproducible.",
            "Los scores, probabilidades e índices quedan dentro de rangos finitos declarados.",
            "Evidencia débil impide automáticamente una categoría de alta promesa.",
            "Un modelo no informativo devuelve motivo explícito y nunca NaN o infinito.",
        ], styles),
    ])

    chapter(story, "13", "Roadmap público", "El crecimiento del Lab debe aumentar profundidad explicativa sin ampliar agentes visibles ni presentar capacidades futuras como implementadas.", styles)
    roadmap_rows = [
        ("Ahora", "v2.0", "12 modelos, catálogo versionado, IDs completos, persistencia validada y whitepaper público."),
        ("Siguiente", "v2.1", "Superficie break-even CAC x churn, minimax regret y diversidad del conjunto."),
        ("Después", "v2.2", "Exportación de model cards, cobertura de evidencia y más tests de accesibilidad."),
        ("Condicional", "Futuro", "Proveedor LLM server-only con timeout, fallback y prompts públicos mínimos."),
    ]
    roadmap = Table([[Paragraph(escape(a), styles["table_bold"]), Paragraph(escape(b), styles["table_bold"]), Paragraph(escape(c), styles["table"]) ] for a, b, c in roadmap_rows], colWidths=[25 * mm, 20 * mm, CONTENT_WIDTH - 45 * mm])
    roadmap.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, PAPER]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.extend([
        roadmap, Spacer(1, 12),
        callout("Criterio de avance", "Una función futura entra al Lab sólo si tiene contrato, inputs acotados, fallback, explicación, pruebas y una limitación visible.", styles),
    ])

    chapter(story, "A", "Apéndice - Taxonomía del inventario", "Los 51 dominios suman 1.970 conceptos catalogados. Esta tabla describe cobertura temática, no una red activa ni capacidades verificadas.", styles)
    story.extend([
        domain_table(styles),
        Spacer(1, 8),
        Paragraph("Fuente: indice_maestro.xlsx de la biblioteca adjunta. Estado auditado: todos Pendiente; 0 PDFs; 0 validaciones.", styles["body_small"]),
    ])

    chapter(story, "B", "Apéndice - Definiciones y fórmulas", "Resumen operativo para implementación, QA y revisión metodológica.", styles)
    glossary = [
        ("Comparative score", "Prioridad relativa 0-100 bajo los pesos públicos actuales."),
        ("Confidence", "Soporte condicional de la evaluación, no probabilidad de éxito."),
        ("Uncertainty", "Fragilidad de la conclusión ante datos y supuestos faltantes."),
        ("Disagreement", "Dispersión entre scores de los cuatro agentes."),
        ("Seed", "Entero que hace reproducibles los sorteos públicos."),
        ("Gate", "Regla que restringe una categoría antes de ordenar."),
        ("Top-k retention", "Frecuencia con la que una oportunidad conserva una posición bajo perturbaciones."),
        ("Validation priority", "Índice ordinal de aprendizaje, sensibilidad y costo."),
    ]
    story.extend([
        two_column_cards(glossary, styles),
        Paragraph("Fórmulas visibles clave", styles["h2"]),
        Paragraph("normalized_weight_j = max(0, w_j) / sum(max(0, w)) * 100", styles["formula"]),
        Paragraph("uncertainty_penalty = uncertainty * ((100 - tolerance) / 100) * 0.08", styles["formula"]),
        Paragraph("retained_contribution = price * (1 - churn) * margin - CAC", styles["formula"]),
        Paragraph("break_even_customers = fixed_cost / retained_contribution", styles["formula"]),
        Paragraph("validation_priority = clamp(0.55 * evidence_gain + 0.45 * decision_sensitivity - 0.25 * cost_index)", styles["formula"]),
    ])

    chapter(story, "C", "Referencias y trazabilidad", "Esta versión se apoya principalmente en los artefactos entregados y en literatura metodológica ya citada por el whitepaper v1.", styles)
    references = [
        "Venture_Intelligence_Whitepaper.pdf. Documento estratégico v1.0, 57 páginas, julio de 2026. Artefacto proporcionado por el usuario.",
        "Biblioteca_Agentes_inicial.zip. indice_maestro.xlsx, README.pdf y controles CSV. Artefacto proporcionado por el usuario.",
        "Metropolis, N. y Ulam, S. (1949). The Monte Carlo Method.",
        "Saaty, T. L. (1980). The Analytic Hierarchy Process. Referencia general para MCDA.",
        "Saltelli, A. et al. (2008). Global Sensitivity Analysis: The Primer.",
        "Lahdelma, R., Hokkanen, J. y Salminen, P. (1998). SMAA - Stochastic Multiobjective Acceptability Analysis.",
        "Raiffa, H. y Schlaifer, R. (1961). Applied Statistical Decision Theory. Referencia general para valor de información.",
        "NIST (2023). Artificial Intelligence Risk Management Framework 1.0.",
        "W3C (2023). Web Content Accessibility Guidelines 2.2.",
    ]
    story.extend([
        *bullets(references, styles),
        Paragraph("Trazabilidad de versión", styles["h2"]),
        two_column_cards([
            ("v1.0", "Arquitectura conceptual amplia, 20 roles y capacidades privadas/futuras mezcladas con la superficie pública."),
            ("v2.0", "Cuatro agentes públicos, 12 modelos, taxonomía auditada, gates, contratos y separación pública/privada."),
        ], styles),
        Spacer(1, 10),
        callout("Conclusión", "Venture Governance System no reemplaza el juicio de venture. Hace que supuestos, evidencia, incertidumbre, trade-offs y próximos experimentos sean más visibles y reproducibles.", styles),
    ])
    return story


def generate(output_path: Path, public_copy: Path | None) -> dict[str, object]:
    register_fonts()
    styles = make_styles()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=20 * mm,
        title="Venture Governance System - Whitepaper Público v2.0",
        author="Venture Governance System",
        subject="Arquitectura pública, cuatro agentes y modelos demostrativos",
    )
    doc.build(build_story(styles), onFirstPage=draw_cover, onLaterPages=draw_page)
    if public_copy:
        public_copy.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(output_path, public_copy)
    reader = PdfReader(str(output_path))
    return {
        "output": str(output_path.resolve()),
        "public_copy": str(public_copy.resolve()) if public_copy else None,
        "pages": len(reader.pages),
        "bytes": output_path.stat().st_size,
        "domain_total": sum(count for _, count in DOMAIN_COUNTS),
        "domain_count": len(DOMAIN_COUNTS),
        "public_agents": len(PUBLIC_AGENTS),
        "public_models": len(MODELS),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--public-copy", type=Path)
    args = parser.parse_args()
    result = generate(args.output, args.public_copy)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
