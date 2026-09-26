"""
Builds the SmartProperty DevOps / AZ-400 retrospective PDF.

Run:  python scripts/build_devops_report.py
Out:  deliverables/SmartProperty_DevOps_AZ400_Report.pdf
"""

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
import os

# ---------------------------------------------------------------- palette
INK = colors.HexColor("#14202B")
MUTED = colors.HexColor("#5C6B78")
RULE = colors.HexColor("#D6DEE4")
ACCENT = colors.HexColor("#0E5C73")
ACCENT_BG = colors.HexColor("#E4F0F3")
WARN = colors.HexColor("#8A5A08")
WARN_BG = colors.HexColor("#FBF1DE")
OK = colors.HexColor("#1A6B47")
OK_BG = colors.HexColor("#E3F2EA")
CRIT = colors.HexColor("#9E2B22")
CRIT_BG = colors.HexColor("#FAE8E6")
SURFACE = colors.HexColor("#F4F7F8")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

# ---------------------------------------------------------------- styles
ss = getSampleStyleSheet()


def mk(name, **kw):
    base = kw.pop("parent", ss["BodyText"])
    return ParagraphStyle(name, parent=base, **kw)


S = {
    "title": mk("t", parent=ss["Title"], fontName="Helvetica-Bold", fontSize=26,
                leading=30, textColor=INK, alignment=TA_LEFT, spaceAfter=4),
    "subtitle": mk("st", fontName="Helvetica", fontSize=12.5, leading=17,
                   textColor=MUTED, spaceAfter=2),
    "h1": mk("h1", fontName="Helvetica-Bold", fontSize=16, leading=20,
             textColor=INK, spaceBefore=16, spaceAfter=7),
    "h2": mk("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=15,
             textColor=ACCENT, spaceBefore=11, spaceAfter=4),
    "body": mk("b", fontName="Helvetica", fontSize=9.6, leading=14,
               textColor=INK, spaceAfter=6),
    "small": mk("s", fontName="Helvetica", fontSize=8.4, leading=11.5,
                textColor=MUTED, spaceAfter=4),
    "cell": mk("c", fontName="Helvetica", fontSize=8.3, leading=11,
               textColor=INK),
    "cellb": mk("cb", fontName="Helvetica-Bold", fontSize=8.3, leading=11,
                textColor=INK),
    "cellh": mk("ch", fontName="Helvetica-Bold", fontSize=7.6, leading=10,
                textColor=MUTED),
    "mono": mk("m", fontName="Courier", fontSize=8.2, leading=11.5,
               textColor=INK, backColor=SURFACE, borderPadding=5,
               spaceBefore=3, spaceAfter=7),
    "eyebrow": mk("e", fontName="Helvetica-Bold", fontSize=8, leading=11,
                  textColor=ACCENT, spaceAfter=3),
    "note": mk("n", fontName="Helvetica", fontSize=9, leading=13,
               textColor=INK, spaceAfter=5),
}


def callout(text, kind="accent"):
    bg, br = {"accent": (ACCENT_BG, ACCENT), "warn": (WARN_BG, WARN),
              "ok": (OK_BG, OK), "crit": (CRIT_BG, CRIT)}[kind]
    t = Table([[Paragraph(text, S["note"])]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 2, br),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def table(rows, widths, header=True, zebra=True):
    data = []
    for ri, row in enumerate(rows):
        out = []
        for c in row:
            if isinstance(c, Paragraph):
                out.append(c)
            else:
                st = S["cellh"] if (header and ri == 0) else S["cell"]
                out.append(Paragraph(str(c), st))
        data.append(out)
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
    ]
    if header:
        cmds += [("BACKGROUND", (0, 0), (-1, 0), SURFACE),
                 ("LINEBELOW", (0, 0), (-1, 0), 0.8, RULE)]
    if zebra:
        for i in range(1 if header else 0, len(data)):
            if i % 2 == (0 if header else 1):
                cmds.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#FBFCFD")))
    t.setStyle(TableStyle(cmds))
    return t


# ---------------------------------------------------------------- diagrams
def box(d, x, y, w, h, title, sub=None, fill=colors.white, stroke=RULE, tc=INK):
    d.add(Rect(x, y, w, h, fillColor=fill, strokeColor=stroke, strokeWidth=0.8))
    d.add(String(x + w / 2, y + (h / 2 + (3 if sub else -3)), title,
                 fontName="Helvetica-Bold", fontSize=7.6, fillColor=tc,
                 textAnchor="middle"))
    if sub:
        d.add(String(x + w / 2, y + h / 2 - 7, sub, fontName="Helvetica",
                     fontSize=6.4, fillColor=MUTED, textAnchor="middle"))


def arrow(d, x1, y1, x2, y2, dash=False):
    ln = Line(x1, y1, x2, y2, strokeColor=colors.HexColor("#9FB0BC"),
              strokeWidth=0.9)
    if dash:
        ln.strokeDashArray = [3, 2]
    d.add(ln)
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    L, Wd = 5.0, 2.6
    d.add(Polygon([x2, y2,
                   x2 - L * math.cos(ang) + Wd * math.sin(ang),
                   y2 - L * math.sin(ang) - Wd * math.cos(ang),
                   x2 - L * math.cos(ang) - Wd * math.sin(ang),
                   y2 - L * math.sin(ang) + Wd * math.cos(ang)],
                  fillColor=colors.HexColor("#9FB0BC"), strokeColor=None))


def architecture_diagram():
    W, H = PAGE_W - 2 * MARGIN, 210
    d = Drawing(W, H)
    d.add(Rect(0, 0, W, H, fillColor=colors.white, strokeColor=RULE, strokeWidth=0.6))

    d.add(String(12, H - 15, "RUNTIME ARCHITECTURE  (as deployed)",
                 fontName="Helvetica-Bold", fontSize=7.4, fillColor=MUTED))

    # columns
    box(d, 20, 130, 110, 34, "Browser", "smartproperties.tech", fill=SURFACE)
    box(d, 20, 62, 110, 40, "Cloudflare", "TLS + Cloud Connector", fill=ACCENT_BG, stroke=ACCENT)
    box(d, 170, 62, 120, 40, "Blob Storage", "static site (React)", fill=ACCENT_BG, stroke=ACCENT)
    box(d, 170, 130, 120, 34, "Container Apps", "ca-smartproperty-api2", fill=ACCENT_BG, stroke=ACCENT)
    box(d, 330, 150, 110, 32, "MongoDB Atlas", "M0 free (Azure NL)", fill=SURFACE)
    box(d, 330, 108, 110, 32, "Cloudflare R2", "user uploads (S3 API)", fill=SURFACE)
    box(d, 330, 62, 110, 32, "Log Analytics", "container logs", fill=SURFACE)
    box(d, 20, 14, 270, 30, "GitHub Actions + GHCR", "test / build / image registry", fill=SURFACE)

    # flows
    arrow(d, 75, 130, 75, 102)              # browser -> cloudflare
    arrow(d, 130, 82, 170, 82)              # cloudflare -> blob
    arrow(d, 130, 147, 170, 147)            # browser -> API (logical)
    arrow(d, 290, 146, 330, 160)            # api -> atlas
    arrow(d, 290, 142, 330, 126)            # api -> r2
    arrow(d, 230, 130, 230, 102, dash=True) # api -> logs (visual)
    arrow(d, 290, 30, 330, 70)              # actions -> logs? decorative
    arrow(d, 155, 29, 230, 62)              # ghcr -> container apps

    d.add(String(134, 152, "XHR / REST", fontName="Helvetica", fontSize=5.8,
                 fillColor=MUTED))
    d.add(String(133, 86, "origin fetch", fontName="Helvetica", fontSize=5.8,
                 fillColor=MUTED))
    return d


def pipeline_diagram():
    W, H = PAGE_W - 2 * MARGIN, 96
    d = Drawing(W, H)
    d.add(Rect(0, 0, W, H, fillColor=colors.white, strokeColor=RULE, strokeWidth=0.6))
    d.add(String(12, H - 14, "CI / CD PIPELINE  (.github/workflows/deploy.yml)",
                 fontName="Helvetica-Bold", fontSize=7.4, fillColor=MUTED))
    stages = [("test", "typecheck +\nfrontend build"),
              ("build-image", "docker build\npush to GHCR"),
              ("deploy-backend", "bicep +\nsmoke test"),
              ("deploy-frontend", "vite build\nupload blobs")]
    x = 16
    w = (W - 32 - 3 * 18) / 4
    for i, (t, s) in enumerate(stages):
        gated = i >= 2
        box(d, x, 22, w, 44, t, None,
            fill=WARN_BG if gated else ACCENT_BG,
            stroke=WARN if gated else ACCENT)
        for j, line in enumerate(s.split("\n")):
            d.add(String(x + w / 2, 40 - j * 7.5, line, fontName="Helvetica",
                         fontSize=5.9, fillColor=MUTED, textAnchor="middle"))
        if i < 3:
            arrow(d, x + w, 44, x + w + 17, 44)
        x += w + 18
    d.add(String(16, 10, "Amber stages are gated on AZURE_DEPLOY_ENABLED; the tenant blocks the "
                         "app registration that Azure login requires.",
                 fontName="Helvetica-Oblique", fontSize=6.2, fillColor=MUTED))
    return d


# ---------------------------------------------------------------- page frame
def on_page(canv, doc):
    canv.saveState()
    canv.setStrokeColor(RULE)
    canv.setLineWidth(0.5)
    canv.line(MARGIN, PAGE_H - MARGIN + 8, PAGE_W - MARGIN, PAGE_H - MARGIN + 8)
    canv.setFont("Helvetica", 7.2)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN, PAGE_H - MARGIN + 13, "SmartProperty - Azure Deployment & AZ-400 Retrospective")
    canv.drawRightString(PAGE_W - MARGIN, PAGE_H - MARGIN + 13, "26 September 2026")
    canv.line(MARGIN, MARGIN - 10, PAGE_W - MARGIN, MARGIN - 10)
    canv.drawCentredString(PAGE_W / 2, MARGIN - 19, str(canv.getPageNumber()))
    canv.restoreState()


def build(path):
    doc = BaseDocTemplate(path, pagesize=A4,
                          leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=MARGIN, bottomMargin=MARGIN,
                          title="SmartProperty - Azure Deployment & AZ-400 Retrospective",
                          author="SmartProperty")
    frame = Frame(MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN,
                  id="main", showBoundary=0)
    doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=on_page)])
    doc.build(story())
    return path


# ---------------------------------------------------------------- content
def story():
    F = PAGE_W - 2 * MARGIN
    s = []
    P = lambda t, st="body": s.append(Paragraph(t, S[st]))
    SP = lambda h=6: s.append(Spacer(1, h))

    # ============================================== cover
    SP(40)
    P("RETROSPECTIVE &amp; STUDY GUIDE", "eyebrow")
    P("Deploying SmartProperty to Azure", "title")
    P("What was built, what broke, and how it maps to the AZ-400 "
      "DevOps Engineer Expert certification", "subtitle")
    SP(14)
    s.append(table([
        ["Live site", "https://smartproperties.tech"],
        ["API", "ca-smartproperty-api2...italynorth.azurecontainerapps.io"],
        ["Stack", "NestJS  |  React + Vite  |  FastAPI  |  MongoDB"],
        ["Commits", "22, on branch chore/dead-code-cleanup"],
        ["Net change", "65 files, +5,921 / -45,706 lines"],
        ["Monthly cost", "approx. USD 5 against a USD 100 student credit"],
    ], [95, F - 95], header=False, zebra=True))
    SP(14)
    s.append(callout(
        "<b>How to read this.</b> Sections 1 to 5 are the engineering record - what was "
        "changed and why. Section 6 maps that work onto the five AZ-400 exam domains and, "
        "more usefully, lists what this project did <i>not</i> exercise. Section 7 turns those "
        "gaps into a study plan. The failures in section 5 are the most transferable part: "
        "almost none of them were code defects.", "accent"))

    # ============================================== 1
    s.append(PageBreak())
    P("1. What the project started as", "h1")
    P("SmartProperty is a property-management platform: a NestJS REST API, a React single-page "
      "frontend built with Vite, a FastAPI service for AI features, and MongoDB for storage. "
      "Everything ran locally through Docker Compose. Nothing was deployed, and the work began "
      "as a security review rather than a deployment exercise.", "body")
    P("Three findings reframed it:", "body")
    s.append(table([
        ["Finding", "Detail"],
        ["<b>Rate limiting was inert</b>",
         "ThrottlerModule was configured and five auth routes carried @Throttle decorators, but no "
         "APP_GUARD registered ThrottlerGuard. In NestJS the decorators do nothing without it, so "
         "login accepted unlimited attempts. The protection existed in code review and not at runtime."],
        ["<b>Secrets were in public history</b>",
         "Google OAuth, Facebook app secret, reCAPTCHA secret and SendGrid keys were committed and "
         "readable across 18 commits in a public repository."],
        ["<b>The frontend had never built</b>",
         "npm run build failed on 12 TypeScript errors, which masked a second failure: minify was "
         "set to esbuild, a package never present in any lockfile."],
    ], [118, F - 118]))
    SP(8)
    s.append(callout(
        "<b>The transferable lesson.</b> All three were invisible from reading the code. "
        "Configuration that looks present but is never wired up, and a build that no one has run, "
        "both pass review. Verification has to execute, not inspect.", "warn"))

    # ============================================== 2
    P("2. Architecture as deployed", "h1")
    s.append(architecture_diagram())
    SP(8)
    P("Every component below was chosen under a constraint rather than freely, which is the part "
      "worth understanding.", "body")
    s.append(table([
        ["Component", "Choice", "Why this and not the obvious option"],
        ["API", "Azure Container Apps",
         "Runs the container without operating Kubernetes. Consumption billing with an idle rate."],
        ["Frontend", "Blob Storage static website",
         "Azure Static Web Apps exists in five regions worldwide and the subscription policy permits "
         "none of them."],
        ["Database", "MongoDB Atlas M0",
         "Cosmos DB's RU API needs an index for every sorted field; the backend has 42 sorted queries "
         "and one endpoint that sorts on user input. The vCore tier has no such limit but its free "
         "tier is unavailable in any permitted region."],
        ["Object storage", "Cloudflare R2",
         "Speaks the S3 API, so the existing MinIO client was reused rather than rewritten. Free to 10 GB."],
        ["TLS / DNS", "Cloudflare",
         "Blob static websites cannot serve a certificate for a custom domain, and Azure's answer - "
         "Front Door - costs about USD 35/month."],
        ["Registry", "GitHub Container Registry",
         "Free. Azure Container Registry Basic is USD 5/month for the same job at this scale."],
        ["Queue / cache", "<b>Removed entirely</b>",
         "BullModule was configured but no queue was ever registered. Deploying Redis would have cost "
         "about USD 16/month to serve nothing."],
    ], [58, 78, F - 136]))
    SP(8)
    s.append(callout(
        "<b>The single largest saving came from deleting infrastructure, not provisioning it.</b> "
        "Redis was in the compose file, so the obvious move was to deploy it. Reading the code showed "
        "no queue was ever registered. That is judgement, and it is what distinguishes running "
        "commands from understanding a system.", "ok"))

    # ============================================== 3
    s.append(PageBreak())
    P("3. The work, in five phases", "h1")

    P("Phase 1 - Security hardening", "h2")
    P("Registered ThrottlerGuard globally so the existing limits took effect. Removed hard-coded JWT "
      "fallback secrets from five files - the most serious in auth.module.ts, which was the "
      "<i>signing</i> key, meaning anyone who had read the repository could mint valid tokens. "
      "Disabled debug logging in production, closed an origin-less CORS hole, and made the seed "
      "password refuse to run outside development without SEED_PASSWORD.", "body")

    P("Phase 2 - Removing what was not used", "h2")
    P("Deleted 35 dependencies with zero imports: the entire GraphQL stack (no GraphQLModule was ever "
      "registered), Bull and Redis, a redundant AWS S3 client, and 11 Radix packages whose UI "
      "components turned out to be hand-written. Dependency advisories fell from 54 to 27 on the "
      "frontend and 95 to 86 on the backend purely by deletion. Also fixed the 12 TypeScript errors "
      "and the minifier setting, so the production build succeeded for the first time.", "body")

    P("Phase 3 - Infrastructure as code", "h2")
    P("Wrote infra/main.bicep declaring Log Analytics, a Container Apps environment, the API, the "
      "database and the storage account, plus a four-stage GitHub Actions workflow. The template "
      "creates the database and passes its own connection string to the container using "
      "listConnectionStrings() and listKeys(), which ARM resolves at deployment time - so no database "
      "credential is ever typed by hand or stored in CI. Required secrets dropped from ten to six.", "body")
    SP(3)
    s.append(pipeline_diagram())
    SP(6)

    P("Phase 4 - Deployment", "h2")
    P("Resource group, then az deployment group what-if to validate server-side without creating "
      "anything, then create. Five resources in 2m26s. The application then crash-looped for about an "
      "hour for reasons covered in section 5.", "body")

    P("Phase 5 - Domain and storage", "h2")
    P("Moved DNS to Cloudflare, which terminates TLS and rewrites the Host header toward the storage "
      "endpoint. Connected Cloudflare R2 for uploads by adding two settings to the existing S3 client. "
      "Finally corrected seeded image URLs that pointed at localhost.", "body")

    # ============================================== 4
    P("4. Cost model", "h1")
    s.append(table([
        ["Component", "Service", "Monthly (USD)"],
        ["Frontend", "Blob Storage static website + Cloudflare", "~0.05"],
        ["API", "Container Apps, 1 replica warm", "~3 - 5"],
        ["Database", "MongoDB Atlas M0", "0.00"],
        ["Object storage", "Cloudflare R2 (under 10 GB)", "0.00"],
        ["Logs", "Log Analytics (5 GB/month free)", "0.00"],
        ["Registry", "GitHub Container Registry", "0.00"],
        ["<b>Total</b>", "", "<b>~5</b>"],
    ], [92, F - 172, 80]))
    SP(6)
    P("The binding constraint is time, not money: Azure for Students credit expires twelve months "
      "after activation regardless of the balance. At this rate the credit outlives its own expiry, "
      "so running the API warm rather than scaling to zero is the correct trade - a reviewer waiting "
      "twenty seconds for a cold start is a worse outcome than spending five dollars.", "small")

    # ============================================== 5
    s.append(PageBreak())
    P("5. Every failure, and what caused it", "h1")
    P("Twelve distinct failures occurred. Two were application defects. The rest were platform "
      "constraints, propagation delays, or tooling that reported success while measuring the wrong "
      "thing. This distribution is itself the lesson.", "body")
    s.append(table([
        ["#", "Symptom", "Actual cause", "Class"],
        ["1", "Deployment validation failed with a policy violation",
         "Subscription restricts resources to five regions; neither Static Web Apps nor the Cosmos "
         "vCore free tier exists in any of them", "Governance"],
        ["2", "az ad app create - insufficient privileges",
         "Tenant blocks app registration for student accounts, so no service principal and therefore "
         "no automated Azure deployment at all", "Governance"],
        ["3", "Cannot make container package public",
         "Organization disables public package visibility; registry credentials had to be passed to "
         "Container Apps instead", "Governance"],
        ["4", "Image build failed at npm install",
         "package.json has a postinstall hook, and the Dockerfile copied only package.json - not the "
         "scripts directory it runs", "Defect"],
        ["5", "Container crash-looped: CORS_ORIGIN empty",
         "Bicep passed an empty string; the Joi schema rejects it. Fixed by deriving the value from "
         "the storage account created in the same template", "Config"],
        ["6", "az containerapp update rejected",
         "Express environments do not support managed identity, revision suffixes, revision restarts "
         "or custom domains", "Platform"],
        ["7", "Redeploy: 'resource already exists'",
         "Deleting a container app leaves an internal artifact pending for over 15 minutes; worked "
         "around with a name suffix parameter", "Platform"],
        ["8", "Secret updated but app kept old value",
         "Express environments do not restart the container on a secret change. Only scaling "
         "min-replicas to 0 and back works", "Platform"],
        ["9", "MongoServerSelectionError: SSL alert 80",
         "Atlas rejects unlisted client IPs during the TLS handshake, not at authentication, so it "
         "presents as a certificate fault", "Platform"],
        ["10", "Seeding failed: retryable writes unsupported",
         "Cosmos rejects them; TypeORM discards retrywrites=false from the connection string when "
         "building driver options", "Platform"],
        ["11", "Upload returned a URL that 404s",
         "uploadFile built the public URL inline instead of calling getPublicUrl, so the R2 path rule "
         "never applied to uploads", "Defect"],
        ["12", "Every listing image broken",
         "The seed fell back to localhost:5173 for image URLs when run against production", "Config"],
    ], [22, 104, F - 218, 60]))
    SP(8)
    s.append(callout(
        "<b>Three times my own tooling lied.</b> Piping docker build through tail reported tail's exit "
        "code, so a failed build looked successful. A curl loop checking only the exit status reported "
        "an API as healthy while it returned 404. A silent str.replace left a workflow half-migrated. "
        "In each case the command succeeded - it just measured the wrong thing. Verify the assertion "
        "you actually care about: an HTTP status code, not a process exit code.", "crit"))

    # ============================================== 6
    s.append(PageBreak())
    P("6. Mapping to AZ-400", "h1")
    P("AZ-400 (Designing and Implementing Microsoft DevOps Solutions) has five skill areas. Below is "
      "an honest assessment: what this project exercised, and what it did not. The second column "
      "matters more than the first, because gaps are where study time belongs.", "body")

    P("Domain 1 - Configure processes and communications (10-15%)", "h2")
    s.append(table([
        ["Covered here", "Not covered - study these"],
        ["Documenting decisions and their rationale in commit messages and a maintained README; "
         "capturing operational knowledge such as the replica-cycling workaround so it is not "
         "rediscovered.",
         "Azure Boards work items, backlogs and sprints; dashboards and team analytics; wikis; "
         "notification and service-hook integrations; defining and measuring DORA metrics "
         "(deployment frequency, lead time, change failure rate, MTTR)."],
    ], [F / 2 - 4, F / 2 - 4]))

    P("Domain 2 - Design and implement source control (15-20%)", "h2")
    s.append(table([
        ["Covered here", "Not covered - study these"],
        ["Feature-branch workflow; small focused commits with explanatory messages; responding to "
         "automated code review across five rounds; .gitignore hygiene and removing tracked secrets "
         "from the index.",
         "Azure Repos specifically; branch policies and required reviewers; <b>purging secrets from "
         "history with git filter-repo</b> (still outstanding here); Git LFS; monorepo versus "
         "multi-repo strategy; fork-based workflows and release branching models."],
    ], [F / 2 - 4, F / 2 - 4]))

    P("Domain 3 - Design and implement build and release pipelines (50-55%)", "h2")
    P("This is over half the exam. It is also where this project is thinnest, because the tenant "
      "blocked the credential that automated deployment requires.", "small")
    s.append(table([
        ["Covered here", "Not covered - study these"],
        ["Multi-stage pipeline with job dependencies and outputs; multi-stage Dockerfile with a "
         "runtime-only dependency stage and a non-root user; container registry authentication; "
         "deploying by image digest rather than a mutable tag; a smoke test that fails the pipeline "
         "and dumps logs; infrastructure as code in Bicep, validated with what-if before applying.",
         "<b>Azure Pipelines YAML</b> - the exam's primary vehicle, not GitHub Actions; self-hosted "
         "agents and agent pools; Azure Artifacts feeds and package versioning; deployment strategies "
         "(blue-green, canary, rolling); <b>release gates and approvals</b>; environments and "
         "deployment jobs; feature flags; database deployment and migration strategy; testing in the "
         "pipeline - unit, integration and load."],
    ], [F / 2 - 4, F / 2 - 4]))

    P("Domain 4 - Develop a security and compliance plan (10-15%)", "h2")
    s.append(table([
        ["Covered here", "Not covered - study these"],
        ["OIDC federated credentials designed in - short-lived tokens rather than a stored secret - "
         "with the role assignment scoped to one resource group; secrets injected as container "
         "secrets and never written into the template; dependency scanning via npm audit, with 35 "
         "unused packages removed; least-privilege API tokens scoped to a single bucket; "
         "secure-by-default configuration that refuses to start when misconfigured.",
         "<b>Azure Key Vault</b> and pipeline integration; managed identities (blocked by the express "
         "environment here); Microsoft Defender for Cloud; Azure Policy authoring - this project was "
         "on the receiving end of one, not the author; SAST/DAST tooling; container image scanning; "
         "compliance frameworks and audit reporting; <b>credential rotation</b> - identified here, "
         "still outstanding."],
    ], [F / 2 - 4, F / 2 - 4]))

    P("Domain 5 - Implement an instrumentation strategy (5-10%)", "h2")
    s.append(table([
        ["Covered here", "Not covered - study these"],
        ["Log Analytics workspace wired to the Container Apps environment; querying container logs "
         "with KQL to diagnose crash loops; health probes - readiness and liveness - driving "
         "container lifecycle; a build-time budget cap on the database to prevent silent overrun.",
         "<b>Application Insights</b> - instrumentation, distributed tracing, dependency tracking; "
         "custom metrics and alert rules; availability tests; KQL beyond basic filtering; dashboards "
         "and workbooks; log-based alerting and action groups; cost analysis and budget alerts "
         "(recommended here but never configured)."],
    ], [F / 2 - 4, F / 2 - 4]))

    # ============================================== 7
    s.append(PageBreak())
    P("7. Study plan", "h1")
    P("Ordered by exam weight against current gaps. The first item is by far the largest.", "body")
    s.append(table([
        ["Priority", "Topic", "Why, and a concrete exercise"],
        ["1", "<b>Azure Pipelines YAML</b>",
         "Over half the exam and entirely unexercised here, since this project used GitHub Actions. "
         "Rebuild this same deployment as azure-pipelines.yml with stages, environments and an "
         "approval gate before the deploy stage."],
        ["2", "Deployment strategies",
         "Blue-green, canary and rolling deployments. Container Apps supports traffic splitting "
         "across revisions natively - split 90/10 between two revisions and shift the weight."],
        ["3", "Azure Key Vault",
         "Container App secrets were used here; Key Vault with a managed identity is the pattern the "
         "exam expects. Move JWT secrets into Key Vault and reference them."],
        ["4", "Application Insights",
         "Instrumentation is a whole domain and only Log Analytics was touched. Add the Node SDK, "
         "generate traffic, then read a distributed trace end to end."],
        ["5", "Azure Artifacts",
         "Package feeds and versioning were never exercised. Publish the backend as a private npm "
         "package and consume it from a pipeline."],
        ["6", "Azure Boards",
         "Work item tracking and its links to commits and pull requests. Create a board and link "
         "these 22 commits to work items."],
        ["7", "Azure Policy authoring",
         "This project was <i>subject</i> to an allowed-regions policy. Write one - restrict allowed "
         "SKUs in a resource group and watch a deployment fail against it."],
        ["8", "git filter-repo",
         "Still genuinely outstanding on this repository. Practise purging a secret from history in a "
         "clone before doing it for real."],
    ], [38, 96, F - 134]))
    SP(10)

    P("Outstanding on this project", "h1")
    s.append(table([
        ["Item", "Status"],
        ["Rotate the four credentials leaked in git history",
         "<b>Outstanding</b> - Google OAuth, Facebook, reCAPTCHA, SendGrid remain readable in public history"],
        ["Rotate the credentials shared during this work",
         "<b>Outstanding</b> - the Atlas password still authenticated when last checked"],
        ["Purge secrets from git history (git filter-repo)",
         "Outstanding - must follow rotation, never replace it; requires a coordinated force-push"],
        ["Automated deployment",
         "Blocked - requires an Entra app registration the tenant does not permit for student accounts"],
        ["OAuth callback URLs on the live host",
         "Outstanding - social login will not work until updated"],
        ["Dependency advisories",
         "27 frontend and 86 backend remain; handlebars, react-router and multer are the ones that "
         "matter given what the code does"],
        ["Deep links return HTTP 404",
         "The SPA renders correctly, but crawlers see the wrong status code"],
    ], [150, F - 150]))
    SP(10)
    s.append(callout(
        "<b>The most useful thing to be able to explain.</b> Not that it deployed, but that Redis was "
        "removed after reading the code rather than deployed because a compose file mentioned it; that "
        "five platform constraints were diagnosed from error messages that named none of them; and "
        "that the deployment pipeline holds no long-lived credential. Anyone can follow a tutorial to "
        "a green checkmark. Diagnosing an SSL alert that turns out to be an IP allowlist is the part "
        "that transfers.", "ok"))

    return s


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "deliverables")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "SmartProperty_DevOps_AZ400_Report.pdf")
    build(out)
    print("written:", out)
