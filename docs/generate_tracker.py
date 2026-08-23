import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.properties import PageSetupProperties
from openpyxl.worksheet.datavalidation import DataValidation

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Suivi Projet"

# Colors
INK = "0B1A2E"
BRONZE = "A9784F"
BRONZE_DARK = "8A5F3C"
CREAM = "F8F4EC"
CREAM_DEEP = "EFE7D8"
WHITE = "FFFFFF"
CHARCOAL = "3B3A36"
WARM_GREY = "7A7468"
GREEN = "2F7A4D"
GREEN_BG = "E4F3E9"
YELLOW = "F59E0B"
YELLOW_BG = "FEF3C7"

# Fonts
phase_font = Font(name="Calibri", size=11, bold=True, color=BRONZE_DARK)
sprint_font = Font(name="Calibri", size=11, bold=True, color=INK)
task_font = Font(name="Calibri", size=10.5, color=CHARCOAL)
status_done = Font(name="Calibri", size=10, bold=True, color=GREEN)
status_progress = Font(name="Calibri", size=10, bold=True, color=YELLOW)
status_todo = Font(name="Calibri", size=10, color=WARM_GREY)
milestone_font = Font(name="Calibri", size=11, bold=True, color=GREEN)
total_font = Font(name="Calibri", size=11, bold=True, color=INK)

# Fills
cream_fill = PatternFill(start_color=CREAM, end_color=CREAM, fill_type="solid")
phase_fill = PatternFill(start_color=CREAM_DEEP, end_color=CREAM_DEEP, fill_type="solid")
green_fill = PatternFill(start_color=GREEN_BG, end_color=GREEN_BG, fill_type="solid")
white_fill = PatternFill(start_color=WHITE, end_color=WHITE, fill_type="solid")
ink_fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")
yellow_fill = PatternFill(start_color=YELLOW_BG, end_color=YELLOW_BG, fill_type="solid")

thin_border = Border(bottom=Side(style="thin", color=CREAM_DEEP))
thick_border = Border(
    top=Side(style="medium", color=INK),
    bottom=Side(style="medium", color=INK),
)

# Column widths
ws.column_dimensions["A"].width = 6
ws.column_dimensions["B"].width = 32
ws.column_dimensions["C"].width = 50
ws.column_dimensions["D"].width = 12
ws.column_dimensions["E"].width = 24
ws.column_dimensions["F"].width = 14
ws.column_dimensions["G"].width = 30

# Title
ws.merge_cells("A1:G1")
ws["A1"] = "HORKOS"
ws["A1"].font = Font(name="Garamond", size=24, bold=True, color=INK)
ws["A1"].alignment = Alignment(vertical="center")
ws.row_dimensions[1].height = 36

ws.merge_cells("A2:G2")
ws["A2"] = "Wealth Management \u2014 Suivi de projet"
ws["A2"].font = Font(name="Calibri", size=11, color=WARM_GREY)
ws.row_dimensions[2].height = 20

ws.merge_cells("A3:G3")
ws["A3"] = "Derniere mise a jour : 30 juillet 2026"
ws["A3"].font = Font(name="Calibri", size=9, italic=True, color=WARM_GREY)
ws.row_dimensions[3].height = 18
ws.row_dimensions[4].height = 8

# Header row
row = 5
headers = ["#", "Sprint / Phase", "Tache", "Jours", "Calendrier", "Statut", "Notes"]
for col, h in enumerate(headers, 1):
    cell = ws.cell(row=row, column=col, value=h)
    cell.font = Font(name="Calibri", size=9, bold=True, color=WHITE)
    cell.fill = ink_fill
    cell.alignment = Alignment(horizontal="left", vertical="center")
ws.row_dimensions[row].height = 28

# Task data
tasks = [
    ("phase", "", "PHASE 1 \u2014 SITE PUBLIC", "", "", "", ""),
    ("sprint", "", "Sprint 0 \u2014 Setup & Fondations", "3", "Lun 28 - Mer 30 juil", "", ""),
    ("task", "0.1", "Init Next.js 15 + Tailwind v4 + shadcn/ui", "", "", "Fait", ""),
    ("task", "0.2", "Theme custom (palette ink/bronze/cream)", "", "", "Fait", ""),
    ("task", "0.3", "Structure projet (route groups, folders)", "", "", "Fait", ""),
    ("task", "0.4", "Header public + nav dropdowns + Footer", "", "", "Fait", ""),
    ("task", "0.5", "Supabase project + schema DB initial", "", "", "Fait", ""),
    ("task", "0.6", "Auth (inscription, connexion, 3 roles)", "", "", "Fait", ""),
    ("task", "0.7", "Deploy Vercel (CI/CD)", "", "", "Fait", ""),
    ("sprint", "", "Sprint 1 \u2014 Pages statiques", "4", "Jeu 31 juil - Mar 5 aout", "", ""),
    ("task", "1.1", "Accueil (hero, besoins, methode, philosophie, FAQ, trust)", "", "", "A faire", ""),
    ("task", "1.2", "Notre approche", "", "", "A faire", ""),
    ("task", "1.3", "Notre modele (frais, 3 etapes, equation)", "", "", "A faire", ""),
    ("task", "1.4", "Nos produits (catalogue expandable)", "", "", "A faire", ""),
    ("task", "1.5", "Structuration patrimoniale", "", "", "A faire", ""),
    ("task", "1.6", "Reseau de professionnels + questionnaire partenariat", "", "", "A faire", ""),
    ("task", "1.7", "Cas d'usage (3 cas expandables)", "", "", "A faire", ""),
    ("sprint", "", "Sprint 2 \u2014 Pages dynamiques + Formulaires", "3", "Mer 6 - Ven 8 aout", "", ""),
    ("task", "2.1", "Questionnaire Prendre RDV (4 etapes)", "", "", "A faire", ""),
    ("task", "2.2", "Articles : liste + page detail", "", "", "A faire", ""),
    ("task", "2.3", "Guides : liste + formulaire email + Resend", "", "", "A faire", ""),
    ("task", "2.4", "Evenements : liste", "", "", "A faire", ""),
    ("task", "2.5", "Formulaire soumission actifs", "", "", "A faire", ""),
    ("task", "2.6", "SEO : meta tags, sitemap, structured data", "", "", "A faire", ""),
    ("marge", "", "Marge \u2014 corrections et imprevus", "2", "Lun 11 - Mar 12 aout", "", ""),
    ("milestone", "", "JALON 1 \u2014 Site public en ligne", "12", "12 aout", "", ""),
    ("phase", "", "PHASE 2 \u2014 ESPACE CLIENT & ADMINISTRATION", "", "", "", ""),
    ("sprint", "", "Sprint 3 \u2014 Espace Client Core", "5", "Mer 13 - Mar 19 aout", "", ""),
    ("task", "3.1", "Layout espace client (sidebar + main)", "", "", "A faire", ""),
    ("task", "3.2", "Dashboard (KPIs, repartition patrimoine)", "", "", "A faire", ""),
    ("task", "3.3", "Mon accompagnement (step nav R0/R1/R2, RDV)", "", "", "A faire", ""),
    ("task", "3.4", "Mon patrimoine (repartition, audit, docs)", "", "", "A faire", ""),
    ("task", "3.5", "Coffre-fort documentaire (4 categories)", "", "", "A faire", ""),
    ("task", "3.6", "Ceder un actif (formulaire complet)", "", "", "A faire", ""),
    ("task", "3.7", "Recommandations hub + page detail produit", "", "", "A faire", ""),
    ("sprint", "", "Sprint 4 \u2014 Back-Office Core", "5", "Mer 20 - Mar 26 aout", "", ""),
    ("task", "4.1", "Layout admin (sidebar + topbar)", "", "", "A faire", ""),
    ("task", "4.2", "Dashboard admin (KPIs, funnel, alertes, perf)", "", "", "A faire", ""),
    ("task", "4.3", "Insights (visiteurs, inscrits, guides, taux)", "", "", "A faire", ""),
    ("task", "4.4", "Gestion utilisateurs (table, filtres, toggle)", "", "", "A faire", ""),
    ("task", "4.5", "Gestion conseillers (table, ajout)", "", "", "A faire", ""),
    ("task", "4.6", "Leads telephone (table, statuts, export CSV)", "", "", "A faire", ""),
    ("marge", "", "Marge \u2014 corrections et imprevus", "2", "Mer 27 - Jeu 28 aout", "", ""),
    ("milestone", "", "JALON 2 \u2014 Plateforme lancable", "24", "28 aout", "", ""),
    ("phase", "", "PHASE 3 \u2014 FONCTIONNALITES AVANCEES & CONTENU", "", "", "", ""),
    ("sprint", "", "Sprint 5 \u2014 Client Features avancees", "4", "Ven 29 aout - Mer 3 sept", "", ""),
    ("task", "5.1", "Chat client/conseiller (Supabase Realtime)", "", "", "A faire", ""),
    ("task", "5.2", "Telecharger rapport audit (PDF)", "", "", "A faire", ""),
    ("task", "5.3", "Notifications email (RDV, documents)", "", "", "A faire", ""),
    ("task", "5.4", "Integration analytics (Umami)", "", "", "A faire", ""),
    ("sprint", "", "Sprint 6 \u2014 Back-Office CRUD & Gestion", "5", "Jeu 4 - Mer 10 sept", "", ""),
    ("task", "6.1", "Recommandations : catalogue + detail + CRUD", "", "", "A faire", ""),
    ("task", "6.2", "Dossiers de structuration : CRUD", "", "", "A faire", ""),
    ("task", "6.3", "Calendrier RDV (vue semaine)", "", "", "A faire", ""),
    ("task", "6.4", "Gestion audits patrimoniaux (creation + PDF)", "", "", "A faire", ""),
    ("task", "6.5", "Gestion documents Mon patrimoine", "", "", "A faire", ""),
    ("sprint", "", "Sprint 7 \u2014 Back-Office Contenu", "3", "Jeu 11 - Lun 15 sept", "", ""),
    ("task", "7.1", "CRUD Articles de blog", "", "", "A faire", ""),
    ("task", "7.2", "CRUD Guides + historique envois email", "", "", "A faire", ""),
    ("task", "7.3", "CRUD Evenements", "", "", "A faire", ""),
    ("task", "7.4", "CRUD FAQs", "", "", "A faire", ""),
    ("task", "7.5", "Gestion contacts + soumissions", "", "", "A faire", ""),
    ("task", "7.6", "Messagerie cote admin/conseiller", "", "", "A faire", ""),
    ("phase", "", "PHASE 4 \u2014 FINITIONS & MISE EN PRODUCTION", "", "", "", ""),
    ("sprint", "", "Sprint 8 \u2014 Polish & QA", "3", "Mar 16 - Jeu 18 sept", "", ""),
    ("task", "8.1", "Responsive mobile (toutes les pages)", "", "", "A faire", ""),
    ("task", "8.2", "Etats vides, loading, erreurs", "", "", "A faire", ""),
    ("task", "8.3", "Tests end-to-end critiques", "", "", "A faire", ""),
    ("task", "8.4", "Performance (images, lazy loading, caching)", "", "", "A faire", ""),
    ("task", "8.5", "Securite (validation, RBAC, rate limiting)", "", "", "A faire", ""),
    ("task", "8.6", "Deploy final + domaine horkos-wm.com", "", "", "A faire", ""),
    ("marge", "", "Marge \u2014 derniers ajustements", "2", "Ven 19 - Lun 22 sept", "", ""),
    ("milestone", "", "JALON 3 \u2014 Plateforme complete", "41", "22 septembre", "", ""),
]

row = 6
for t in tasks:
    typ, num, desc, days, cal, status, notes = t
    ws.row_dimensions[row].height = 26

    if typ == "phase":
        for col in range(1, 8):
            ws.cell(row=row, column=col).fill = phase_fill
        ws.cell(row=row, column=3, value=desc).font = phase_font
        ws.cell(row=row, column=3).alignment = Alignment(vertical="center")
        ws.row_dimensions[row].height = 30

    elif typ == "sprint":
        for col in range(1, 8):
            ws.cell(row=row, column=col).fill = cream_fill
            ws.cell(row=row, column=col).border = thin_border
        ws.cell(row=row, column=2, value=desc).font = sprint_font
        ws.cell(row=row, column=2).alignment = Alignment(vertical="center")
        if days:
            c = ws.cell(row=row, column=4, value=int(days))
            c.font = sprint_font
            c.alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row=row, column=5, value=cal).font = Font(name="Calibri", size=10, color=CHARCOAL)
        ws.row_dimensions[row].height = 28

    elif typ == "task":
        for col in range(1, 8):
            ws.cell(row=row, column=col).fill = white_fill
            ws.cell(row=row, column=col).border = thin_border
        ws.cell(row=row, column=1, value=num).font = Font(name="Calibri", size=9, color=WARM_GREY)
        ws.cell(row=row, column=1).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row=row, column=3, value=desc).font = task_font
        ws.cell(row=row, column=3).alignment = Alignment(vertical="center")

        status_cell = ws.cell(row=row, column=6, value=status)
        status_cell.alignment = Alignment(horizontal="center", vertical="center")
        if status == "Fait":
            status_cell.font = status_done
            status_cell.fill = green_fill
        elif status == "En cours":
            status_cell.font = status_progress
            status_cell.fill = yellow_fill
        else:
            status_cell.font = status_todo

        ws.cell(row=row, column=7, value=notes).font = Font(name="Calibri", size=9, color=WARM_GREY)

    elif typ == "marge":
        for col in range(1, 8):
            ws.cell(row=row, column=col).fill = white_fill
            ws.cell(row=row, column=col).border = thin_border
        ws.cell(row=row, column=3, value=desc).font = Font(name="Calibri", size=10, italic=True, color=WARM_GREY)
        if days:
            ws.cell(row=row, column=4, value=int(days)).font = Font(name="Calibri", size=10, color=WARM_GREY)
            ws.cell(row=row, column=4).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row=row, column=5, value=cal).font = Font(name="Calibri", size=10, italic=True, color=WARM_GREY)

    elif typ == "milestone":
        for col in range(1, 8):
            ws.cell(row=row, column=col).fill = green_fill
            ws.cell(row=row, column=col).border = Border(
                top=Side(style="thin", color=GREEN),
                bottom=Side(style="thin", color=GREEN),
            )
        ws.cell(row=row, column=3, value=desc).font = milestone_font
        ws.cell(row=row, column=3).alignment = Alignment(vertical="center")
        if days:
            ws.cell(row=row, column=4, value=int(days)).font = milestone_font
            ws.cell(row=row, column=4).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row=row, column=5, value=cal).font = milestone_font
        ws.row_dimensions[row].height = 30

    row += 1

# Dropdown validation for status column on task rows
dv = DataValidation(type="list", formula1='"Fait,En cours,A faire"', allow_blank=True)
dv.prompt = "Choisir le statut"
dv.promptTitle = "Statut"
ws.add_data_validation(dv)

# Collect task row numbers and apply validation
for r in range(6, row):
    cell = ws.cell(row=r, column=6)
    if cell.value in ("Fait", "En cours", "A faire"):
        dv.add(cell)

# Total row
row += 1
for col in range(1, 8):
    ws.cell(row=row, column=col).border = thick_border
ws.cell(row=row, column=3, value="TOTAL (dont 6 jours de marge)").font = total_font
ws.cell(row=row, column=4, value=41).font = total_font
ws.cell(row=row, column=4).alignment = Alignment(horizontal="center", vertical="center")
ws.cell(row=row, column=5, value="~8,5 semaines").font = total_font
ws.row_dimensions[row].height = 30

# Legend
row += 2
ws.cell(row=row, column=2, value="Legende statut :").font = Font(name="Calibri", size=9, bold=True, color=CHARCOAL)
row += 1
ws.cell(row=row, column=2, value="Fait").font = status_done
ws.cell(row=row, column=2).fill = green_fill
ws.cell(row=row, column=3, value="Tache terminee et validee").font = Font(name="Calibri", size=9, color=WARM_GREY)
row += 1
ws.cell(row=row, column=2, value="En cours").font = status_progress
ws.cell(row=row, column=2).fill = yellow_fill
ws.cell(row=row, column=3, value="Tache en cours de developpement").font = Font(name="Calibri", size=9, color=WARM_GREY)
row += 1
ws.cell(row=row, column=2, value="A faire").font = status_todo
ws.cell(row=row, column=3, value="Tache pas encore commencee").font = Font(name="Calibri", size=9, color=WARM_GREY)

# Freeze header
ws.freeze_panes = "A6"

# Print setup
ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0
ws.page_setup.orientation = "landscape"

wb.save("D:/horkos/docs/suivi-horkos-wm.xlsx")
print("Excel saved successfully")
