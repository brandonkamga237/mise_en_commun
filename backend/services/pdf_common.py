"""Thème PDF partagé + conversion HTML (TipTap) → flowables reportlab.

Palette alignée sur la charte de l'app (indigo + ambre), volontairement
sobre pour un rendu adulte et lisible à l'impression.
"""
from html.parser import HTMLParser
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, Spacer

# ── Palette (charte d'origine : bleu marine + or + beige) ───────
# Noms historiques conservés ; les valeurs suivent index.css.
INDIGO       = "#1E2D4A"  # bandeau, titres (bleu marine)
INDIGO_LIGHT = "#2B4C7E"  # sous-titres, accents (bleu moyen)
AMBER        = "#C9952A"  # filet d'accent (or)
INK          = "#111827"  # texte
MUTED        = "#6B7280"  # texte secondaire
LINE         = "#E8E2D9"  # filets
TINT         = "#F7F3EE"  # fond subtil (lignes alternées, citations)
WHITE        = "#FFFFFF"


def make_styles() -> dict:
    base = getSampleStyleSheet()["Normal"]

    def s(name, **kw):
        return ParagraphStyle(name, parent=base, **kw)

    return {
        "h1": s("h1", fontName="Helvetica-Bold", fontSize=15, textColor=colors.HexColor(INDIGO),
                spaceBefore=10, spaceAfter=4, leading=20),
        "h2": s("h2", fontName="Helvetica-Bold", fontSize=12, textColor=colors.HexColor(INDIGO_LIGHT),
                spaceBefore=10, spaceAfter=4, leading=16),
        "h3": s("h3", fontName="Helvetica-Bold", fontSize=10.5, textColor=colors.HexColor(INK),
                spaceBefore=8, spaceAfter=3, leading=14),
        "body": s("body", fontName="Helvetica", fontSize=10, leading=15, textColor=colors.HexColor(INK),
                  spaceAfter=5),
        "li": s("li", fontName="Helvetica", fontSize=10, leading=15, textColor=colors.HexColor(INK),
                leftIndent=14, spaceAfter=2),
        "quote": s("quote", fontName="Helvetica-Oblique", fontSize=10, leading=15,
                   textColor=colors.HexColor(MUTED), leftIndent=12, borderPadding=0, spaceAfter=6),
        "muted": s("muted", fontName="Helvetica", fontSize=8.5, textColor=colors.HexColor(MUTED),
                   spaceAfter=8, leading=12),
        "empty": s("empty", fontName="Helvetica-Oblique", fontSize=9.5, textColor=colors.HexColor(MUTED),
                   leading=14),
    }


_INLINE = {"strong": "b", "b": "b", "em": "i", "i": "i", "u": "u"}


class _HtmlConverter(HTMLParser):
    """Convertit le HTML produit par TipTap en flowables reportlab.

    Gère : h1/h2/h3, p, ul/ol/li (imbrication simple), blockquote,
    et l'inline b/strong, i/em, u, br.
    """

    def __init__(self, styles: dict):
        super().__init__(convert_charrefs=True)
        self.styles = styles
        self.flowables: list = []
        self.inline: list[str] = []
        self.block = "body"
        self.in_li = False
        self.in_quote = False
        self.list_stack: list[list] = []  # [type, compteur]
        self.li_prefix = ""

    def _flush(self):
        html = "".join(self.inline).strip()
        self.inline = []
        if not html:
            return
        if self.block == "li":
            style = self.styles["li"]
            html = self.li_prefix + html
        elif self.in_quote and self.block == "body":
            style = self.styles["quote"]
        else:
            style = self.styles.get(self.block, self.styles["body"])
        self.flowables.append(Paragraph(html, style))

    def handle_starttag(self, tag, attrs):
        if tag in _INLINE:
            self.inline.append(f"<{_INLINE[tag]}>")
        elif tag == "br":
            self.inline.append("<br/>")
        elif tag in ("h1", "h2", "h3"):
            self._flush(); self.block = tag
        elif tag == "p":
            if not self.in_li:
                self._flush(); self.block = "body"
        elif tag in ("ul", "ol"):
            self._flush(); self.list_stack.append([tag, 0])
        elif tag == "li":
            self._flush()
            self.in_li = True
            self.block = "li"
            if self.list_stack and self.list_stack[-1][0] == "ol":
                self.list_stack[-1][1] += 1
                self.li_prefix = f"{self.list_stack[-1][1]}.  "
            else:
                self.li_prefix = "•  "
        elif tag == "blockquote":
            self._flush(); self.in_quote = True; self.block = "body"

    def handle_endtag(self, tag):
        if tag in _INLINE:
            self.inline.append(f"</{_INLINE[tag]}>")
        elif tag in ("h1", "h2", "h3"):
            self._flush(); self.block = "body"
        elif tag == "p":
            if not self.in_li:
                self._flush(); self.block = "body"
        elif tag == "li":
            self._flush(); self.in_li = False; self.block = "body"
        elif tag in ("ul", "ol"):
            self._flush()
            if self.list_stack:
                self.list_stack.pop()
        elif tag == "blockquote":
            self._flush(); self.in_quote = False

    def handle_data(self, data):
        self.inline.append(escape(data))


def html_to_flowables(html: str | None, styles: dict) -> list:
    """Retourne une liste de flowables pour un contenu HTML riche."""
    if not html or not html.strip():
        return [Paragraph("Aucun contenu.", styles["empty"])]
    conv = _HtmlConverter(styles)
    conv.feed(html)
    conv._flush()
    if not conv.flowables:
        return [Paragraph("Aucun contenu.", styles["empty"])]
    return conv.flowables


__all__ = [
    "INDIGO", "INDIGO_LIGHT", "AMBER", "INK", "MUTED", "LINE", "TINT", "WHITE",
    "make_styles", "html_to_flowables", "Spacer",
]
