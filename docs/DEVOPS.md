# DevOps pipeline

Three workflows, separated so each gives feedback at the speed it can.

| Workflow | Triggers | Purpose |
|---|---|---|
| `ci.yml` | push, PR | Typecheck, test with coverage, build, SonarQube Cloud |
| `security.yml` | push, PR, weekly | Secrets, SAST, dependencies, Dockerfiles, image, SBOM |
| `deploy.yml` | push to `main`, manual | Build and publish image, deploy to Azure, check, roll back on failure |

They are separate on purpose. A container build and scan takes minutes; a
developer waiting on a typecheck should not wait for it. The weekly schedule
on `security.yml` matters more than it looks: most vulnerabilities appear in
code nobody has touched, so a scanner that only runs on push will not find
them.

## Why these tools

| Tool | Catches | Why this one |
|---|---|---|
| **gitleaks** | Credentials in code and history | This repository has leaked four credentials before. It is the single most relevant scanner here. Run as the released binary rather than `gitleaks-action`, which requires a paid licence for organisation-owned repositories. |
| **CodeQL** | Injection, unsafe flows, logic bugs | GitHub-native SAST, free on public repositories, no server to run. Understands data flow rather than matching patterns. |
| **Trivy** | Vulnerable dependencies and OS packages | One tool for filesystem, image and SBOM, so results are consistent. Free and fast. |
| **hadolint** | Dockerfile mistakes | Cheap. Would have caught the missing `scripts/` copy that broke the first image build. |
| **SonarQube Cloud** (formerly SonarCloud) | Code smells, duplication, coverage, hotspots | Free for public repositories, no server to run. Covers quality, which the others do not. Self-hosting SonarQube on Azure means 2 GB of RAM running around the clock plus a PostgreSQL server, roughly $70-85 a month against a $100 credit. |
| **Dependabot** | Outdated dependencies | Turns a backlog of 113 advisories into small reviewable pull requests instead of one large upgrade later. |

Everything writes **SARIF** and uploads to GitHub code scanning, so findings
appear in **Security → Code scanning** and as inline annotations on pull
requests. Scanners that only print to a job log get ignored.

## Failure policy

`SECURITY_FAIL_ON` is `CRITICAL`. Scanners report everything but only critical
findings fail the build.

This is deliberate. The repository carries a backlog of HIGH advisories in
transitive dependencies. Failing on HIGH from day one would make every push
red, and a pipeline that is always red gets ignored or disabled — worse than a
lower gate honestly set. Tighten to `CRITICAL,HIGH` in `security.yml` once
Dependabot has worked the backlog down.

The secrets job is stricter: history findings are reported, but a secret
**introduced by the current push** fails the build outright. That asymmetry is
intentional — history needs a coordinated rewrite, a new leak needs stopping
now.

## Setup

### SonarQube Cloud (one-time, ~10 minutes)

1. Sign in at **https://sonarcloud.io** with GitHub
2. **+ → Analyze new project → Import an organization** → pick
   `smartproperty-team`. This installs the SonarQube Cloud app on the GitHub
   organisation, so it needs an **organisation owner** — ask one if you are
   not.
3. Keep the SonarQube Cloud organisation key as `smartproperty-team`, choose
   the **Free** plan, then select the `Smartproperty` repository
4. **Administration → Analysis Method**: turn *Automatic Analysis* **off**.
   It conflicts with the CI scan, and it cannot read coverage anyway.
5. On the same page, choose **GitHub Actions**. It shows a `SONAR_TOKEN`.
6. Repository **Settings → Secrets and variables → Actions → New repository
   secret**, name `SONAR_TOKEN`
7. Confirm the organisation and project key in `sonar-project.properties`
   match what SonarQube Cloud created (`smartproperty-team_Smartproperty`)
8. Open a pull request into `main`, or push to `main`. The dashboard fills
   in after the first run.

**Free plan scope.** SonarQube Cloud's Free plan analyses `main` and pull
requests into `main` only. A push to any other branch is accepted, but its
results cannot be read back, so the CI job skips those pushes and says so in
the run summary. Work on a branch, open a pull request, and the report
appears on the pull request.

Until `SONAR_TOKEN` exists the Sonar job skips itself and reports why, rather
than failing.

**Quality gate.** A separate step reads the gate result and reports it in
the run summary. A failing gate does not fail the build yet, but a scan that
fails to run always does. The default gate
wants 80% coverage on new code, and the project is far from that. Blocking
now would turn every push red. Once coverage has caught up, set the
repository **variable** (not secret) `SONAR_GATE_BLOCKING` to `true` to
enforce it. No code change is needed.

**Local SonarQube.** `docker compose up -d sonarqube` starts a self-hosted
server on http://localhost:9092 for the Jenkins pipelines
(`Jenkinsfile.*-ci`). It is useful for learning the server side: quality
profiles, custom gates, webhooks. The GitHub pipeline does not use it.

### Everything else

No setup. CodeQL, Trivy, gitleaks, hadolint and Dependabot need no accounts or
tokens on a public repository.

To enable Dependabot alerts as well as its pull requests: **Settings → Code
security → Dependabot alerts**.

## Monitoring

Production is watched from outside and from inside, all defined in
`infra/monitoring.bicep` and checked by CI with the other templates:
an availability test on the API from outside Azure, alerts on downtime,
restarts, memory and bursts of logged errors, email
to the on-call address, and the *SmartProperty operations* workbook with a
deploy history built from each container start. The alert list, thresholds
and cost (about $2.40 a month) are in `infra/README.md`, "Monitoring"; the
whole system's cost, sized to last the student credit, is under "Cost".

## ai-services is switched off

The Python AI service is not deployed and not analysed. It powers
description generation, price prediction, virtual staging, virtual tour
generation, best-match recommendations and document fraud checks. With it
off:

| Where | What happens |
|---|---|
| Backend | `AI_SERVICE_ENABLED` defaults to `false`. AI routes answer 503 *AI features are disabled* without trying to reach the service. Verification uploads still work; their fraud check is recorded as *not run*. |
| Frontend | AI buttons and panels are hidden unless the build sets `VITE_ENABLE_AI_FEATURES=true`. The home page shows the regular listings instead of best matches. |
| Analysis | Left out of SonarQube Cloud, CodeQL, Trivy, hadolint and Dependabot. |
| Local Docker | `docker compose up` does not start it. |

To bring it back:

1. Set `AI_SERVICE_ENABLED=true` and `AI_SERVICE_URL` on the backend
2. Build the frontend with `VITE_ENABLE_AI_FEATURES=true`
3. Locally: `docker compose --profile ai up`
4. Put `ai-services/app` and `ai-services/tests` back in
   `sonar-project.properties`, add `python` back to the CodeQL matrix and
   `ai-services/Dockerfile` to the hadolint matrix in `security.yml`, remove
   `ai-services` from Trivy's `skip-dirs`, and restore the pip and docker
   entries in `dependabot.yml`
5. Set `JWT_SECRET` and `FRAUD_ALLOWED_HOSTS` on the service. Both fail
   closed when unset.

## What is not automated, and why

**Infrastructure changes.** `deploy.yml` ships new builds but does not apply
`infra/main.bicep`: production has drifted from the template (MongoDB Atlas,
R2 storage), so applying it would overwrite live settings. Infrastructure is
changed by hand until the template is brought back in line.

Deployment itself is automated. This tenant does not let student accounts
create an Entra app registration, which the usual OIDC recipe needs, so the
federated credential sits on a user-assigned managed identity instead. It
trusts only jobs in the repository's `production` environment and holds three
narrowly scoped roles. See "Continuous deployment" in `infra/README.md`.

## Worth adding next

Ordered by value for this project:

1. **Branch protection on `main`** — require CI and Security to pass before
   merge. Without it the pipeline is advisory. Settings → Branches → Add rule.
2. **`cosign` image signing** — sign the image in CI and verify before
   deployment, so the thing that runs is provably the thing that was built.
   The natural next supply-chain step now that deployment is automated.
3. **OWASP ZAP baseline scan** — DAST against the running site, complementing
   CodeQL's static view. Scheduled rather than per-push.
4. **Playwright smoke tests** — one end-to-end journey (log in, open a
   listing) gives more deployment confidence than any unit test here.
5. **Terraform or Bicep what-if in CI** — comment the infrastructure plan on
   pull requests so changes are reviewable before they are applied.
