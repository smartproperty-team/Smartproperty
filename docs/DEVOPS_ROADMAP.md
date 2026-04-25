# SmartProperty - DevOps Complete Roadmap & Checklist

> **Starting point**: MongoDB, Mongo Express, MinIO, MailHog running in Docker Desktop.
> Backend (NestJS) and Frontend (React/Vite) run locally (not yet containerized in CI).
> Everything else is built from scratch.

---

## Current State

| Component          | Status  | How it runs                    |
|--------------------|---------|--------------------------------|
| MongoDB 7.0        | Running | Docker Desktop (port 27017)    |
| Mongo Express      | Running | Docker Desktop (port 8081)     |
| MinIO              | Running | Docker Desktop (port 9000/9001)|
| MailHog            | Running | Docker Desktop (port 1025/8025)|
| Backend (NestJS)   | Dev     | Runs locally (`npm run start:dev`), Dockerfile exists |
| Frontend (React)   | Dev     | Runs locally (`npm run dev`), Dockerfile + nginx.conf exist |
| Jenkins            | None    | Not installed yet              |
| SonarQube          | None    | Not installed yet              |
| Kubernetes         | None    | Not set up yet                 |
| Monitoring         | None    | Not set up yet                 |

---

## Deliverables Summary

| # | Part                  | What is Required                                              |
|---|-----------------------|---------------------------------------------------------------|
| 1 | **CI/CD Pipelines**   | 4 pipelines: CI-Back, CI-Front, CD-Back, CD-Front. CD auto-triggers after CI. Unit tests integrated. |
| 2 | **SonarQube**         | Code quality tracking. Before/after screenshots. Test coverage visible. |
| 3 | **Kubernetes**        | Distributed architecture with kubeadm. Same virtualization for all members. |
| 4 | **Monitoring**        | Monitor DevOps tools + apps. AlertManager integration.        |
| 5 | **Excellence**        | 2-3 bonus points for extra tools/features not seen in class.  |

---

## Phase 1 — Jenkins + SonarQube Setup (Infrastructure)

### 1.1 Install Jenkins as a Docker Container

- [ ] Add Jenkins to `docker-compose.yml`:
  ```yaml
  jenkins:
    image: jenkins/jenkins:lts
    container_name: smartproperty-jenkins
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_data:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - smartproperty-network
  ```
- [ ] Start Jenkins: `docker compose up -d jenkins`
- [ ] Get initial admin password: `docker exec smartproperty-jenkins cat /var/jenkins_home/secrets/initialAdminPassword`
- [ ] Open `http://localhost:8080`, complete setup wizard
- [ ] Install required plugins:
  - [ ] NodeJS Plugin
  - [ ] Docker Pipeline
  - [ ] SonarQube Scanner
  - [ ] Pipeline
  - [ ] Git
  - [ ] Blue Ocean (optional, nice UI)
- [ ] Configure tools in Jenkins (Manage Jenkins > Tools):
  - [ ] Add NodeJS installation (v20)
  - [ ] Add SonarQube Scanner installation

### 1.2 Install SonarQube as a Docker Container

- [ ] Add SonarQube to `docker-compose.yml`:
  ```yaml
  sonarqube:
    image: sonarqube:lts-community
    container_name: smartproperty-sonarqube
    ports:
      - "9092:9000"
    environment:
      SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: "true"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    networks:
      - smartproperty-network
  ```
- [ ] Start SonarQube: `docker compose up -d sonarqube`
- [ ] Open `http://localhost:9092`, login with `admin/admin`, change password
- [ ] Create two projects:
  - [ ] `smartproperty-backend`
  - [ ] `smartproperty-frontend`
- [ ] Generate authentication tokens for each project
- [ ] In Jenkins: configure SonarQube server (Manage Jenkins > System > SonarQube servers)
  - [ ] URL: `http://sonarqube:9000` (Docker internal network)
  - [ ] Add token as credential

### 1.3 Connect Jenkins to your Git Repo

- [ ] Add GitHub credentials in Jenkins (username + personal access token)
- [ ] Create a webhook in GitHub repo -> Settings -> Webhooks (or use polling)
- [ ] Verify Jenkins can pull the repo

---

## Phase 2 — CI Pipelines (2 Pipelines)

### 2.1 Backend CI Pipeline (`Jenkinsfile.backend-ci`)

- [ ] Create `Jenkinsfile.backend-ci` at project root
- [ ] Pipeline stages:
  1. **Checkout** — pull code from Git
  2. **Install Dependencies** — `cd backend && npm install`
  3. **Lint** — `npm run lint` (if available)
  4. **Run Unit Tests with Coverage** — `npm run test:cov`
  5. **SonarQube Analysis** — run sonar-scanner with coverage report
  6. **Quality Gate** — wait for SonarQube quality gate result
- [ ] Configure `sonar-project.properties` for backend:
  ```properties
  sonar.projectKey=smartproperty-backend
  sonar.sources=src
  sonar.tests=src
  sonar.test.inclusions=**/*.spec.ts
  sonar.exclusions=**/node_modules/**
  sonar.javascript.lcov.reportPaths=coverage/lcov.info
  ```
- [ ] Create Jenkins Pipeline job "SmartProperty-Backend-CI"
- [ ] Trigger: on push to `main` or PR (poll SCM or webhook)
- [ ] Verify pipeline runs green

### 2.2 Frontend CI Pipeline (`Jenkinsfile.frontend-ci`)

- [ ] Create `Jenkinsfile.frontend-ci` at project root
- [ ] Pipeline stages:
  1. **Checkout** — pull code from Git
  2. **Install Dependencies** — `cd frontend && npm install`
  3. **Lint** — `npm run lint` (if available)
  4. **Run Unit Tests with Coverage** — `npm run test:cov`
  5. **SonarQube Analysis** — run sonar-scanner with coverage report
  6. **Quality Gate** — wait for SonarQube quality gate result
- [ ] Configure `sonar-project.properties` for frontend (or inline in Jenkinsfile):
  ```properties
  sonar.projectKey=smartproperty-frontend
  sonar.sources=src
  sonar.tests=src
  sonar.test.inclusions=**/*.test.ts,**/*.test.tsx
  sonar.exclusions=**/node_modules/**
  sonar.javascript.lcov.reportPaths=coverage/lcov.info
  ```
- [ ] Create Jenkins Pipeline job "SmartProperty-Frontend-CI"
- [ ] Trigger: on push to `main` or PR
- [ ] Verify pipeline runs green

### 2.3 Unit Tests (Each team member)

- [ ] **Each student**: write tests for your own module/tickets
- [ ] Backend tests: `*.spec.ts` files using Jest
- [ ] Frontend tests: `*.test.ts` / `*.test.tsx` files using Vitest
- [ ] Tests must be integrated into CI pipelines (already done in stages above)
- [ ] Coverage must appear in SonarQube

---

## Phase 3 — CD Pipelines (2 Pipelines)

### 3.1 Backend CD Pipeline (`Jenkinsfile.backend-cd`)

- [ ] Create `Jenkinsfile.backend-cd` at project root
- [ ] **Trigger**: automatically after Backend CI succeeds (use `upstream` trigger or `build job`)
- [ ] Pipeline stages:
  1. **Checkout**
  2. **Build Docker Image** — `docker build -t smartproperty-backend:latest --target prod ./backend`
  3. **Tag Image** — `smartproperty-backend:${BUILD_NUMBER}`
  4. **Push to Registry** — Docker Hub or private registry
  5. **Deploy to Kubernetes** — `kubectl set image deployment/backend ...` or `kubectl apply`
- [ ] Verify: new image is deployed and running

### 3.2 Frontend CD Pipeline (`Jenkinsfile.frontend-cd`)

- [ ] Create `Jenkinsfile.frontend-cd` at project root
- [ ] **Trigger**: automatically after Frontend CI succeeds
- [ ] Pipeline stages:
  1. **Checkout**
  2. **Build Docker Image** — `docker build -t smartproperty-frontend:latest --target prod ./frontend`
  3. **Tag Image** — `smartproperty-frontend:${BUILD_NUMBER}`
  4. **Push to Registry**
  5. **Deploy to Kubernetes** — `kubectl set image` or `kubectl apply`
- [ ] Verify: new image is deployed and running

### 3.3 CI -> CD Auto-Trigger

- [ ] Option A: In CI Jenkinsfile, add final stage `build job: 'SmartProperty-Backend-CD'`
- [ ] Option B: Use Jenkins "Build after other projects" trigger in CD job config
- [ ] Verify: pushing code triggers CI -> on success -> auto-triggers CD

---

## Phase 4 — SonarQube Quality Tracking

- [ ] **Before refactoring**: take screenshots of SonarQube dashboard showing:
  - [ ] Bugs count
  - [ ] Code smells
  - [ ] Coverage percentage
  - [ ] Duplications
  - [ ] Quality gate status (probably failing)
- [ ] **Refactor code** to fix issues flagged by SonarQube
- [ ] **After refactoring**: take screenshots showing improvements
- [ ] **Deliverable**: before vs. after comparison document
- [ ] Ensure test coverage percentage is visible in SonarQube

---

## Phase 5 — Kubernetes with kubeadm

### 5.1 Environment Setup (Team Decision Required First)

- [ ] **All members agree on**: VirtualBox / VMware / Hyper-V (pick one)
- [ ] **Provision VMs** (minimum):
  - [ ] 1x Master node — 2 CPU, 2GB RAM, Ubuntu 22.04
  - [ ] 2x Worker nodes — 2 CPU, 2GB RAM each, Ubuntu 22.04
- [ ] Static IPs on all nodes (e.g., 192.168.56.10/11/12)
- [ ] `/etc/hosts` updated on all nodes
- [ ] SSH access between nodes configured

### 5.2 kubeadm Installation (All Nodes)

- [ ] Disable swap
- [ ] Load kernel modules (`overlay`, `br_netfilter`)
- [ ] Install containerd
- [ ] Install `kubeadm`, `kubelet`, `kubectl`
- [ ] On master: `kubeadm init --pod-network-cidr=10.244.0.0/16`
- [ ] Install CNI (Calico or Flannel)
- [ ] On workers: `kubeadm join ...`
- [ ] Verify: `kubectl get nodes` — all `Ready`

### 5.3 Deploy SmartProperty on K8s

Create `k8s/` directory:

```
k8s/
  namespace.yaml
  secrets.yaml
  configmap.yaml
  mongodb/
    deployment.yaml
    service.yaml
    pvc.yaml
  redis/
    deployment.yaml
    service.yaml
    pvc.yaml
  minio/
    deployment.yaml
    service.yaml
    pvc.yaml
  backend/
    deployment.yaml
    service.yaml
  frontend/
    deployment.yaml
    service.yaml
  ingress.yaml
```

- [ ] Create namespace `smartproperty`
- [ ] Create secrets (DB passwords, JWT, etc.)
- [ ] Create ConfigMap (env vars)
- [ ] Deploy MongoDB + PVC
- [ ] Deploy Redis + PVC
- [ ] Deploy MinIO + PVC
- [ ] Deploy Backend (2 replicas, health checks)
- [ ] Deploy Frontend (2 replicas)
- [ ] Install NGINX Ingress Controller
- [ ] Configure Ingress routing
- [ ] Verify: app works end-to-end on the cluster

---

## Phase 6 — Monitoring + AlertManager

### 6.1 Deploy Prometheus + Grafana

- [ ] Install `kube-prometheus-stack` via Helm (or manual manifests)
- [ ] Verify Prometheus UI accessible
- [ ] Verify Grafana UI accessible (default dashboards loading)

### 6.2 Monitor DevOps Tools

- [ ] Jenkins: install Prometheus plugin, scrape `/prometheus` endpoint
- [ ] SonarQube: enable metrics exporter
- [ ] Grafana dashboards for Jenkins and SonarQube

### 6.3 Monitor Applications

- [ ] Backend: add `prom-client`, expose `/metrics`
- [ ] Frontend: nginx metrics or web-vitals via push gateway
- [ ] MongoDB Exporter (percona/mongodb_exporter)
- [ ] Redis Exporter (oliver006/redis_exporter)
- [ ] Grafana dashboards for each

### 6.4 AlertManager

- [ ] Configure AlertManager (notification via email/Slack)
- [ ] Alert rules:
  - [ ] Pod CrashLoopBackOff
  - [ ] High CPU/Memory
  - [ ] Backend 5xx error rate
  - [ ] Pod restart count
- [ ] Test: trigger an alert, show notification received
- [ ] Screenshot the alert firing

---

## Phase 7 — Excellence (Bonus)

Pick 2-3 from:

| Feature                     | Complexity | Type       |
|-----------------------------|-----------|------------|
| Loki + Promtail (logging)   | Medium    | Group      |
| ArgoCD (GitOps)             | High      | Group      |
| HPA + load testing (k6)    | Medium    | Individual |
| Trivy scan in CI            | Low       | Individual |
| Helm charts                 | Medium    | Individual |
| Network Policies            | Low       | Individual |
| Vault (secrets management)  | High      | Group      |

**Recommended**: Loki (logging) + HPA + Trivy = good spread of complexity.

---

## Execution Order (Step by Step)

```
Step 1  [NOW]     -> Phase 1: Jenkins + SonarQube in Docker
Step 2            -> Phase 2: CI pipelines (backend + frontend)
Step 3            -> Phase 4: SonarQube before/after screenshots
Step 4            -> Phase 5: Kubernetes cluster setup
Step 5            -> Phase 3: CD pipelines (deploy to K8s)
Step 6            -> Phase 6: Monitoring + AlertManager
Step 7            -> Phase 7: Bonus features
Step 8  [FINAL]   -> Documentation + demo preparation
```

---

## Quick Reference — Ports Map

| Service          | Port  | URL                          |
|------------------|-------|------------------------------|
| Backend          | 3000  | http://localhost:3000/api    |
| Frontend         | 5173  | http://localhost:5173        |
| MongoDB          | 27017 | mongodb://localhost:27017    |
| Mongo Express    | 8081  | http://localhost:8081        |
| MinIO API        | 9000  | http://localhost:9000        |
| MinIO Console    | 9001  | http://localhost:9001        |
| MailHog SMTP     | 1025  | smtp://localhost:1025        |
| MailHog UI       | 8025  | http://localhost:8025        |
| Jenkins          | 8080  | http://localhost:8080        |
| SonarQube        | 9092  | http://localhost:9092        |

---

> **Tell me "next" or which step number to start, and I'll give you the exact commands and files to create.**
