"""Generate an executive 6-slide PowerPoint presentation for school directors (WaselEdu)."""
from pathlib import Path
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path("d:/Aymen/edu")
LOGO_PATH = ROOT / "edu_connect/assets/images/wasel_edu_logo.png"
OUT_PATH = ROOT / "Presentation_Directeurs_Wasel_Edu.pptx"

# WaselEdu Brand Palette
DEEP = RGBColor(0x12, 0x3B, 0x36)       # #123b36
DEEP_DARK = RGBColor(0x0C, 0x2B, 0x27)  # #0c2b27
PRIMARY = RGBColor(0x0D, 0x65, 0x5D)    # #0d655d
PRIMARY_SOFT = RGBColor(0xE5, 0xEE, 0xEA)
GOLD = RGBColor(0xD7, 0xB1, 0x74)       # #d7b174
GOLD_DARK = RGBColor(0xA9, 0x6F, 0x24)  # #a96f24
GOLD_SOFT = RGBColor(0xFB, 0xF5, 0xEA)
PAPER = RGBColor(0xF3, 0xF1, 0xEB)      # #f3f1eb
SURFACE = RGBColor(0xFF, 0xFD, 0xF8)    # #fffdf8
BORDER = RGBColor(0xD8, 0xDD, 0xD6)     # #d8ddd6
INK = RGBColor(0x18, 0x30, 0x2E)        # #18302e
MUTED = RGBColor(0x55, 0x66, 0x61)      # #556661
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
CREAM = RGBColor(0xF7, 0xF4, 0xEB)
DANGER = RGBColor(0x9E, 0x2F, 0x24)
DANGER_BG = RGBColor(0xFD, 0xF2, 0xF1)
SUCCESS_BG = RGBColor(0xF2, 0xFA, 0xF7)

FONT_MAIN = "Segoe UI"


def set_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_rect(slide, left, top, width, height, fill_color, border_color=None, border_pt=1.0, rounded=False):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    shape = slide.shapes.add_shape(shape_type, left, top, width, height)
    if rounded:
        shape.adjustments[0] = 0.04
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color is not None:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(border_pt)
    else:
        shape.line.fill.background()
    return shape


def add_textbox(slide, left, top, width, height, text="", font_size=14, bold=False,
                color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=1.18):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = Inches(0.04)
    tf.margin_right = Inches(0.04)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line_spacing
    if text:
        run = p.add_run()
        run.text = text
        run.font.name = FONT_MAIN
        run.font.size = Pt(font_size)
        run.font.bold = bold
        run.font.color.rgb = color
    return tb


def add_bullets(slide, left, top, width, height, items, font_size=12.5, color=INK,
                bullet_color=PRIMARY, space_after=6):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.04)
    tf.margin_right = Inches(0.04)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)

    for idx, item in enumerate(items):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.space_after = Pt(space_after)
        p.line_spacing = 1.18

        r_bul = p.add_run()
        r_bul.text = "▸ "
        r_bul.font.name = FONT_MAIN
        r_bul.font.size = Pt(font_size)
        r_bul.font.bold = True
        r_bul.font.color.rgb = bullet_color

        if isinstance(item, tuple):
            lead, rest = item
            r1 = p.add_run()
            r1.text = lead
            r1.font.name = FONT_MAIN
            r1.font.size = Pt(font_size)
            r1.font.bold = True
            r1.font.color.rgb = color

            r2 = p.add_run()
            r2.text = rest
            r2.font.name = FONT_MAIN
            r2.font.size = Pt(font_size)
            r2.font.bold = False
            r2.font.color.rgb = MUTED if color == INK else CREAM
        else:
            r1 = p.add_run()
            r1.text = item
            r1.font.name = FONT_MAIN
            r1.font.size = Pt(font_size)
            r1.font.color.rgb = color
    return tb


def add_header_footer(slide, kicker, title, subtitle, slide_num, total=6):
    set_bg(slide, PAPER)
    # Header bar background
    add_rect(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.42), SURFACE)
    add_rect(slide, Inches(0), Inches(1.42), Inches(13.333), Inches(0.02), BORDER)
    # Top thin gold accent strip
    add_rect(slide, Inches(0), Inches(0), Inches(13.333), Inches(0.07), DEEP)

    add_textbox(slide, Inches(0.6), Inches(0.18), Inches(9.5), Inches(0.28),
                kicker.upper(), font_size=10, bold=True, color=GOLD_DARK)
    add_textbox(slide, Inches(0.6), Inches(0.43), Inches(10.5), Inches(0.5),
                title, font_size=24, bold=True, color=DEEP)
    add_textbox(slide, Inches(0.6), Inches(0.95), Inches(11.2), Inches(0.36),
                subtitle, font_size=12.5, color=MUTED)

    if LOGO_PATH.exists():
        slide.shapes.add_picture(str(LOGO_PATH), Inches(12.22), Inches(0.32), width=Inches(0.62))

    # Footer bar
    add_rect(slide, Inches(0), Inches(7.08), Inches(13.333), Inches(0.42), SURFACE)
    add_rect(slide, Inches(0), Inches(7.06), Inches(13.333), Inches(0.02), BORDER)
    add_textbox(slide, Inches(0.6), Inches(7.14), Inches(9.0), Inches(0.28),
                "WaselEdu  ·  Plateforme de gestion scolaire pour les écoles privées en Algérie",
                font_size=9.5, color=MUTED)
    add_textbox(slide, Inches(11.6), Inches(7.14), Inches(1.15), Inches(0.28),
                f"{slide_num} / {total}", font_size=10, bold=True, color=DEEP, align=PP_ALIGN.RIGHT)


def add_pill(slide, left, top, width, height, text, fill_color, text_color, border_color=None, font_size=10.5):
    shape = add_rect(slide, left, top, width, height, fill_color, border_color=border_color, border_pt=1.0, rounded=True)
    shape.adjustments[0] = 0.45
    tf = shape.text_frame
    tf.word_wrap = False
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = text
    r.font.name = FONT_MAIN
    r.font.size = Pt(font_size)
    r.font.bold = True
    r.font.color.rgb = text_color
    return shape


def set_notes(slide, text):
    notes_slide = slide.notes_slide
    tf = notes_slide.notes_text_frame
    tf.text = text.strip()


def build_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    # =========================================================================
    # SLIDE 1 — COUVERTURE (ACCROCHE)
    # =========================================================================
    s1 = prs.slides.add_slide(blank)
    set_bg(s1, DEEP)
    # Decorative right panel accent
    add_rect(s1, Inches(0), Inches(0), Inches(13.333), Inches(0.1), GOLD)
    add_rect(s1, Inches(9.55), Inches(0.1), Inches(3.783), Inches(7.4), DEEP_DARK)
    add_rect(s1, Inches(9.53), Inches(0.1), Inches(0.02), Inches(7.4), GOLD)

    # Logo & brand
    if LOGO_PATH.exists():
        s1.shapes.add_picture(str(LOGO_PATH), Inches(0.75), Inches(0.65), width=Inches(0.95))
    add_textbox(s1, Inches(1.88), Inches(0.72), Inches(4.5), Inches(0.45),
                "WaselEdu", font_size=26, bold=True, color=WHITE)
    add_textbox(s1, Inches(1.88), Inches(1.18), Inches(5.0), Inches(0.32),
                "PLATEFORME SCOLAIRE ALGÉRIE", font_size=10.5, bold=True, color=GOLD)

    # Main hero title
    add_textbox(s1, Inches(0.75), Inches(2.15), Inches(8.4), Inches(0.35),
                "PRÉSCOLAIRE  ·  PRIMAIRE  ·  CEM  ·  LYCÉE  ·  GROUPES SCOLAIRES",
                font_size=10.5, bold=True, color=GOLD)

    tb_h1 = s1.shapes.add_textbox(Inches(0.75), Inches(2.55), Inches(8.3), Inches(2.15))
    tf_h1 = tb_h1.text_frame
    tf_h1.word_wrap = True
    p1 = tf_h1.paragraphs[0]
    p1.line_spacing = 1.08
    for txt, col in [
        ("Toute votre école privée\ndans ", WHITE),
        ("une seule application", GOLD),
        (" sécurisée.", WHITE),
    ]:
        r = p1.add_run()
        r.text = txt
        r.font.name = FONT_MAIN
        r.font.size = Pt(38)
        r.font.bold = True
        r.font.color.rgb = col

    add_textbox(
        s1, Inches(0.75), Inches(4.85), Inches(8.2), Inches(1.0),
        "Reliez la direction, le secrétariat, les enseignants, les parents, la cantine, "
        "l'infirmerie et le transport scolaire — 100 % adapté au système éducatif algérien.",
        font_size=15, color=CREAM, line_spacing=1.35
    )

    # Bottom pills
    add_pill(s1, Inches(0.75), Inches(6.25), Inches(2.85), Inches(0.44),
             "Dim–Jeu · 3 Trimestres · /20", DEEP_DARK, CREAM, border_color=GOLD, font_size=10.5)
    add_pill(s1, Inches(3.75), Inches(6.25), Inches(2.55), Inches(0.44),
             "Arabe · Français · Anglais", DEEP_DARK, CREAM, border_color=GOLD, font_size=10.5)
    add_pill(s1, Inches(6.45), Inches(6.25), Inches(2.55), Inches(0.44),
             "Web + Android & iOS", DEEP_DARK, CREAM, border_color=GOLD, font_size=10.5)

    # Right dark panel content
    add_textbox(s1, Inches(9.9), Inches(0.85), Inches(3.1), Inches(0.85),
                "المنصة الشاملة\nلتسيير المدارس الخاصة\nفي الجزائر",
                font_size=18, bold=True, color=GOLD, align=PP_ALIGN.RIGHT, line_spacing=1.25)

    add_rect(s1, Inches(9.9), Inches(2.45), Inches(3.05), Inches(0.02), PRIMARY)

    highlights = [
        ("Bulletins certifiés QR", "Anti-falsification avec logo de votre école"),
        ("Écolage en DA (0 % comm.)", "Reçus PDF mobile & rappels automatiques"),
        ("Bus & Cantine sécurisés", "Verrou anti-oubli & effectif cuisine exact"),
        ("1er Trimestre Offert", "Testez en conditions réelles sans risque"),
    ]
    y_pos = 2.72
    for h_title, h_sub in highlights:
        add_textbox(s1, Inches(9.9), Inches(y_pos), Inches(3.05), Inches(0.3),
                    f"✓  {h_title}", font_size=12.5, bold=True, color=WHITE)
        add_textbox(s1, Inches(10.18), Inches(y_pos + 0.28), Inches(2.77), Inches(0.42),
                    h_sub, font_size=10.5, color=CREAM)
        y_pos += 0.95

    set_notes(s1, """[0:00 - 0:45 | ACCROCHE]
« Bonjour Monsieur le Directeur / Madame la Directrice, merci pour votre accueil. Je sais que votre temps est précieux : cette présentation dure 6 minutes chrono.

Nous avons conçu WaselEdu spécialement pour les écoles privées algériennes afin de remplacer les groupes WhatsApp ingérables et les fichiers Excel dispersés par une seule application sécurisée — en arabe, français et anglais, sur semaine dimanche-jeudi, 3 trimestres, barème sur 20 et paiements au guichet en dinars. »""")

    # =========================================================================
    # SLIDE 2 — AVANT vs APRÈS (CONSTAT & IMPACT)
    # =========================================================================
    s2 = prs.slides.add_slide(blank)
    add_header_footer(
        s2,
        "01 · Constat Terrain & Solution",
        "Pourquoi quitter WhatsApp & Excel dès cette année ?",
        "Dès qu'une école dépasse 80 élèves, les outils gratuits coûtent cher en image, en temps et en trésorerie.",
        2
    )

    # Table headers
    col_x = [Inches(0.6), Inches(3.05), Inches(7.9)]
    col_w = [Inches(2.35), Inches(4.75), Inches(4.83)]
    row_h = Inches(0.48)
    top_y = Inches(1.7)

    add_rect(s2, col_x[0], top_y, col_w[0], row_h, RGBColor(0xE3, 0xE8, 0xE4), rounded=False)
    add_textbox(s2, col_x[0] + Inches(0.12), top_y + Inches(0.08), col_w[0] - Inches(0.2), Inches(0.32),
                "DOMAINE", font_size=11, bold=True, color=DEEP)

    add_rect(s2, col_x[1], top_y, col_w[1], row_h, RGBColor(0xF6, 0xDF, 0xDD))
    add_textbox(s2, col_x[1] + Inches(0.15), top_y + Inches(0.08), col_w[1] - Inches(0.2), Inches(0.32),
                "✗  GESTION CLASSIQUE (WHATSAPP + EXCEL)", font_size=11, bold=True, color=DANGER)

    add_rect(s2, col_x[2], top_y, col_w[2], row_h, DEEP)
    add_textbox(s2, col_x[2] + Inches(0.15), top_y + Inches(0.08), col_w[2] - Inches(0.2), Inches(0.32),
                "✓  AVEC WASEL EDU", font_size=11, bold=True, color=GOLD)

    rows = [
        (
            "Communication &\nVie privée",
            "Numéros privés des enseignants exposés, messages à 22h, discussions incontrôlables entre parents.",
            "Messagerie encadrée avec accusés de lecture ; les parents ne se voient jamais entre eux et n'ont plus les numéros privés."
        ),
        (
            "Notes & Bulletins\ntrimestriels",
            "Ressaisies Excel longues, erreurs de coefficients, stress des conseils et bulletins papier falsifiables.",
            "Validation direction en 1 clic, document figé avec votre logo, mentions algériennes et QR code vérifiable en ligne."
        ),
        (
            "Écolage &\nRecouvrement",
            "Carnets papier, oublis d'échéances et appels de relance gênants pour votre secrétariat.",
            "Encaissement au guichet (0 % comm.), reçu PDF instantané sur mobile et rappels automatiques courtois (8h–20h)."
        ),
        (
            "Cantine, Bus &\nDépart d'un prof",
            "Repas préparés pour des absents, aucune preuve de descente du bus ; un prof parti reste dans les groupes.",
            "Effectif cuisine recalculé à l'appel du matin, verrou bus anti-oubli d'enfant, et déconnexion mondiale en 1 clic."
        ),
    ]

    cur_y = top_y + row_h + Inches(0.04)
    r_height = Inches(0.95)
    for dom, before, after in rows:
        add_rect(s2, col_x[0], cur_y, col_w[0], r_height, SURFACE, border_color=BORDER, border_pt=0.75)
        add_textbox(s2, col_x[0] + Inches(0.14), cur_y + Inches(0.12), col_w[0] - Inches(0.24), r_height - Inches(0.18),
                    dom, font_size=12, bold=True, color=DEEP, anchor=MSO_ANCHOR.MIDDLE)

        add_rect(s2, col_x[1], cur_y, col_w[1], r_height, DANGER_BG, border_color=BORDER, border_pt=0.75)
        add_textbox(s2, col_x[1] + Inches(0.15), cur_y + Inches(0.1), col_w[1] - Inches(0.28), r_height - Inches(0.16),
                    before, font_size=11.5, color=RGBColor(0x6D, 0x32, 0x2C), anchor=MSO_ANCHOR.MIDDLE)

        add_rect(s2, col_x[2], cur_y, col_w[2], r_height, SUCCESS_BG, border_color=BORDER, border_pt=0.75)
        add_textbox(s2, col_x[2] + Inches(0.15), cur_y + Inches(0.1), col_w[2] - Inches(0.28), r_height - Inches(0.16),
                    after, font_size=11.5, bold=False, color=INK, anchor=MSO_ANCHOR.MIDDLE)
        cur_y += r_height + Inches(0.06)

    # Bottom question callout
    add_rect(s2, Inches(0.6), Inches(6.28), Inches(12.13), Inches(0.58), DEEP, rounded=True)
    add_rect(s2, Inches(0.6), Inches(6.28), Inches(0.1), Inches(0.58), GOLD)
    add_textbox(
        s2, Inches(0.85), Inches(6.35), Inches(11.6), Inches(0.42),
        "Une seule vérité pour 7 rôles cloisonnés : Direction · Secrétariat · Enseignants · Parents · Infirmerie · Cantine · Chauffeur.",
        font_size=12.5, bold=True, color=CREAM, anchor=MSO_ANCHOR.MIDDLE
    )

    set_notes(s2, """[0:45 - 2:00 | DIAGNOSTIC & EMPATHIE]
« Dans presque toutes les écoles privées que nous rencontrons, dès qu'on dépasse 80 élèves, on retrouve exactement ces 4 sources de fatigue : WhatsApp qui expose les numéros des profs, les bulletins Excel longs et falsifiables, les relances d'écolage gênantes au secrétariat, et les angles morts sur la cantine, le bus ou le départ d'un enseignant.

[QUESTION CLÉ - ÉCOUTEZ LA RÉPONSE]
Avant d'aller plus loin, parmi ces 4 points, lequel vous prend le plus d'énergie aujourd'hui dans votre école ? »

(Utilisez sa réponse pour insister 20 secondes de plus sur le pilier correspondant à la Slide 3.)""")

    # =========================================================================
    # SLIDE 3 — LES 4 PILIERS CONCRETS
    # =========================================================================
    s3 = prs.slides.add_slide(blank)
    add_header_footer(
        s3,
        "02 · Fonctionnalités Clés",
        "Les 4 piliers qui transforment votre quotidien dès la 1re semaine",
        "Chacun accède uniquement à son périmètre — sur ordinateur (Web) comme sur mobile (Android & iOS).",
        3
    )

    cards = [
        (
            Inches(0.6), Inches(1.66), PRIMARY, "01 · PÉDAGOGIE & IMAGE",
            "Notes validées & Bulletins certifiés QR",
            [
                ("Appel en 20s : ", "alerte immédiate aux parents en cas d'absence ou retard."),
                ("Validation direction : ", "aucune note publiée sans votre accord ; cloisonnement par matière."),
                ("Bulletins officiels : ", "logo, mentions algériennes (≥12, ≥14, ≥16) et QR code anti-falsification vérifiable en ligne."),
                ("RDV encadrés : ", "prise de RDV parents-profs sans exposer les numéros privés."),
            ]
        ),
        (
            Inches(6.82), Inches(1.66), GOLD_DARK, "02 · TRÉSORERIE (0 % COMMISSION)",
            "Écolage au guichet, Reçus PDF & Relances auto",
            [
                ("Vos habitudes conservées : ", "Espèces, CCP / BaridiMob, Chèque, Virement — aucun paiement en ligne imposé."),
                ("Facturation sans doublon : ", "par classe ou école entière, suivi en temps réel (encaissé / reste / retards)."),
                ("Reçu PDF en 5 sec : ", "imprimé avec votre logo et envoyé aussitôt sur le mobile du parent."),
                ("Rappels auto polis : ", "3 jours avant échéance puis 1x/semaine (8h–20h) — finie la gêne des appels."),
            ]
        ),
        (
            Inches(0.6), Inches(4.36), DEEP, "03 · SERVICES OPTIONNELS (1 CLIC)",
            "Bus scolaire anti-oubli & Cantine exacte",
            [
                ("Bus hors-ligne : ", "pointage montée/descente même sans 4G + bouton « Retard +15 min »."),
                ("Verrou anti-oubli : ", "clôture du trajet bloquée s'il reste un enfant à bord (alerte SÉCURITÉ direction)."),
                ("Cantine zéro gaspillage : ", "les absents de l'appel du matin sont déduits automatiquement des repas."),
                ("Menus & régimes : ", "menus dimanche–jeudi avec allergènes, régimes spéciaux et facturation liée."),
            ]
        ),
        (
            Inches(6.82), Inches(4.36), PRIMARY, "04 · PILOTAGE DIRECTION & SANTÉ",
            "Vigilance élèves, Bilan Mensuel & Infirmerie",
            [
                ("Détection précoce : ", "alerte auto si moyenne < 10, chute ≥ 2 pts ou ≥ 3 absences non justifiées."),
                ("Bilan Mensuel PDF : ", "reçu le 1er de chaque mois (présences, encaissements, activité équipe vs N-1)."),
                ("Fiches santé chiffrées : ", "sous consentement parental ; accès isolé pour l'infirmerie."),
                ("Alerte courte terrain : ", "profs et chauffeurs voient uniquement l'alerte vitale (ex. allergie)."),
            ]
        ),
    ]

    for x, y, accent, tag, c_title, items in cards:
        add_rect(s3, x, y, Inches(5.91), Inches(2.5), SURFACE, border_color=BORDER, border_pt=1.0, rounded=True)
        add_rect(s3, x, y, Inches(5.91), Inches(0.08), accent)
        add_textbox(s3, x + Inches(0.22), y + Inches(0.16), Inches(5.4), Inches(0.24),
                    tag, font_size=9.5, bold=True, color=accent)
        add_textbox(s3, x + Inches(0.22), y + Inches(0.39), Inches(5.45), Inches(0.36),
                    c_title, font_size=14.5, bold=True, color=DEEP)
        add_bullets(s3, x + Inches(0.22), y + Inches(0.8), Inches(5.48), Inches(1.62),
                    items, font_size=11, bullet_color=accent, space_after=4.5)

    set_notes(s3, """[2:00 - 3:45 | LES 4 PILIERS + EFFET WAOUH QR]
« Concrètement, WaselEdu repose sur 4 piliers simples :

1. Pédagogie & Image : appel en 20 secondes avec alerte parent, validation des notes par votre direction avant publication, et bulletins trimestriels avec votre logo et un QR code anti-falsification.
[GESTE FORT : Tendez un bulletin papier imprimé au directeur et invitez-le à scanner le QR code avec son téléphone !]

2. Trésorerie : 0 % de commission, vos parents paient toujours au guichet (espèces, CCP/BaridiMob, chèque), la secrétaire sort le reçu PDF en 5 secondes directement sur leur téléphone, et les rappels automatiques polis s'occupent des retards à votre place.

3. Bus & Cantine (activables en 1 clic si vous les proposez) : pointage bus même sans 4G avec verrou anti-oubli qui bloque la clôture du trajet si un enfant reste à bord ; et côté cantine, les absents de l'appel du matin sont automatiquement retirés du nombre de repas à préparer.

4. Pilotage & Santé : détection précoce des élèves en difficulté, Bilan Mensuel PDF envoyé le 1er de chaque mois, et fiches santé chiffrées pour l'infirmerie. »""")

    # =========================================================================
    # SLIDE 4 — SÉCURITÉ & DÉPLOIEMENT EN 24H
    # =========================================================================
    s4 = prs.slides.add_slide(blank)
    add_header_footer(
        s4,
        "03 · Confiance & Mise en Route",
        "Sécurité totale & école opérationnelle en 24 heures",
        "Aucune installation serveur, aucun informaticien requis — même en plein milieu d'un trimestre.",
        4
    )

    # Left Column: Security
    lx = Inches(0.6)
    add_rect(s4, lx, Inches(1.68), Inches(5.85), Inches(5.15), SURFACE, border_color=BORDER, rounded=True)
    add_rect(s4, lx, Inches(1.68), Inches(5.85), Inches(0.09), DEEP)
    add_textbox(s4, lx + Inches(0.28), Inches(1.92), Inches(5.3), Inches(0.28),
                "SOUVERAINETÉ & CONTRÔLE ABSOLU", font_size=10, bold=True, color=GOLD_DARK)
    add_textbox(s4, lx + Inches(0.28), Inches(2.2), Inches(5.3), Inches(0.42),
                "Vos données restent 100 % les vôtres", font_size=17, bold=True, color=DEEP)

    sec_items = [
        ("Accès strictement fermés : ", "ni les parents ni les enseignants ne peuvent s'inscrire seuls. Tout part d'un code remis par votre école."),
        ("Isolation par établissement : ", "base de données cloisonnée techniquement — aucune autre école ne peut jamais voir vos données."),
        ("Déconnexion mondiale en 1 clic : ", "un enseignant quitte l'école ou perd son téléphone ? Coupez toutes ses sessions immédiatement."),
        ("Chiffrement & Journal d'audit : ", "fiches santé chiffrées ; chaque modification de note, annulation de reçu ou consultation santé est tracée."),
        ("Zéro publicité, zéro revente : ", "les informations des familles et votre comptabilité sont votre propriété exclusive."),
    ]
    add_bullets(s4, lx + Inches(0.28), Inches(2.75), Inches(5.3), Inches(3.85),
                sec_items, font_size=12, bullet_color=PRIMARY, space_after=10)

    # Right Column: 24h Onboarding
    rx = Inches(6.8)
    add_rect(s4, rx, Inches(1.68), Inches(5.93), Inches(5.15), DEEP, border_color=GOLD, border_pt=1.0, rounded=True)
    add_textbox(s4, rx + Inches(0.3), Inches(1.92), Inches(5.3), Inches(0.28),
                "DÉPLOIEMENT EXPRESS · ZÉRO FRICTION", font_size=10, bold=True, color=GOLD)
    add_textbox(s4, rx + Inches(0.3), Inches(2.2), Inches(5.3), Inches(0.42),
                "Prêt en 3 étapes simples (24h)", font_size=17, bold=True, color=WHITE)

    steps = [
        ("1", "Création & Import Excel (15 min)",
         "Dépôt de votre logo + import de vos fichiers Excel existants : élèves (prenom;nom;classe) et enseignants (prenom;nom;email)."),
        ("2", "Cartes QR Parents imprimées (Jour 1)",
         "Impression en 1 clic des fiches par classe (ID + PIN / QR). Chaque parent scanne, choisit sa langue (AR/FR/EN) et active son compte en 30s."),
        ("3", "Pilotage en temps réel (Jour 2)",
         "Dès le lendemain matin : appel, devoirs, cantine, bus, reçus d'écolage et premier bilan mensuel PDF automatique."),
    ]
    sy = 2.82
    for num, stitle, sdesc in steps:
        badge = add_rect(s4, rx + Inches(0.3), Inches(sy), Inches(0.46), Inches(0.46), GOLD, rounded=True)
        badge.adjustments[0] = 0.25
        tf_b = badge.text_frame
        tf_b.vertical_anchor = MSO_ANCHOR.MIDDLE
        pb = tf_b.paragraphs[0]
        pb.alignment = PP_ALIGN.CENTER
        rb = pb.add_run()
        rb.text = num
        rb.font.name = FONT_MAIN
        rb.font.size = Pt(16)
        rb.font.bold = True
        rb.font.color.rgb = DEEP_DARK

        add_textbox(s4, rx + Inches(0.92), Inches(sy - 0.03), Inches(4.7), Inches(0.32),
                    stitle, font_size=13.5, bold=True, color=GOLD)
        add_textbox(s4, rx + Inches(0.92), Inches(sy + 0.28), Inches(4.7), Inches(0.76),
                    sdesc, font_size=11.5, color=CREAM, line_spacing=1.2)
        sy += 1.18

    add_rect(s4, rx + Inches(0.3), Inches(6.22), Inches(5.33), Inches(0.44), DEEP_DARK, border_color=GOLD, border_pt=0.75, rounded=True)
    add_textbox(s4, rx + Inches(0.42), Inches(6.27), Inches(5.1), Inches(0.34),
                "✓  Accompagnement terrain inclus pour votre import CSV & secrétariat",
                font_size=11, bold=True, color=GOLD, anchor=MSO_ANCHOR.MIDDLE)

    set_notes(s4, """[3:45 - 4:45 | SÉCURITÉ & DÉPLOIEMENT EN 24H]
« Deux questions reviennent toujours chez les directeurs : la sécurité des données et la difficulté de mise en place.

Sur la sécurité : personne ne peut s'inscrire seul, votre base est totalement isolée des autres écoles, si un prof quitte votre établissement vous le déconnectez partout en un clic, et nous ne revendons jamais aucune donnée.

Sur la mise en place : pas besoin d'attendre septembre. En 24 heures vous êtes opérationnels : nous importons avec vous votre fichier Excel élèves et profs, vous imprimez les petites cartes QR parents par classe — chaque parent scanne et choisit sa langue en 30 secondes — et dès le lendemain matin l'école tourne sur WaselEdu. »""")

    # =========================================================================
    # SLIDE 5 — TARIFICATION & ROI
    # =========================================================================
    s5 = prs.slides.add_slide(blank)
    add_header_footer(
        s5,
        "04 · Investissement & Rentabilité",
        "Une formule Tout Inclus, transparente et vite rentabilisée",
        "Tous les modules, Web + Android + iOS, hébergement souverain et support — tranches progressives HT (plancher 180 000 DA/an).",
        5
    )

    tiers = [
        ("TRANCHE 1 · ESSENTIEL", "1 – 150 élèves", "2 000 DA", "HT / élève / an", "~167 DA / élève / mois",
         "Plancher 180 000 DA HT/an (≤ 90 élèves)", False),
        ("TRANCHE 2 · CROISSANCE", "151 – 400 élèves", "1 700 DA", "HT / élève / an", "~142 DA / élève / mois",
         "Tarification par tranches progressives", True),
        ("TRANCHE 3 · CAMPUS", "> 400 élèves", "1 400 DA", "HT / élève / an", "~117 DA / élève / mois",
         "Conçu pour les groupes scolaires", False),
    ]

    tx = Inches(0.6)
    tw = Inches(3.85)
    for t_name, t_range, t_price, t_unit, t_mo, t_desc, featured in tiers:
        bg = SUCCESS_BG if featured else SURFACE
        bcol = PRIMARY if featured else BORDER
        bpt = 2.0 if featured else 1.0
        add_rect(s5, tx, Inches(1.75), tw, Inches(2.72), bg, border_color=bcol, border_pt=bpt, rounded=True)
        add_rect(s5, tx, Inches(1.75), tw, Inches(0.09), PRIMARY if featured else GOLD_DARK)

        add_textbox(s5, tx + Inches(0.24), Inches(1.96), tw - Inches(0.48), Inches(0.26),
                    t_name, font_size=10.5, bold=True, color=PRIMARY if featured else GOLD_DARK)
        add_textbox(s5, tx + Inches(0.24), Inches(2.22), tw - Inches(0.48), Inches(0.3),
                    t_range, font_size=13, bold=True, color=MUTED)

        tb_p = s5.shapes.add_textbox(tx + Inches(0.24), Inches(2.6), tw - Inches(0.48), Inches(0.62))
        tf_p = tb_p.text_frame
        pp = tf_p.paragraphs[0]
        r_big = pp.add_run()
        r_big.text = t_price + " "
        r_big.font.name = FONT_MAIN
        r_big.font.size = Pt(30)
        r_big.font.bold = True
        r_big.font.color.rgb = DEEP
        r_sm = pp.add_run()
        r_sm.text = t_unit
        r_sm.font.name = FONT_MAIN
        r_sm.font.size = Pt(12)
        r_sm.font.bold = True
        r_sm.font.color.rgb = MUTED

        add_pill(s5, tx + Inches(0.24), Inches(3.32), Inches(2.35), Inches(0.36),
                 t_mo, PRIMARY_SOFT if featured else GOLD_SOFT, DEEP, font_size=10.5)
        add_textbox(s5, tx + Inches(0.24), Inches(3.84), tw - Inches(0.48), Inches(0.46),
                    t_desc, font_size=11.5, color=MUTED)
        tx += tw + Inches(0.29)

    # ROI & Pioneer Offer Box (bottom left)
    add_rect(s5, Inches(0.6), Inches(4.78), Inches(7.7), Inches(1.95), DEEP, border_color=GOLD, border_pt=1.0, rounded=True)
    add_textbox(s5, Inches(0.88), Inches(4.96), Inches(7.1), Inches(0.32),
                "OFFRE 10 ÉCOLES PIONNIÈRES  ·  ROI IMMÉDIAT", font_size=10.5, bold=True, color=GOLD)
    add_textbox(s5, Inches(0.88), Inches(5.32), Inches(7.15), Inches(0.55),
                "−20 % la 1re année pour nos 10 premières écoles partenaires.",
                font_size=16, bold=True, color=WHITE)
    add_textbox(
        s5, Inches(0.88), Inches(5.82), Inches(7.15), Inches(0.75),
        "Moins de 2 % d'une mensualité : il suffit de récupérer 2 à 3 retards d'écolage grâce aux rappels automatiques "
        "(ou d'éviter quelques repas gaspillés à la cantine) pour que WaselEdu soit 100 % autofinancé.",
        font_size=11.8, color=CREAM, line_spacing=1.25
    )

    # Referral Box (bottom right)
    add_rect(s5, Inches(8.55), Inches(4.78), Inches(4.18), Inches(1.95), GOLD_SOFT, border_color=GOLD_DARK, border_pt=1.2, rounded=True)
    add_textbox(s5, Inches(8.8), Inches(4.96), Inches(3.7), Inches(0.3),
                "PROGRAMME PARRAINAGE", font_size=10.5, bold=True, color=GOLD_DARK)
    add_textbox(s5, Inches(8.8), Inches(5.32), Inches(3.7), Inches(0.55),
                "+ 2 mois offerts", font_size=24, bold=True, color=DEEP)
    add_textbox(
        s5, Inches(8.8), Inches(5.85), Inches(3.7), Inches(0.75),
        "Recommandez WaselEdu à un confrère directeur : dès son premier règlement, 2 mois gratuits sont offerts à votre école et à la sienne.",
        font_size=11.3, color=INK, line_spacing=1.22
    )

    set_notes(s5, """[4:45 - 5:45 | TARIFICATION & ROI]
« Côté budget, c'est une seule formule tout inclus — tous les modules, Web + Android + iOS, hébergement en Algérie et support — par tranches progressives HT : 2 000 DA/an de 1 à 150 élèves (plancher 180 000 DA HT/an), 1 700 DA/an de 151 à 400 élèves, et 1 400 DA/an au-delà.

Vous avez environ combien d'élèves cette année ? [Ex. 200 élèves → 150 × 2 000 + 50 × 1 700 = 385 000 DA HT/an, soit ~160 DA/élève/mois — et 308 000 DA HT la 1re année avec notre offre −20 % Écoles Pionnières réservée aux 10 premières écoles.]

Cela représente moins de 2 % d'une mensualité. Concrètement, il suffit de récupérer 2 ou 3 retards d'écolage dans l'année grâce aux rappels automatiques pour que la plateforme soit entièrement rentabilisée. Et avec le parrainage, chaque confrère recommandé vous offre 2 mois gratuits à tous les deux dès son premier règlement. »""")

    # =========================================================================
    # SLIDE 6 — OFFRE ZÉRO RISQUE & CLOSING
    # =========================================================================
    s6 = prs.slides.add_slide(blank)
    set_bg(s6, DEEP)
    add_rect(s6, Inches(0), Inches(0), Inches(13.333), Inches(0.1), GOLD)

    if LOGO_PATH.exists():
        s6.shapes.add_picture(str(LOGO_PATH), Inches(0.75), Inches(0.55), width=Inches(0.72))
    add_textbox(s6, Inches(1.62), Inches(0.62), Inches(4.0), Inches(0.36),
                "WaselEdu", font_size=21, bold=True, color=WHITE)
    add_textbox(s6, Inches(1.62), Inches(0.96), Inches(4.5), Inches(0.28),
                "OFFRE DE LANCEMENT  ·  ZÉRO RISQUE", font_size=10, bold=True, color=GOLD)

    add_pill(s6, Inches(9.2), Inches(0.65), Inches(3.4), Inches(0.48),
             "🎁  1er Trimestre 100 % Offert", GOLD, DEEP_DARK, font_size=12.5)

    tb_c = s6.shapes.add_textbox(Inches(0.75), Inches(1.65), Inches(11.8), Inches(1.35))
    tf_c = tb_c.text_frame
    tf_c.word_wrap = True
    pc = tf_c.paragraphs[0]
    pc.line_spacing = 1.12
    for txt, col in [
        ("Testez WaselEdu dans votre école\n", WHITE),
        ("avant de payer 1 seul dinar.", GOLD),
    ]:
        r = pc.add_run()
        r.text = txt
        r.font.name = FONT_MAIN
        r.font.size = Pt(36)
        r.font.bold = True
        r.font.color.rgb = col

    add_textbox(
        s6, Inches(0.75), Inches(3.05), Inches(11.4), Inches(0.6),
        "À l'activation, toute la plateforme est offerte jusqu'à la fin du trimestre en cours "
        "(ou du trimestre suivant complet s'il reste moins de 30 jours).",
        font_size=15, color=CREAM
    )

    # 3 closing action cards
    actions = [
        ("ÉTAPE 1 · MAINTENANT (3 MIN)", "Démo en direct",
         "Regardons ensemble un reçu PDF, un appel en classe et la vérification d'un bulletin QR.", False),
        ("ÉTAPE 2 · AUJOURD'HUI (2 MIN)", "Ouverture de votre espace",
         "Nous créons le compte de votre établissement avec votre logo et vos trimestres.", False),
        ("ÉTAPE 3 · DÈS DEMAIN", "Démarrage accompagné",
         "Import de votre fichier Excel, impression des cartes QR parents et test gratuit sur tout le trimestre.", True),
    ]
    ax = Inches(0.75)
    aw = Inches(3.75)
    for ak, at, ad, hi in actions:
        fill = RGBColor(0x1D, 0x4F, 0x48) if hi else DEEP_DARK
        bcol = GOLD if hi else PRIMARY
        add_rect(s6, ax, Inches(3.95), aw, Inches(2.05), fill, border_color=bcol, border_pt=1.5 if hi else 1.0, rounded=True)
        add_textbox(s6, ax + Inches(0.24), Inches(4.15), aw - Inches(0.48), Inches(0.28),
                    ak, font_size=9.5, bold=True, color=GOLD)
        add_textbox(s6, ax + Inches(0.24), Inches(4.48), aw - Inches(0.48), Inches(0.38),
                    at, font_size=16, bold=True, color=WHITE)
        add_textbox(s6, ax + Inches(0.24), Inches(4.94), aw - Inches(0.48), Inches(0.92),
                    ad, font_size=12, color=CREAM, line_spacing=1.25)
        ax += aw + Inches(0.29)

    # Contact footer bar
    add_rect(s6, Inches(0.75), Inches(6.42), Inches(11.83), Inches(0.02), PRIMARY)
    add_textbox(
        s6, Inches(0.75), Inches(6.58), Inches(8.2), Inches(0.42),
        "Votre contact :  [Votre Nom & Prénom]   |   📞 [Votre Téléphone]   |   ✉️ [Votre Email]",
        font_size=12.5, bold=True, color=CREAM
    )
    add_textbox(
        s6, Inches(9.0), Inches(6.55), Inches(3.58), Inches(0.45),
        "شكراً لحسن استماعكم", font_size=16, bold=True, color=GOLD, align=PP_ALIGN.RIGHT
    )

    set_notes(s6, """[5:45 - 6:30 | OFFRE ZÉRO RISQUE & CLOSING]
« Le mieux, ce n'est pas de me croire sur parole, c'est de le constater dans votre propre école sans aucun risque financier.

Votre premier trimestre est 100 % offert — et s'il reste moins de 30 jours dans le trimestre en cours, nous offrons aussi le trimestre suivant complet. Vous testez tout avec votre équipe avant de payer un seul dinar.

[CLOSING À CHOIX ALTERNATIF]
Je vous propose deux choses très simples : soit on regarde 3 minutes en direct sur mon écran un reçu PDF et un appel en classe, soit on ouvre dès maintenant l'espace de votre école en 2 minutes et on cale un créneau demain avec votre secrétariat pour importer votre liste Excel. Qu'est-ce qui vous convient le mieux ? »""")

    prs.save(str(OUT_PATH))
    print(f"Saved {OUT_PATH} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    build_deck()
