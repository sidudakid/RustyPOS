from __future__ import annotations

from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from xml.sax.saxutils import escape
import markdown as md

ROOT = Path(__file__).resolve().parent
MD_PATH = ROOT / 'openclaw-cafe-brochure.md'
HTML_PATH = ROOT / 'openclaw-cafe-brochure.html'
PDF_PATH = ROOT / 'openclaw-cafe-brochure.pdf'


def parse_markdown(path: Path):
    lines = path.read_text(encoding='utf-8').splitlines()
    blocks = []
    current_bullets = []
    current_numbered = []

    def flush_lists():
        nonlocal current_bullets, current_numbered
        if current_bullets:
            blocks.append(('bullets', current_bullets))
            current_bullets = []
        if current_numbered:
            blocks.append(('numbered', current_numbered))
            current_numbered = []

    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped:
            flush_lists()
            continue
        if stripped.startswith('# '):
            flush_lists()
            blocks.append(('h1', stripped[2:].strip()))
        elif stripped.startswith('## '):
            flush_lists()
            blocks.append(('h2', stripped[3:].strip()))
        elif stripped.startswith('### '):
            flush_lists()
            blocks.append(('h3', stripped[4:].strip()))
        elif stripped.startswith('- '):
            current_bullets.append(stripped[2:].strip())
        elif stripped[:2].isdigit() and stripped[2:4] == '. ':
            current_numbered.append(stripped[4:].strip())
        elif len(stripped) > 2 and stripped[0].isdigit() and stripped[1:].startswith('. '):
            current_numbered.append(stripped[3:].strip())
        else:
            flush_lists()
            blocks.append(('p', stripped))
    flush_lists()
    return blocks


def build_html(blocks):
    parts = [
        '<!doctype html>',
        '<html><head><meta charset="utf-8"><title>OpenClaw Café brochure</title>',
        '<style>',
        'body{font-family:Inter,Arial,sans-serif;max-width:980px;margin:0 auto;padding:48px;background:#f6f7fb;color:#122033;line-height:1.55}',
        '.hero{background:linear-gradient(135deg,#122033,#3b82f6);color:white;padding:36px;border-radius:22px;margin-bottom:28px}',
        'h1{font-size:34px;margin:0 0 10px} h2{font-size:24px;margin:28px 0 10px;color:#122033} h3{font-size:18px;margin:18px 0 8px;color:#1d4ed8}',
        'p{margin:10px 0} ul,ol{margin:8px 0 16px 22px}',
        '.card{background:white;border-radius:18px;padding:24px;margin:18px 0;box-shadow:0 10px 30px rgba(18,32,51,.08)}',
        '</style></head><body>'
    ]
    first_h1 = True
    in_card = False
    list_open = None
    for kind, value in blocks:
        if first_h1 and kind == 'h1':
            parts.append(f'<section class="hero"><h1>{escape(value)}</h1>')
            in_card = True
            first_h1 = False
            continue
        if in_card and kind == 'h2':
            parts.append('</section>')
            in_card = False
        if kind == 'h2':
            if list_open:
                parts.append(f'</{list_open}>')
                list_open = None
            parts.append(f'<section class="card"><h2>{escape(value)}</h2>')
            in_card = True
        elif kind == 'h3':
            if list_open:
                parts.append(f'</{list_open}>')
                list_open = None
            parts.append(f'<h3>{escape(value)}</h3>')
        elif kind == 'p':
            if list_open:
                parts.append(f'</{list_open}>')
                list_open = None
            parts.append(f'<p>{escape(value)}</p>')
        elif kind == 'bullets':
            if list_open:
                parts.append(f'</{list_open}>')
            parts.append('<ul>')
            for item in value:
                parts.append(f'<li>{escape(item)}</li>')
            parts.append('</ul>')
            list_open = None
        elif kind == 'numbered':
            if list_open:
                parts.append(f'</{list_open}>')
            parts.append('<ol>')
            for item in value:
                parts.append(f'<li>{escape(item)}</li>')
            parts.append('</ol>')
            list_open = None
    if in_card:
        parts.append('</section>')
    parts.append('</body></html>')
    return '\n'.join(parts)


def build_pdf(blocks, output_path: Path):
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title='OpenClaw Café brochure',
        author='OpenClaw subagent',
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        'HeroTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=25,
        leading=29, textColor=colors.HexColor('#ffffff'), alignment=TA_LEFT, spaceAfter=8,
    )
    subtitle = ParagraphStyle(
        'HeroSubtitle', parent=styles['BodyText'], fontName='Helvetica', fontSize=10.5,
        leading=14, textColor=colors.HexColor('#e5eefc'), spaceAfter=8,
    )
    section = ParagraphStyle(
        'Section', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=16,
        leading=20, textColor=colors.HexColor('#122033'), spaceBefore=8, spaceAfter=8,
    )
    sub = ParagraphStyle(
        'Sub', parent=styles['Heading3'], fontName='Helvetica-Bold', fontSize=11.5,
        leading=14, textColor=colors.HexColor('#2457d6'), spaceBefore=8, spaceAfter=4,
    )
    body = ParagraphStyle(
        'Body', parent=styles['BodyText'], fontName='Helvetica', fontSize=9.4,
        leading=13.2, textColor=colors.HexColor('#223047'), spaceAfter=6,
    )
    bullet = ParagraphStyle(
        'Bullet', parent=body, leftIndent=13, bulletIndent=0, spaceAfter=3,
    )
    mini = ParagraphStyle(
        'Mini', parent=body, fontSize=8.5, leading=11, textColor=colors.HexColor('#4a5670'),
    )
    callout = ParagraphStyle(
        'Callout', parent=body, alignment=TA_CENTER, textColor=colors.HexColor('#ffffff'),
        fontName='Helvetica-Bold', fontSize=9.5, leading=12,
    )

    story = []

    hero_title = next((v for k, v in blocks if k == 'h1'), 'OpenClaw Café')
    hero_subtitle = next((v for k, v in blocks if k == 'h2'), 'Digital café service that keeps operations aligned')
    hero_table = Table([
        [Paragraph(escape(hero_title), title)],
        [Paragraph(escape(hero_subtitle), subtitle)],
        [Paragraph('QR ordering • Live kitchen board • Staff settlement • Admin setup • Inventory • Analytics', callout)],
    ], colWidths=[7.0 * inch])
    hero_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#122033')),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#2457d6')),
        ('BOX', (0, 0), (-1, -1), 0, colors.white),
        ('LEFTPADDING', (0, 0), (-1, -1), 18),
        ('RIGHTPADDING', (0, 0), (-1, -1), 18),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
    ]))
    story.extend([hero_table, Spacer(1, 12)])

    kpi = Table([
        [
            Paragraph('<b>Guest experience</b><br/>Table QR ordering and live order tracking', mini),
            Paragraph('<b>Operations</b><br/>Separate workspaces for kitchen, staff, and admin', mini),
            Paragraph('<b>Owner controls</b><br/>Menus, stock, tables, branding, and reporting', mini),
        ]
    ], colWidths=[2.25 * inch, 2.25 * inch, 2.25 * inch])
    kpi.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#eef4ff')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#c9d8ff')),
        ('INNERGRID', (0, 0), (-1, -1), 0.75, colors.HexColor('#c9d8ff')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.extend([kpi, Spacer(1, 12)])

    first_h1_skipped = False
    first_h2_skipped = False
    for kind, value in blocks:
        if kind == 'h1' and not first_h1_skipped:
            first_h1_skipped = True
            continue
        if kind == 'h2' and not first_h2_skipped:
            first_h2_skipped = True
            continue
        if kind == 'h2':
            story.extend([Spacer(1, 6), Paragraph(escape(value), section)])
        elif kind == 'h3':
            story.append(Paragraph(escape(value), sub))
        elif kind == 'p':
            story.append(Paragraph(escape(value), body))
        elif kind == 'bullets':
            for item in value:
                story.append(Paragraph(escape(item), bullet, bulletText='•'))
            story.append(Spacer(1, 4))
        elif kind == 'numbered':
            for idx, item in enumerate(value, start=1):
                story.append(Paragraph(escape(item), bullet, bulletText=f'{idx}.'))
            story.append(Spacer(1, 4))

    def add_page(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor('#d8e2f2'))
        canvas.setLineWidth(0.8)
        canvas.line(doc.leftMargin, doc.height + doc.topMargin + 8, doc.pagesize[0] - doc.rightMargin, doc.height + doc.topMargin + 8)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#5b677d'))
        canvas.drawString(doc.leftMargin, 22, 'OpenClaw Café — marketing brochure')
        canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 22, f'Page {doc.page}')
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page, onLaterPages=add_page)


def main():
    blocks = parse_markdown(MD_PATH)
    HTML_PATH.write_text(build_html(blocks), encoding='utf-8')
    build_pdf(blocks, PDF_PATH)
    print(PDF_PATH)


if __name__ == '__main__':
    main()
