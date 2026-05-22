#!/usr/bin/env python3
"""
DOOMHOUND - Feature Specifications Document
3 Sistemi: Missioni Sociali, Referral System, Streak Reward
"""

import sys
import os

# ── Palette ──
from reportlab.lib import colors
ACCENT       = colors.HexColor('#4daccc')
TEXT_PRIMARY  = colors.HexColor('#efefee')
TEXT_MUTED    = colors.HexColor('#807d74')
BG_SURFACE   = colors.HexColor('#2e2c26')
BG_PAGE      = colors.HexColor('#0b0b0a')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD     = BG_SURFACE

# ── Font Registration ──
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif-Bold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif-Bold')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ── Imports ──
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from pypdf import PdfReader, PdfWriter, Transformation

import hashlib

# ── Constants ──
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.8 * inch
BOT_M = 0.8 * inch
AVAILABLE_W = PAGE_W - LEFT_M - RIGHT_M

# ── Styles ──
styles = getSampleStyleSheet()

cover_title_style = ParagraphStyle(
    name='CoverTitle', fontName='LiberationSerif', fontSize=36, leading=44,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, spaceAfter=12
)

cover_subtitle_style = ParagraphStyle(
    name='CoverSubtitle', fontName='LiberationSerif', fontSize=16, leading=22,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=8
)

cover_meta_style = ParagraphStyle(
    name='CoverMeta', fontName='LiberationSerif', fontSize=12, leading=16,
    textColor=ACCENT, alignment=TA_CENTER
)

h1_style = ParagraphStyle(
    name='H1', fontName='LiberationSerif', fontSize=22, leading=28,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10, alignment=TA_LEFT
)

h2_style = ParagraphStyle(
    name='H2', fontName='LiberationSerif', fontSize=16, leading=22,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8, alignment=TA_LEFT
)

h3_style = ParagraphStyle(
    name='H3', fontName='LiberationSerif', fontSize=13, leading=18,
    textColor=ACCENT, spaceBefore=10, spaceAfter=6, alignment=TA_LEFT
)

body_style = ParagraphStyle(
    name='Body', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6,
    firstLineIndent=0
)

body_indent_style = ParagraphStyle(
    name='BodyIndent', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=4,
    leftIndent=18
)

bullet_style = ParagraphStyle(
    name='Bullet', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=4,
    leftIndent=24, bulletIndent=12, bulletFontName='Times New Roman'
)

code_style = ParagraphStyle(
    name='Code', fontName='DejaVuSans', fontSize=9, leading=14,
    textColor=ACCENT, alignment=TA_LEFT, spaceAfter=4,
    leftIndent=24, backColor=BG_SURFACE
)

table_header_style = ParagraphStyle(
    name='TableHeader', fontName='LiberationSerif', fontSize=10,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, leading=14
)

table_cell_style = ParagraphStyle(
    name='TableCell', fontName='LiberationSerif', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, leading=13, wordWrap='CJK'
)

table_cell_center_style = ParagraphStyle(
    name='TableCellCenter', fontName='LiberationSerif', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, leading=13
)

caption_style = ParagraphStyle(
    name='Caption', fontName='LiberationSerif', fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=12
)

note_style = ParagraphStyle(
    name='Note', fontName='LiberationSerif', fontSize=9.5, leading=14,
    textColor=ACCENT, alignment=TA_LEFT, spaceAfter=6,
    leftIndent=18, borderColor=ACCENT, borderWidth=0.5,
    borderPadding=6
)


# ── Helper Functions ──
def make_table(data, col_widths_ratios, caption_text=None):
    """Create a styled table with proportional column widths."""
    col_widths = [r * AVAILABLE_W for r in col_widths_ratios]
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD))
        else:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN))
    
    t.setStyle(TableStyle(style_cmds))
    
    elements = [Spacer(1, 18), t]
    if caption_text:
        elements.append(Paragraph(caption_text, caption_style))
    elements.append(Spacer(1, 12))
    return elements


def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p


# ── TOC Document Template ──
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


# ── Build Document ──
output_body = '/home/z/my-project/download/doomhound_specs_body.pdf'

doc = TocDocTemplate(
    output_body,
    pagesize=A4,
    leftMargin=LEFT_M,
    rightMargin=RIGHT_M,
    topMargin=TOP_M,
    bottomMargin=BOT_M,
)

story = []

# ============================================================
# TABLE OF CONTENTS
# ============================================================
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontName='LiberationSerif', fontSize=12, leftIndent=20, leading=20, spaceBefore=6, textColor=TEXT_PRIMARY),
    ParagraphStyle(name='TOC2', fontName='LiberationSerif', fontSize=10, leftIndent=40, leading=16, spaceBefore=3, textColor=TEXT_MUTED),
]

story.append(Paragraph('<b>DOOMHOUND - Specifiche Funzionali</b>', ParagraphStyle(
    name='TOCTitle', fontName='LiberationSerif', fontSize=20, leading=28,
    textColor=ACCENT, alignment=TA_CENTER, spaceAfter=18
)))
story.append(Spacer(1, 12))
story.append(toc)
story.append(PageBreak())

# ============================================================
# 1. OVERVIEW
# ============================================================
story.append(add_heading('1. Panoramica dei Sistemi', h1_style, level=0))

story.append(Paragraph(
    'Questo documento definisce le specifiche funzionali complete di tre sistemi di engagement e reward '
    'per il progetto $DOOMHOUND su AVAX. Ogni sistema e progettato per funzionare in modo indipendente '
    'ma anche in integrazione con gli altri, creando un ecosistema di incentivazione coerente e privo di bug. '
    'L\'obiettivo e generare hype nella community, aumentare la retention degli holder e incentivare '
    'la crescita organica del progetto attraverso meccaniche di gamification testate e affidabili.',
    body_style
))

story.append(Paragraph(
    'I tre sistemi sono stati scelti dopo un\'analisi delle migliori pratiche nel settore crypto e gaming. '
    'Ogni sistema risolve un problema specifico: le Missioni Sociali generano visibilita immediata e hype, '
    'il Referral System alimenta la crescita organica, e lo Streak Reward massimizza la retention a lungo termine. '
    'Insieme creano un ciclo virtuoso dove ogni azione dell\'utente viene ricompensata e incentiva azioni successive.',
    body_style
))

overview_data = [
    [Paragraph('<b>Sistema</b>', table_header_style),
     Paragraph('<b>Obiettivo Primario</b>', table_header_style),
     Paragraph('<b>Metrica Chiave</b>', table_header_style),
     Paragraph('<b>Complessita</b>', table_header_style)],
    [Paragraph('Missioni Sociali', table_cell_style),
     Paragraph('Visibilita e hype immediato', table_cell_style),
     Paragraph('Engagement rate social', table_cell_center_style),
     Paragraph('Media', table_cell_center_style)],
    [Paragraph('Referral System', table_cell_style),
     Paragraph('Crescita organica della base utenti', table_cell_style),
     Paragraph('Nuovi holder per referral', table_cell_center_style),
     Paragraph('Media-Alta', table_cell_center_style)],
    [Paragraph('Streak Reward', table_cell_style),
     Paragraph('Retention e attivita giornaliera', table_cell_style),
     Paragraph('DAU/MAU ratio', table_cell_center_style),
     Paragraph('Bassa', table_cell_center_style)],
]
story.extend(make_table(overview_data, [0.22, 0.32, 0.26, 0.20], 'Tabella 1: Panoramica dei tre sistemi'))

# ============================================================
# 2. MISSIONI SOCIALI
# ============================================================
story.append(add_heading('2. Sistema Missioni Sociali', h1_style, level=0))

story.append(add_heading('2.1 Obiettivo', h2_style, level=1))
story.append(Paragraph(
    'Il sistema Missioni Sociali premia gli holder di $DOOMHOUND che compiono azioni di engagement '
    'sui canali social ufficiali del progetto. Ogni missione completata assegna un numero fisso di punti '
    'al saldo dell\'utente. I punti sono accumulabili e contribuiscono alla classifica globale e ai '
    'livelli di staking. Il sistema e progettato per essere semplice da capire, facile da completare e '
    'impossibile da sfruttare con account falsi o bot.',
    body_style
))

story.append(add_heading('2.2 Elenco Missioni e Punti', h2_style, level=1))
story.append(Paragraph(
    'Di seguito la tabella completa delle missioni disponibili. Ogni missione ha un identificativo unico, '
    'una descrizione chiara dell\'azione richiesta, i punti assegnati al completamento, il cooldown '
    '(intervallo minimo tra completamenti successivi della stessa missione) e il limite massimo di '
    'completamenti totali per utente.',
    body_style
))

missions_data = [
    [Paragraph('<b>ID</b>', table_header_style),
     Paragraph('<b>Missione</b>', table_header_style),
     Paragraph('<b>Azione Richiesta</b>', table_header_style),
     Paragraph('<b>Punti</b>', table_header_style),
     Paragraph('<b>Cooldown</b>', table_header_style),
     Paragraph('<b>Max/Vita</b>', table_header_style)],
    [Paragraph('M01', table_cell_center_style),
     Paragraph('Retweet Ufficiale', table_cell_style),
     Paragraph('Retweet di un post ufficiale @DoomhoundAVAX', table_cell_style),
     Paragraph('+2', table_cell_center_style),
     Paragraph('24h', table_cell_center_style),
     Paragraph('Nessuno', table_cell_center_style)],
    [Paragraph('M02', table_cell_center_style),
     Paragraph('Tag 3 Amici', table_cell_style),
     Paragraph('Taggare 3 utenti reali sotto un post ufficiale', table_cell_style),
     Paragraph('+3', table_cell_center_style),
     Paragraph('48h', table_cell_center_style),
     Paragraph('10', table_cell_center_style)],
    [Paragraph('M03', table_cell_center_style),
     Paragraph('Crea un Meme', table_cell_style),
     Paragraph('Creare e postare un meme $DOOMHOUND con hashtag ufficiale', table_cell_style),
     Paragraph('+5', table_cell_center_style),
     Paragraph('72h', table_cell_center_style),
     Paragraph('20', table_cell_center_style)],
    [Paragraph('M04', table_cell_center_style),
     Paragraph('Discord Attivo', table_cell_style),
     Paragraph('Inviare almeno 10 messaggi in un canale ufficiale Discord', table_cell_style),
     Paragraph('+3', table_cell_center_style),
     Paragraph('24h', table_cell_center_style),
     Paragraph('Nessuno', table_cell_center_style)],
    [Paragraph('M05', table_cell_center_style),
     Paragraph('Invita su Discord', table_cell_style),
     Paragraph('Un nuovo utente entra nel Discord tramite invito', table_cell_style),
     Paragraph('+2', table_cell_center_style),
     Paragraph('Nessuno', table_cell_center_style),
     Paragraph('50', table_cell_center_style)],
]
story.extend(make_table(missions_data, [0.07, 0.14, 0.32, 0.10, 0.14, 0.12], 'Tabella 2: Elenco completo delle Missioni Sociali'))

story.append(add_heading('2.3 Regole di Validazione', h2_style, level=1))
story.append(Paragraph(
    'Per evitare abusi e garantire che solo le azioni legittime vengano ricompensate, il sistema applica '
    'le seguenti regole di validazione in modo rigoroso e automatico. Nessuna missione puo essere '
    'completata manualmente da un amministratore senza passare attraverso questi controlli.',
    body_style
))

story.append(Paragraph('<b>Regola 1 - Verifica Account Reale</b>', h3_style))
story.append(Paragraph(
    'L\'account social deve essere verificato come reale prima di poter completare qualsiasi missione. '
    'La verifica richiede: account creato da almeno 30 giorni, almeno 50 follower, almeno 20 tweet postati, '
    'avatar e bio compilati. Account che non soddisfano questi requisiti vengono automaticamente rifiutati '
    'dal sistema. La verifica viene eseguita una tantum e il risultato viene salvato nel profilo utente.',
    body_style
))

story.append(Paragraph('<b>Regola 2 - Cooldown per Missione</b>', h3_style))
story.append(Paragraph(
    'Ogni missione ha un cooldown specifico (vedi Tabella 2). Il timer parte dal momento del completamento '
    'registrato nel database. Un tentativo di completare la stessa missione durante il cooldown viene '
    'ignorato silenziosamente - nessun errore, nessun punto assegnato, nessuna notifica. Il cooldown '
    'viene calcolato in UTC per evitare ambiguita di fuso orario.',
    body_style
))

story.append(Paragraph('<b>Regola 3 - Limite Massimo per Vita</b>', h3_style))
story.append(Paragraph(
    'Le missioni con limite massimo (colonna Max/Vita) non possono essere completate oltre quel numero. '
    'Il contatore e cumulativo e non si resetta mai. Le missioni senza limite (indicato come "Nessuno") '
    'possono essere completate infinite volte rispettando il cooldown. Il limite serve a prevenire '
    'farming eccessivo su missioni ad alto payout.',
    body_style
))

story.append(Paragraph('<b>Regola 4 - Anti-Duplicazione</b>', h3_style))
story.append(Paragraph(
    'Per la missione M01 (Retweet), un utente non puo ricevere punti per retweetare lo stesso post '
    'piu volte. Il sistema salva l\'ID del tweet retweetato e verifica l\'unicita. Per la missione M02 '
    '(Tag 3 Amici), gli utenti taggati devono essere account unici e diversi ad ogni completamento - '
    'taggare sempre le stesse persone non genera punti. Per la missione M03 (Meme), il contenuto '
    'deve essere originale e non una ripubblicazione dello stesso meme.',
    body_style
))

story.append(Paragraph('<b>Regola 5 - Proof of Action</b>', h3_style))
story.append(Paragraph(
    'Ogni missione richiede una prova verificabile dell\'azione compiuta. Per M01 e M02: l\'URL del '
    'tweet o lo screenshot con l\'ID visibile. Per M03: l\'URL del tweet contenente il meme con l\'hashtag '
    '#DOOMHOUND. Per M04: integrazione automatica via Discord Bot che conta i messaggi. Per M05: il Discord '
    'Bot registra automaticamente gli inviti. La verifica puo essere manuale (moderazione) o automatica '
    '(API Twitter/Discord) a seconda dell\'infrastruttura disponibile.',
    body_style
))

story.append(add_heading('2.4 Schema Database - Missioni Sociali', h2_style, level=1))

db_missions_data = [
    [Paragraph('<b>Tabella</b>', table_header_style),
     Paragraph('<b>Campo</b>', table_header_style),
     Paragraph('<b>Tipo</b>', table_header_style),
     Paragraph('<b>Descrizione</b>', table_header_style)],
    [Paragraph('users', table_cell_style),
     Paragraph('wallet_address', table_cell_style),
     Paragraph('STRING (PK)', table_cell_center_style),
     Paragraph('Indirizzo wallet AVAX dell\'utente', table_cell_style)],
    [Paragraph('users', table_cell_style),
     Paragraph('total_points', table_cell_style),
     Paragraph('INTEGER', table_cell_center_style),
     Paragraph('Saldo totale punti accumulati', table_cell_style)],
    [Paragraph('social_accounts', table_cell_style),
     Paragraph('platform', table_cell_style),
     Paragraph('STRING', table_cell_center_style),
     Paragraph('Piattaforma (twitter/discord)', table_cell_style)],
    [Paragraph('social_accounts', table_cell_style),
     Paragraph('platform_id', table_cell_style),
     Paragraph('STRING', table_cell_center_style),
     Paragraph('ID univoco sulla piattaforma', table_cell_style)],
    [Paragraph('social_accounts', table_cell_style),
     Paragraph('is_verified', table_cell_style),
     Paragraph('BOOLEAN', table_cell_center_style),
     Paragraph('Account verificato come reale', table_cell_style)],
    [Paragraph('mission_completions', table_cell_style),
     Paragraph('user_wallet', table_cell_style),
     Paragraph('STRING (FK)', table_cell_center_style),
     Paragraph('Riferimento a users.wallet_address', table_cell_style)],
    [Paragraph('mission_completions', table_cell_style),
     Paragraph('mission_id', table_cell_style),
     Paragraph('STRING', table_cell_center_style),
     Paragraph('ID missione (M01-M05)', table_cell_style)],
    [Paragraph('mission_completions', table_cell_style),
     Paragraph('completed_at', table_cell_style),
     Paragraph('TIMESTAMP', table_cell_center_style),
     Paragraph('Data/ora completamento (UTC)', table_cell_style)],
    [Paragraph('mission_completions', table_cell_style),
     Paragraph('proof_url', table_cell_style),
     Paragraph('STRING', table_cell_center_style),
     Paragraph('URL o hash della prova dell\'azione', table_cell_style)],
    [Paragraph('mission_completions', table_cell_style),
     Paragraph('points_awarded', table_cell_style),
     Paragraph('INTEGER', table_cell_center_style),
     Paragraph('Punti assegnati in questa istanza', table_cell_style)],
]
story.extend(make_table(db_missions_data, [0.15, 0.18, 0.18, 0.49], 'Tabella 3: Schema Database - Missioni Sociali'))

story.append(add_heading('2.5 API Endpoints - Missioni Sociali', h2_style, level=1))

api_missions_data = [
    [Paragraph('<b>Metodo</b>', table_header_style),
     Paragraph('<b>Endpoint</b>', table_header_style),
     Paragraph('<b>Descrizione</b>', table_header_style),
     Paragraph('<b>Input</b>', table_header_style)],
    [Paragraph('POST', table_cell_center_style),
     Paragraph('/api/missions/complete', table_cell_style),
     Paragraph('Registra il completamento di una missione', table_cell_style),
     Paragraph('{wallet, mission_id, proof_url}', table_cell_style)],
    [Paragraph('GET', table_cell_center_style),
     Paragraph('/api/missions/status', table_cell_style),
     Paragraph('Stato missioni di un utente (cooldown, completamenti)', table_cell_style),
     Paragraph('?wallet=0x...', table_cell_style)],
    [Paragraph('GET', table_cell_center_style),
     Paragraph('/api/missions/available', table_cell_style),
     Paragraph('Lista missioni disponibili per l\'utente', table_cell_style),
     Paragraph('?wallet=0x...', table_cell_style)],
    [Paragraph('POST', table_cell_center_style),
     Paragraph('/api/social/verify', table_cell_style),
     Paragraph('Verifica un account social come reale', table_cell_style),
     Paragraph('{wallet, platform, platform_id}', table_cell_style)],
    [Paragraph('GET', table_cell_center_style),
     Paragraph('/api/missions/leaderboard', table_cell_style),
     Paragraph('Classifica globale per punti missione', table_cell_style),
     Paragraph('?limit=100', table_cell_style)],
]
story.extend(make_table(api_missions_data, [0.08, 0.25, 0.35, 0.32], 'Tabella 4: API Endpoints - Missioni Sociali'))

# ============================================================
# 3. REFERRAL SYSTEM
# ============================================================
story.append(add_heading('3. Sistema Referral', h1_style, level=0))

story.append(add_heading('3.1 Obiettivo', h2_style, level=1))
story.append(Paragraph(
    'Il sistema Referral incentiva gli holder esistenti a portare nuovi utenti nel progetto $DOOMHOUND. '
    'Funziona come un meccanismo di crescita organica dove ogni partecipante ha un codice referral unico '
    'e riceve punti quando un nuovo utente si unisce e completa azioni qualificanti. Il sistema e '
    'progettato per essere bilanciato: ricompensa sia chi invita sia chi viene invitato, ma con '
    'salvaguardie rigorose contro abusi multi-account e farming.',
    body_style
))

story.append(add_heading('3.2 Meccanica Dettagliata', h2_style, level=1))
story.append(Paragraph(
    'Ogni wallet che detiene almeno 1 $DOOMHOUND genera automaticamente un codice referral univoco. '
    'Il codice e derivato deterministicamente dal wallet address (hash truncato a 8 caratteri alfanumerici) '
    'in modo da non richiedere generazione manuale. Quando un nuovo utente si registra collegando il '
    'proprio wallet e inserisce un codice referral valido, entrambi gli utenti ricevono punti.',
    body_style
))

story.append(Paragraph(
    'Esistono due livelli di ricompensa referral. Il primo livello si attiva quando l\'utente invitato '
    'si registra e collega il wallet: chi ha invitato riceve +5 punti e il nuovo utente riceve +3 punti '
    'di benvenuto. Il secondo livello si attiva quando l\'utente invitato inizia a fare staking: chi ha '
    'invitato riceve +10 punti extra. Questo sistema a due livelli incentiva non solo l\'invito ma anche '
    'l\'accompagnamento del nuovo utente verso azioni di valore nel progetto.',
    body_style
))

referral_data = [
    [Paragraph('<b>Evento</b>', table_header_style),
     Paragraph('<b>Chi Riceve</b>', table_header_style),
     Paragraph('<b>Punti</b>', table_header_style),
     Paragraph('<b>Condizione</b>', table_header_style)],
    [Paragraph('Registrazione con codice referral', table_cell_style),
     Paragraph('Referrer (chi invita)', table_cell_style),
     Paragraph('+5', table_cell_center_style),
     Paragraph('Codice valido, nuovo wallet mai registrato', table_cell_style)],
    [Paragraph('Registrazione con codice referral', table_cell_style),
     Paragraph('Referee (chi viene invitato)', table_cell_style),
     Paragraph('+3', table_cell_center_style),
     Paragraph('Codice valido, primo collegamento wallet', table_cell_style)],
    [Paragraph('Referee inizia staking', table_cell_style),
     Paragraph('Referrer (chi invita)', table_cell_style),
     Paragraph('+10', table_cell_center_style),
     Paragraph('Referee completa primo stake di qualsiasi tier', table_cell_style)],
]
story.extend(make_table(referral_data, [0.28, 0.20, 0.10, 0.42], 'Tabella 5: Ricompense Referral'))

story.append(add_heading('3.3 Regole Anti-Abuse', h2_style, level=1))
story.append(Paragraph(
    'Il referral system e il piu suscettibile ad abusi tra i tre sistemi. Per questo motivo, le '
    'seguenti regole anti-abuse sono obbligatorie e non opzionali. Ogni regola e implementata '
    'a livello di backend e non puo essere bypassata dal frontend.',
    body_style
))

story.append(Paragraph('<b>Regola 1 - Un Referral per Wallet</b>', h3_style))
story.append(Paragraph(
    'Ogni wallet puo essere referenziato come "referee" esattamente una volta nella vita del progetto. '
    'Dopo aver usato un codice referral alla registrazione, il wallet non puo inserire un altro codice. '
    'Il campo referring_code nella tabella users viene impostato alla registrazione e non e piu modificabile. '
    'Questa regola impedisce il "referral hopping" dove un utente cambierebbe il proprio referente per '
    'ottenere benefici multipli.',
    body_style
))

story.append(Paragraph('<b>Regola 2 - Self-Referral Bloccato</b>', h3_style))
story.append(Paragraph(
    'Un wallet non puo usare il proprio codice referral. Il sistema confronta il wallet address che '
    'registra con il wallet associato al codice referral inserito. Se corrispondono, la registrazione '
    'avviene senza referral (nessun punto a nessuno, nessun errore visibile all\'utente). Inoltre, '
    'wallet che presentano pattern di trasferimento diretti tra di loro (es. stesso utente controlla '
    'piu wallet) vengono flaggati per revisione manuale.',
    body_style
))

story.append(Paragraph('<b>Regola 3 - Limite Referral Attivi</b>', h3_style))
story.append(Paragraph(
    'Un utente puo avere un massimo di 50 referral di primo livello che generano punti. I referral '
    'oltre il 50esimo vengono registrati nel database ma non generano punti per il referrer. Il referee '
    'riceve comunque i suoi +3 punti di benvenuto. Il limite serve a prevenire che pochi utenti con '
    'grande reach monopolizzino il sistema di punti referral. Il limite e configurabile tramite DAO vote.',
    body_style
))

story.append(Paragraph('<b>Regola 4 - Reward Staking Unico per Referee</b>', h3_style))
story.append(Paragraph(
    'Il bonus di +10 punti per il referrer quando il referee inizia lo staking viene assegnato '
    'esattamente una volta per ogni referee. Anche se il referee cambia tier di staking o rimuove e '
    'ri-aggiunge lo stake, il bonus non viene riattivato. Il flag stake_bonus_awarded nella tabella '
    'referrals garantisce questa unicitita.',
    body_style
))

story.append(add_heading('3.4 Schema Database - Referral System', h2_style, level=1))

db_referral_data = [
    [Paragraph('<b>Tabella</b>', table_header_style),
     Paragraph('<b>Campo</b>', table_header_style),
     Paragraph('<b>Tipo</b>', table_header_style),
     Paragraph('<b>Descrizione</b>', table_header_style)],
    [Paragraph('users', table_cell_style),
     Paragraph('referral_code', table_cell_style),
     Paragraph('STRING (UNIQUE)', table_cell_center_style),
     Paragraph('Codice referral generato automaticamente', table_cell_style)],
    [Paragraph('users', table_cell_style),
     Paragraph('referring_code', table_cell_style),
     Paragraph('STRING (NULLABLE)', table_cell_center_style),
     Paragraph('Codice referral usato alla registrazione (immutabile)', table_cell_style)],
    [Paragraph('users', table_cell_style),
     Paragraph('referral_count', table_cell_style),
     Paragraph('INTEGER', table_cell_center_style),
     Paragraph('Numero referral attivi che generano punti (max 50)', table_cell_style)],
    [Paragraph('referrals', table_cell_style),
     Paragraph('referrer_wallet', table_cell_style),
     Paragraph('STRING (FK)', table_cell_center_style),
     Paragraph('Wallet di chi ha invitato', table_cell_style)],
    [Paragraph('referrals', table_cell_style),
     Paragraph('referee_wallet', table_cell_style),
     Paragraph('STRING (FK)', table_cell_center_style),
     Paragraph('Wallet di chi e stato invitato', table_cell_style)],
    [Paragraph('referrals', table_cell_style),
     Paragraph('registered_at', table_cell_style),
     Paragraph('TIMESTAMP', table_cell_center_style),
     Paragraph('Data registrazione referee', table_cell_style)],
    [Paragraph('referrals', table_cell_style),
     Paragraph('stake_bonus_awarded', table_cell_style),
     Paragraph('BOOLEAN', table_cell_center_style),
     Paragraph('True se il bonus staking e gia stato assegnato', table_cell_style)],
    [Paragraph('referrals', table_cell_style),
     Paragraph('registration_points_given', table_cell_style),
     Paragraph('BOOLEAN', table_cell_center_style),
     Paragraph('True se i punti registrazione sono gia stati assegnati', table_cell_style)],
]
story.extend(make_table(db_referral_data, [0.13, 0.22, 0.20, 0.45], 'Tabella 6: Schema Database - Referral System'))

story.append(add_heading('3.5 API Endpoints - Referral System', h2_style, level=1))

api_referral_data = [
    [Paragraph('<b>Metodo</b>', table_header_style),
     Paragraph('<b>Endpoint</b>', table_header_style),
     Paragraph('<b>Descrizione</b>', table_header_style),
     Paragraph('<b>Input</b>', table_header_style)],
    [Paragraph('GET', table_cell_center_style),
     Paragraph('/api/referral/code', table_cell_style),
     Paragraph('Ottieni il proprio codice referral', table_cell_style),
     Paragraph('?wallet=0x...', table_cell_style)],
    [Paragraph('POST', table_cell_center_style),
     Paragraph('/api/referral/register', table_cell_style),
     Paragraph('Registra un nuovo utente con codice referral', table_cell_style),
     Paragraph('{wallet, referral_code}', table_cell_style)],
    [Paragraph('POST', table_cell_center_style),
     Paragraph('/api/referral/stake-bonus', table_cell_style),
     Paragraph('Attiva il bonus staking per il referrer', table_cell_style),
     Paragraph('{referee_wallet}', table_cell_style)],
    [Paragraph('GET', table_cell_center_style),
     Paragraph('/api/referral/stats', table_cell_style),
     Paragraph('Statistiche referral dell\'utente (count, punti, lista)', table_cell_style),
     Paragraph('?wallet=0x...', table_cell_style)],
]
story.extend(make_table(api_referral_data, [0.08, 0.26, 0.36, 0.30], 'Tabella 7: API Endpoints - Referral System'))

# ============================================================
# 4. STREAK REWARD
# ============================================================
story.append(add_heading('4. Sistema Streak Reward', h1_style, level=0))

story.append(add_heading('4.1 Obiettivo', h2_style, level=1))
story.append(Paragraph(
    'Il sistema Streak Reward premia la costanza degli holder che interagiscono con il progetto '
    'ogni giorno. Similmente al sistema di streak di Duolingo, ogni giorno consecutivo di attivita '
    'incrementa un moltiplicatore che viene applicato ai punti guadagnati da tutte le fonti (staking, '
    'missioni, referral). Lo streak si resetta a zero se l\'utente non compie alcuna azione qualificante '
    'in un giorno solare (UTC). Questo crea un forte incentivo psicologico a non interrompere la catena.',
    body_style
))

story.append(add_heading('4.2 Azioni Qualificanti per Streak', h2_style, level=1))
story.append(Paragraph(
    'Per mantenere lo streak attivo, l\'utente deve compiere almeno una delle seguenti azioni '
    'in un giorno solare UTC (dalle 00:00:00 alle 23:59:59 UTC). L\'azione viene registrata '
    'automaticamente dal sistema senza richiedere interazione manuale dell\'utente.',
    body_style
))

streak_actions_data = [
    [Paragraph('<b>Azione</b>', table_header_style),
     Paragraph('<b>Descrizione</b>', table_header_style),
     Paragraph('<b>Registrazione</b>', table_header_style)],
    [Paragraph('Staking attivo', table_cell_style),
     Paragraph('Avere un importo in staking nel proprio wallet', table_cell_style),
     Paragraph('Automatica: check giornaliero del saldo stake', table_cell_style)],
    [Paragraph('Completa una missione sociale', table_cell_style),
     Paragraph('Completare qualsiasi missione della Tabella 2', table_cell_style),
     Paragraph('Automatica: trigger al completamento missione', table_cell_style)],
    [Paragraph('Invia un referral valido', table_cell_style),
     Paragraph('Un nuovo utente si registra con il proprio codice', table_cell_style),
     Paragraph('Automatica: trigger alla registrazione referral', table_cell_style)],
    [Paragraph('Claim giornaliero', table_cell_style),
     Paragraph('Cliccare il bottone "Claim Daily" nella dApp', table_cell_style),
     Paragraph('Manuale: utente clicca, backend registra', table_cell_style)],
]
story.extend(make_table(streak_actions_data, [0.25, 0.40, 0.35], 'Tabella 8: Azioni qualificanti per lo Streak'))

story.append(add_heading('4.3 Sistema di Moltiplicatori', h2_style, level=1))
story.append(Paragraph(
    'Il moltiplicatore dello streak viene applicato a tutti i punti guadagnati in quel giorno, '
    'provenienti da qualsiasi fonte (staking, missioni, referral). Il moltiplicatore si basa '
    'sulla lunghezza dello streak corrente secondo la seguente tabella di soglie. Il moltiplicatore '
    'e cumulativo con il tier di staking: ad esempio, un utente Gold (20 pts/day) con streak di '
    '7 giorni riceve 20 x 1.5 = 30 punti dallo staking giornaliero.',
    body_style
))

streak_mult_data = [
    [Paragraph('<b>Giorni Consecutivi</b>', table_header_style),
     Paragraph('<b>Moltiplicatore</b>', table_header_style),
     Paragraph('<b>Esempio (Gold 20 pts)</b>', table_header_style),
     Paragraph('<b>Nota</b>', table_header_style)],
    [Paragraph('1-2 giorni', table_cell_center_style),
     Paragraph('x1.0', table_cell_center_style),
     Paragraph('20 pts', table_cell_center_style),
     Paragraph('Base, nessun bonus', table_cell_style)],
    [Paragraph('3-6 giorni', table_cell_center_style),
     Paragraph('x1.2', table_cell_center_style),
     Paragraph('24 pts', table_cell_center_style),
     Paragraph('Primo livello di bonus', table_cell_style)],
    [Paragraph('7-13 giorni', table_cell_center_style),
     Paragraph('x1.5', table_cell_center_style),
     Paragraph('30 pts', table_cell_center_style),
     Paragraph('Streak settimanale', table_cell_style)],
    [Paragraph('14-29 giorni', table_cell_center_style),
     Paragraph('x1.8', table_cell_center_style),
     Paragraph('36 pts', table_cell_center_style),
     Paragraph('Streak bisettimanale', table_cell_style)],
    [Paragraph('30+ giorni', table_cell_center_style),
     Paragraph('x2.0', table_cell_center_style),
     Paragraph('40 pts', table_cell_center_style),
     Paragraph('Streak mensile, massimo', table_cell_style)],
]
story.extend(make_table(streak_mult_data, [0.22, 0.16, 0.22, 0.40], 'Tabella 9: Moltiplicatori Streak per giorni consecutivi'))

story.append(add_heading('4.4 Regole di Reset e Protezione', h2_style, level=1))

story.append(Paragraph('<b>Regola 1 - Reset Automatico</b>', h3_style))
story.append(Paragraph(
    'Se un utente non compie nessuna azione qualificante (vedi Tabella 8) in un giorno solare UTC '
    'completo, lo streak si resetta a 0 automaticamente a mezzanotte UTC. Non esiste nessun periodo '
    'di grazia. Il reset e immediato e irreversibile. Il sistema esegue un cron job ogni giorno alle '
    '00:05 UTC che identifica tutti gli utenti senza attivita nel giorno precedente e azzera il loro '
    'contatore streak_days.',
    body_style
))

story.append(Paragraph('<b>Regola 2 - Freeze Streak (Protezione)</b>', h3_style))
story.append(Paragraph(
    'Ogni utente ha diritto a 1 Freeze ogni 30 giorni di streak consecutivo. Il Freeze permette di '
    'saltare un giorno senza perdere lo streak. Il Freeze deve essere attivato PRIMA del giorno di '
    'inattivita (non retroattivo). L\'attivazione e manuale tramite bottone nella dApp. Ogni utente '
    'puo accumulare al massimo 2 Freeze non utilizzati. I Freeze si guadagnano automaticamente: '
    '1 Freeze ogni 30 giorni di streak consecutivo, fino a un massimo di 2 accumulabili.',
    body_style
))

story.append(Paragraph('<b>Regola 3 - Calcolo del Moltiplicatore</b>', h3_style))
story.append(Paragraph(
    'Il moltiplicatore viene calcolato sul valore di streak_days al momento dell\'assegnazione dei punti. '
    'Se un utente con streak di 6 giorni completa una missione alle 23:50 UTC e lo streak passa a 7 giorni '
    'alle 00:00 UTC, la missione ottiene il moltiplicatore x1.2 (streak 6 giorni), mentre lo staking '
    'del giorno successivo ottiene x1.5 (streak 7 giorni). Il momento di riferimento e sempre il timestamp '
    'di assegnazione dei punti, non il timestamp di completamento dell\'azione.',
    body_style
))

story.append(add_heading('4.5 Schema Database - Streak Reward', h2_style, level=1))

db_streak_data = [
    [Paragraph('<b>Tabella</b>', table_header_style),
     Paragraph('<b>Campo</b>', table_header_style),
     Paragraph('<b>Tipo</b>', table_header_style),
     Paragraph('<b>Descrizione</b>', table_header_style)],
    [Paragraph('users', table_cell_style),
     Paragraph('streak_days', table_cell_style),
     Paragraph('INTEGER', table_cell_center_style),
     Paragraph('Numero giorni consecutivi di attivita', table_cell_style)],
    [Paragraph('users', table_cell_style),
     Paragraph('streak_last_active', table_cell_style),
     Paragraph('DATE', table_cell_center_style),
     Paragraph('Ultima data UTC con attivita qualificante', table_cell_style)],
    [Paragraph('users', table_cell_style),
     Paragraph('freeze_available', table_cell_style),
     Paragraph('INTEGER', table_cell_center_style),
     Paragraph('Numero di Freeze disponibili (max 2)', table_cell_style)],
    [Paragraph('users', table_cell_style),
     Paragraph('freeze_used_total', table_cell_style),
     Paragraph('INTEGER', table_cell_center_style),
     Paragraph('Totale Freeze utilizzati in assoluto', table_cell_style)],
    [Paragraph('streak_freezes', table_cell_style),
     Paragraph('user_wallet', table_cell_style),
     Paragraph('STRING (FK)', table_cell_center_style),
     Paragraph('Wallet dell\'utente', table_cell_style)],
    [Paragraph('streak_freezes', table_cell_style),
     Paragraph('activated_at', table_cell_style),
     Paragraph('TIMESTAMP', table_cell_center_style),
     Paragraph('Data/ora attivazione del Freeze', table_cell_style)],
    [Paragraph('streak_freezes', table_cell_style),
     Paragraph('target_date', table_cell_style),
     Paragraph('DATE', table_cell_center_style),
     Paragraph('Data per cui il Freeze e valido', table_cell_style)],
    [Paragraph('daily_activity', table_cell_style),
     Paragraph('user_wallet', table_cell_style),
     Paragraph('STRING (FK)', table_cell_center_style),
     Paragraph('Wallet dell\'utente', table_cell_style)],
    [Paragraph('daily_activity', table_cell_style),
     Paragraph('activity_date', table_cell_style),
     Paragraph('DATE', table_cell_center_style),
     Paragraph('Data UTC dell\'attivita', table_cell_style)],
    [Paragraph('daily_activity', table_cell_style),
     Paragraph('action_type', table_cell_style),
     Paragraph('STRING', table_cell_center_style),
     Paragraph('Tipo di azione (staking/mission/referral/claim)', table_cell_style)],
]
story.extend(make_table(db_streak_data, [0.14, 0.20, 0.16, 0.50], 'Tabella 10: Schema Database - Streak Reward'))

story.append(add_heading('4.6 API Endpoints - Streak Reward', h2_style, level=1))

api_streak_data = [
    [Paragraph('<b>Metodo</b>', table_header_style),
     Paragraph('<b>Endpoint</b>', table_header_style),
     Paragraph('<b>Descrizione</b>', table_header_style),
     Paragraph('<b>Input</b>', table_header_style)],
    [Paragraph('GET', table_cell_center_style),
     Paragraph('/api/streak/status', table_cell_style),
     Paragraph('Stato streak corrente (giorni, moltiplicatore, freeze)', table_cell_style),
     Paragraph('?wallet=0x...', table_cell_style)],
    [Paragraph('POST', table_cell_center_style),
     Paragraph('/api/streak/daily-claim', table_cell_style),
     Paragraph('Registra il claim giornaliero per mantenere lo streak', table_cell_style),
     Paragraph('{wallet}', table_cell_style)],
    [Paragraph('POST', table_cell_center_style),
     Paragraph('/api/streak/freeze/activate', table_cell_style),
     Paragraph('Attiva un Freeze per la data specificata', table_cell_style),
     Paragraph('{wallet, target_date}', table_cell_style)],
    [Paragraph('GET', table_cell_center_style),
     Paragraph('/api/streak/freeze/status', table_cell_style),
     Paragraph('Numero Freeze disponibili e storico utilizzi', table_cell_style),
     Paragraph('?wallet=0x...', table_cell_style)],
]
story.extend(make_table(api_streak_data, [0.08, 0.26, 0.36, 0.30], 'Tabella 11: API Endpoints - Streak Reward'))

# ============================================================
# 5. INTEGRAZIONE TRA I SISTEMI
# ============================================================
story.append(add_heading('5. Integrazione tra i Sistemi', h1_style, level=0))

story.append(add_heading('5.1 Flusso Unificato dei Punti', h2_style, level=1))
story.append(Paragraph(
    'Tutti e tre i sistemi contribuiscono al saldo punti unificato dell\'utente, memorizzato nel campo '
    'users.total_points. Non esistono saldi separati per le diverse fonti: i punti sono intercambiabili '
    'e cumulativi. Il campo total_points viene aggiornato in modo transazionale per ogni assegnazione, '
    'garantendo consistenza anche in caso di accessi concorrenti.',
    body_style
))

story.append(Paragraph(
    'Il moltiplicatore dello Streak Reward si applica a tutte le fonti di punti nella stessa giornata. '
    'Questo significa che se un utente ha uno streak di 7 giorni (moltiplicatore x1.5), tutti i punti '
    'che riceve quel giorno - dallo staking, dalle missioni completate, dai referral registrati - vengono '
    'moltiplicati per 1.5. L\'ordine di applicazione e: (1) calcola punti base della fonte, (2) applica '
    'moltiplicatore streak corrente, (3) arrotonda per eccesso al numero intero piu vicino, (4) aggiungi '
    'al saldo total_points. L\'arrotondamento per eccesso garantisce che l\'utente non perda mai frazioni '
    'di punto.',
    body_style
))

integration_data = [
    [Paragraph('<b>Fonte Punti</b>', table_header_style),
     Paragraph('<b>Punti Base</b>', table_header_style),
     Paragraph('<b>Streak x1.5</b>', table_header_style),
     Paragraph('<b>Streak x2.0</b>', table_header_style)],
    [Paragraph('Staking Gold', table_cell_style),
     Paragraph('20', table_cell_center_style),
     Paragraph('30', table_cell_center_style),
     Paragraph('40', table_cell_center_style)],
    [Paragraph('Missione M03 (Meme)', table_cell_style),
     Paragraph('5', table_cell_center_style),
     Paragraph('8', table_cell_center_style),
     Paragraph('10', table_cell_center_style)],
    [Paragraph('Referral registrazione', table_cell_style),
     Paragraph('5', table_cell_center_style),
     Paragraph('8', table_cell_center_style),
     Paragraph('10', table_cell_center_style)],
    [Paragraph('Referral staking bonus', table_cell_style),
     Paragraph('10', table_cell_center_style),
     Paragraph('15', table_cell_center_style),
     Paragraph('20', table_cell_center_style)],
    [Paragraph('Daily claim', table_cell_style),
     Paragraph('1', table_cell_center_style),
     Paragraph('2', table_cell_center_style),
     Paragraph('2', table_cell_center_style)],
]
story.extend(make_table(integration_data, [0.30, 0.20, 0.25, 0.25], 'Tabella 12: Esempi di calcolo punti con moltiplicatore Streak'))

story.append(add_heading('5.2 Eventi Cross-Sistema', h2_style, level=1))
story.append(Paragraph(
    'Alcune azioni in un sistema possono innescare eventi in un altro sistema. Questi cross-trigger '
    'sono fondamentali per creare il ciclo virtuoso di engagement e devono essere gestiti in modo '
    'atomico per evitare stati inconsistenza.',
    body_style
))

cross_data = [
    [Paragraph('<b>Trigger</b>', table_header_style),
     Paragraph('<b>Sistema Origine</b>', table_header_style),
     Paragraph('<b>Effetto</b>', table_header_style),
     Paragraph('<b>Sistema Destinazione</b>', table_header_style)],
    [Paragraph('Completamento missione', table_cell_style),
     Paragraph('Missioni Sociali', table_cell_style),
     Paragraph('Registra attivita giornaliera', table_cell_style),
     Paragraph('Streak Reward', table_cell_style)],
    [Paragraph('Registrazione referral', table_cell_style),
     Paragraph('Referral System', table_cell_style),
     Paragraph('Registra attivita giornaliera', table_cell_style),
     Paragraph('Streak Reward', table_cell_style)],
    [Paragraph('Referee inizia staking', table_cell_style),
     Paragraph('Referral System', table_cell_style),
     Paragraph('+10 pts al referrer (con moltiplicatore streak)', table_cell_style),
     Paragraph('Streak Reward', table_cell_style)],
    [Paragraph('Staking giornaliero attivo', table_cell_style),
     Paragraph('Staking', table_cell_style),
     Paragraph('Registra attivita giornaliera', table_cell_style),
     Paragraph('Streak Reward', table_cell_style)],
    [Paragraph('Claim giornaliero', table_cell_style),
     Paragraph('Streak Reward', table_cell_style),
     Paragraph('+1 pt base (con moltiplicatore)', table_cell_style),
     Paragraph('Punti Totali', table_cell_style)],
]
story.extend(make_table(cross_data, [0.24, 0.18, 0.34, 0.24], 'Tabella 13: Cross-trigger tra sistemi'))

# ============================================================
# 6. EDGE CASES & ERROR HANDLING
# ============================================================
story.append(add_heading('6. Edge Cases e Gestione Errori', h1_style, level=0))

story.append(Paragraph(
    'Questa sezione elenca tutti gli scenari limite che potrebbero causare bug o comportamenti '
    'inaspettati, con la soluzione implementativa precisa per ciascuno. Ogni edge case e stato '
    'analizzato e risolto per garantire che il sistema funzioni correttamente in qualsiasi condizione.',
    body_style
))

story.append(add_heading('6.1 Missioni Sociali - Edge Cases', h2_style, level=1))

ec_missions = [
    [Paragraph('<b>Scenario</b>', table_header_style),
     Paragraph('<b>Risultato Atteso</b>', table_header_style),
     Paragraph('<b>Implementazione</b>', table_header_style)],
    [Paragraph('Utente completa missione durante il cooldown', table_cell_style),
     Paragraph('Nessun punto, nessun errore', table_cell_style),
     Paragraph('Check completed_at + cooldown vs NOW(), skip silenzioso', table_cell_style)],
    [Paragraph('Utente raggiunge il limite Max/Vita di una missione', table_cell_style),
     Paragraph('Missione non piu disponibile', table_cell_style),
     Paragraph('API /missions/available filtra missioni al limite', table_cell_style)],
    [Paragraph('Account Twitter viene sospeso dopo la verifica', table_cell_style),
     Paragraph('Verifica invalidata', table_cell_style),
     Paragraph('Cron job settimanale ri-verifica account verificati', table_cell_style)],
    [Paragraph('Proof URL non valida o scaduta', table_cell_style),
     Paragraph('Completamento rifiutato', table_cell_style),
     Paragraph('Validazione URL attiva al momento della submission', table_cell_style)],
    [Paragraph('Due utenti taggano lo stesso account nella stessa missione M02', table_cell_style),
     Paragraph('Entrambi ricevono punti', table_cell_style),
     Paragraph('L\'unicita e per utente+missione, non per account taggato', table_cell_style)],
]
story.extend(make_table(ec_missions, [0.30, 0.28, 0.42], 'Tabella 14: Edge Cases - Missioni Sociali'))

story.append(add_heading('6.2 Referral System - Edge Cases', h2_style, level=1))

ec_referral = [
    [Paragraph('<b>Scenario</b>', table_header_style),
     Paragraph('<b>Risultato Atteso</b>', table_header_style),
     Paragraph('<b>Implementazione</b>', table_header_style)],
    [Paragraph('Utente inserisce il proprio codice referral', table_cell_style),
     Paragraph('Registrazione senza referral', table_cell_style),
     Paragraph('Check wallet_sender == wallet_referral_code_owner', table_cell_style)],
    [Paragraph('Codice referral inesistente', table_cell_style),
     Paragraph('Registrazione senza referral', table_cell_style),
     Paragraph('Lookup fallito = trattato come nessun codice', table_cell_style)],
    [Paragraph('Utente supera i 50 referral attivi', table_cell_style),
     Paragraph('Referral registrato, nessun punto per referrer', table_cell_style),
     Paragraph('Check referral_count >= 50 prima di assegnare punti', table_cell_style)],
    [Paragraph('Referee rimuove lo staking e lo riattiva', table_cell_style),
     Paragraph('Bonus +10 non riattivato', table_cell_style),
     Paragraph('Flag stake_bonus_awarded impedisce doppio premio', table_cell_style)],
    [Paragraph('Due wallet controllati dalla stessa persona si referenziano', table_cell_style),
     Paragraph('Flag per revisione manuale', table_cell_style),
     Paragraph('Pattern detection: trasferimenti diretti tra wallet referenti', table_cell_style)],
    [Paragraph('Referral code collision (due wallet generano stesso codice)', table_cell_style),
     Paragraph('Impossibile per design', table_cell_style),
     Paragraph('Codice = hash(wallet)[:8] con verifica unicita al momento della generazione', table_cell_style)],
]
story.extend(make_table(ec_referral, [0.30, 0.28, 0.42], 'Tabella 15: Edge Cases - Referral System'))

story.append(add_heading('6.3 Streak Reward - Edge Cases', h2_style, level=1))

ec_streak = [
    [Paragraph('<b>Scenario</b>', table_header_style),
     Paragraph('<b>Risultato Atteso</b>', table_header_style),
     Paragraph('<b>Implementazione</b>', table_header_style)],
    [Paragraph('Utente attivo alle 23:55 UTC, lo streak avanza a mezzanotte', table_cell_style),
     Paragraph('Lo streak avanza correttamente', table_cell_style),
     Paragraph('Ogni giorno UTC e un record separato in daily_activity', table_cell_style)],
    [Paragraph('Utente dimentica un giorno, lo streak si resetta', table_cell_style),
     Paragraph('streak_days = 0, moltiplicatore torna a x1.0', table_cell_style),
     Paragraph('Cron job 00:05 UTC identifica e resetta', table_cell_style)],
    [Paragraph('Utente attiva Freeze ma e gia attivo quel giorno', table_cell_style),
     Paragraph('Freeze non consumato', table_cell_style),
     Paragraph('Check: se daily_activity esiste per target_date, non consumare Freeze', table_cell_style)],
    [Paragraph('Utente attiva Freeze per una data passata', table_cell_style),
     Paragraph('Rifiutato', table_cell_style),
     Paragraph('Validazione: target_date deve essere nel futuro', table_cell_style)],
    [Paragraph('Utente ha 2 Freeze, ne usa 1, poi raggiunge 30 giorni di nuovo', table_cell_style),
     Paragraph('Ottiene 1 Freeze solo se < 2 accumulati', table_cell_style),
     Paragraph('freeze_available = min(freeze_available + 1, 2)', table_cell_style)],
    [Paragraph('Arrotondamento punti con moltiplicatore (es. 3 pts x 1.2 = 3.6)', table_cell_style),
     Paragraph('Arrotondato per eccesso a 4', table_cell_style),
     Paragraph('math.ceil(punti_base * moltiplicatore)', table_cell_style)],
    [Paragraph('Utente nuovo non ha ancora uno streak', table_cell_style),
     Paragraph('streak_days = 0, moltiplicatore x1.0', table_cell_style),
     Paragraph('Default nel database: streak_days=0, last_active=NULL', table_cell_style)],
]
story.extend(make_table(ec_streak, [0.30, 0.28, 0.42], 'Tabella 16: Edge Cases - Streak Reward'))

# ============================================================
# 7. CRON JOBS
# ============================================================
story.append(add_heading('7. Cron Jobs e Processi Automatici', h1_style, level=0))

story.append(Paragraph(
    'I seguenti processi automatici devono essere configurati come cron jobs sul server backend. '
    'Ogni job e progettato per essere idempotente: eseguirlo piu volte nello stesso giorno non '
    'causa effetti collaterali indesiderati. Tutti i timestamp sono in UTC.',
    body_style
))

cron_data = [
    [Paragraph('<b>Job</b>', table_header_style),
     Paragraph('<b>Schedule</b>', table_header_style),
     Paragraph('<b>Azione</b>', table_header_style),
     Paragraph('<b>Idempotenza</b>', table_header_style)],
    [Paragraph('Staking Daily Payout', table_cell_style),
     Paragraph('Ogni giorno alle 00:00 UTC', table_cell_center_style),
     Paragraph('Assegna punti staking a tutti i wallet con stake attivo, applica moltiplicatore streak', table_cell_style),
     Paragraph('Check: daily_activity per la data non esiste gia', table_cell_style)],
    [Paragraph('Streak Reset', table_cell_style),
     Paragraph('Ogni giorno alle 00:05 UTC', table_cell_center_style),
     Paragraph('Resetta streak_days a 0 per utenti senza attivita nel giorno precedente', table_cell_style),
     Paragraph('Check: streak_last_active < yesterday', table_cell_style)],
    [Paragraph('Freeze Accumulator', table_cell_style),
     Paragraph('Ogni giorno alle 00:10 UTC', table_cell_center_style),
     Paragraph('Per utenti con streak >= 30 e freeze_available < 2, aggiunge 1 Freeze', table_cell_style),
     Paragraph('Check: streak_days >= 30 AND freeze_available < 2', table_cell_style)],
    [Paragraph('Social Account Re-verify', table_cell_style),
     Paragraph('Ogni domenica alle 12:00 UTC', table_cell_center_style),
     Paragraph('Ri-verifica account social verificati (sospensioni, ban)', table_cell_style),
     Paragraph('Sovrascrive is_verified in base al risultato', table_cell_style)],
]
story.extend(make_table(cron_data, [0.18, 0.16, 0.38, 0.28], 'Tabella 17: Cron Jobs e processi automatici'))

# ============================================================
# 8. CONFIGURABILITA VIA DAO
# ============================================================
story.append(add_heading('8. Parametri Configurabili via DAO', h1_style, level=0))

story.append(Paragraph(
    'Tutti i parametri numerici dei tre sistemi sono configurabili attraverso votazioni DAO. '
    'I valori predefiniti elencati in questo documento sono quelli iniziali al lancio. La DAO '
    'puo modificare qualsiasi parametro con un voto a maggioranza semplice (>50% dei voti). '
    'I parametri sono memorizzati in una tabella system_config e letti dal backend ad ogni '
    'richiesta API, garantendo che le modifiche abbiano effetto immediato senza necessita di '
    'deploy o riavvio del server.',
    body_style
))

config_data = [
    [Paragraph('<b>Parametro</b>', table_header_style),
     Paragraph('<b>Valore Default</b>', table_header_style),
     Paragraph('<b>Sistema</b>', table_header_style),
     Paragraph('<b>Descrizione</b>', table_header_style)],
    [Paragraph('referral_max_active', table_cell_style),
     Paragraph('50', table_cell_center_style),
     Paragraph('Referral', table_cell_center_style),
     Paragraph('Numero massimo referral che generano punti per referrer', table_cell_style)],
    [Paragraph('referral_register_pts_referrer', table_cell_style),
     Paragraph('5', table_cell_center_style),
     Paragraph('Referral', table_cell_center_style),
     Paragraph('Punti per il referrer alla registrazione del referee', table_cell_style)],
    [Paragraph('referral_register_pts_referee', table_cell_style),
     Paragraph('3', table_cell_center_style),
     Paragraph('Referral', table_cell_center_style),
     Paragraph('Punti di benvenuto per il referee', table_cell_style)],
    [Paragraph('referral_stake_bonus_pts', table_cell_style),
     Paragraph('10', table_cell_center_style),
     Paragraph('Referral', table_cell_center_style),
     Paragraph('Punti extra quando il referee inizia lo staking', table_cell_style)],
    [Paragraph('streak_freeze_max', table_cell_style),
     Paragraph('2', table_cell_center_style),
     Paragraph('Streak', table_cell_center_style),
     Paragraph('Numero massimo Freeze accumulabili', table_cell_style)],
    [Paragraph('streak_freeze_earned_every_days', table_cell_style),
     Paragraph('30', table_cell_center_style),
     Paragraph('Streak', table_cell_center_style),
     Paragraph('Ogni quanti giorni di streak si guadagna 1 Freeze', table_cell_style)],
    [Paragraph('mission_cooldown_M01', table_cell_style),
     Paragraph('24h', table_cell_center_style),
     Paragraph('Missioni', table_cell_center_style),
     Paragraph('Cooldown missione Retweet Ufficiale', table_cell_style)],
    [Paragraph('social_account_min_age_days', table_cell_style),
     Paragraph('30', table_cell_center_style),
     Paragraph('Missioni', table_cell_center_style),
     Paragraph('Eta minima account social per la verifica (giorni)', table_cell_style)],
    [Paragraph('social_account_min_followers', table_cell_style),
     Paragraph('50', table_cell_center_style),
     Paragraph('Missioni', table_cell_center_style),
     Paragraph('Follower minimi per verificare un account social', table_cell_style)],
]
story.extend(make_table(config_data, [0.28, 0.14, 0.12, 0.46], 'Tabella 18: Parametri configurabili via DAO'))

# ── Build ──
doc.multiBuild(story)
print(f"Body PDF generated: {output_body}")

# ============================================================
# COVER PAGE (HTML + Playwright)
# ============================================================
cover_html = '/home/z/my-project/download/doomhound_cover.html'
cover_pdf = '/home/z/my-project/download/doomhound_cover.pdf'
final_pdf = '/home/z/my-project/download/DOOMHOUND_Feature_Specifications.pdf'

cover_html_content = '''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page { size: 794px 1123px; margin: 0; }
html, body { margin: 0; padding: 0; width: 794px; height: 1123px; overflow: hidden; font-family: 'Times New Roman', serif; }
.cover {
  width: 794px; height: 1123px;
  background: #0b0b0a;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  position: relative;
}
.accent-line {
  position: absolute; top: 180px; left: 80px; right: 80px; height: 2px;
  background: #4daccc; opacity: 0.6;
}
.accent-line-bottom {
  position: absolute; bottom: 180px; left: 80px; right: 80px; height: 2px;
  background: #4daccc; opacity: 0.6;
}
.content {
  text-align: center; padding: 0 80px;
}
.wolf-icon {
  font-size: 64px; color: #4daccc; margin-bottom: 24px;
}
.title {
  font-size: 42px; font-weight: bold; color: #efefee;
  letter-spacing: 4px; margin-bottom: 16px;
  line-height: 1.2;
}
.subtitle {
  font-size: 18px; color: #807d74; margin-bottom: 32px;
  line-height: 1.5;
}
.meta {
  font-size: 13px; color: #4daccc; margin-top: 16px;
  letter-spacing: 2px;
}
.divider {
  width: 120px; height: 1px; background: #4daccc; opacity: 0.4;
  margin: 20px auto;
}
.systems {
  font-size: 14px; color: #807d74; line-height: 2;
  margin-top: 8px;
}
.systems span { color: #4daccc; }
</style>
</head>
<body>
<div class="cover">
  <div class="accent-line"></div>
  <div class="content">
    <div class="title">DOOMHOUND</div>
    <div class="divider"></div>
    <div class="subtitle">Feature Specifications</div>
    <div class="systems">
      <span>&#9670;</span> Missioni Sociali<br>
      <span>&#9670;</span> Referral System<br>
      <span>&#9670;</span> Streak Reward
    </div>
    <div class="divider"></div>
    <div class="meta">SPECIFICA TECNICA V1.0</div>
    <div class="meta" style="color: #807d74; margin-top: 8px;">Maggio 2026</div>
  </div>
  <div class="accent-line-bottom"></div>
</div>
</body>
</html>
'''

with open(cover_html, 'w') as f:
    f.write(cover_html_content)

print(f"Cover HTML generated: {cover_html}")

# Render cover
import subprocess
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
result = subprocess.run(
    ['node', f'{PDF_SKILL_DIR}/scripts/html2poster.js', cover_html, '--output', cover_pdf, '--width', '794px'],
    capture_output=True, text=True, timeout=60
)
print("Cover render stdout:", result.stdout)
if result.returncode != 0:
    print("Cover render stderr:", result.stderr)
    raise RuntimeError(f"Cover rendering failed: {result.stderr}")

print(f"Cover PDF generated: {cover_pdf}")

# Merge cover + body
A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        sx, sy = A4_W / w, A4_H / h
        page.add_transformation(Transformation().scale(sx=sx, sy=sy))
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

writer = PdfWriter()

# Cover as page 1
cover_page = PdfReader(cover_pdf).pages[0]
writer.add_page(normalize_page_to_a4(cover_page))

# Body pages
for page in PdfReader(output_body).pages:
    writer.add_page(normalize_page_to_a4(page))

writer.add_metadata({
    '/Title': 'DOOMHOUND Feature Specifications',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Specifiche tecniche per Missioni Sociali, Referral System e Streak Reward'
})

with open(final_pdf, 'wb') as f:
    writer.write(f)

print(f"\nFinal PDF generated: {final_pdf}")
