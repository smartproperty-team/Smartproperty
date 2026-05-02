# AI Usage Report - SmartProperty

**Project Code:** SmartProperty
**Team Name:** Legends
**Class:** 4TWIN3
**Date:** May 2026
**Application URL:** *(see main README.md)*

---

## 1. Introduction

This document provides a transparent account of how Artificial Intelligence tools were used throughout the development of the SmartProperty platform. In accordance with the evaluation requirements, we detail the tools used, the tasks they assisted with, representative prompts, and the specific LLMs and agents involved.

---

## 2. AI Tools Used

| Tool | Provider | LLM / Model | Usage Period |
|------|----------|-------------|--------------|
| **Claude Code (CLI)** | Anthropic | Claude Opus 4.6 | Throughout project |
| **GitHub Copilot** | GitHub / Microsoft | GPT-4 based | Throughout project |
| **ChatGPT** | OpenAI | GPT-4 / GPT-4o | Occasional use |
| **Claude** (Web) | Anthropic | Claude Sonnet / Opus | Research & planning |

---

## 3. Tasks Where AI Was Leveraged

### 3.1 Code Generation

| Task | Tool Used | Description |
|------|-----------|-------------|
| Backend module scaffolding | GitHub Copilot, Claude Code | Generated NestJS module boilerplate (controllers, services, DTOs) |
| Frontend component creation | GitHub Copilot | Assisted with React component structure, TailwindCSS styling |
| Authentication system | Claude Code | Assisted with JWT + Passport.js implementation, refresh token rotation, session management |
| API endpoint implementation | GitHub Copilot, Claude Code | REST and GraphQL endpoint generation with validation |
| Database entities/schemas | GitHub Copilot | MongoDB/TypeORM entity definitions |

### 3.2 Debugging & Troubleshooting

| Task | Tool Used | Description |
|------|-----------|-------------|
| TypeScript compilation errors | Claude Code, GitHub Copilot | Resolved type mismatches, config deprecations |
| Build failures | Claude Code | Diagnosed Vite build issues, import conflicts |
| Authentication flow bugs | Claude Code | JWT expiration handling, token refresh interceptors |
| Docker networking issues | ChatGPT, Claude | Container communication and port mapping resolution |
| CORS configuration | GitHub Copilot | Cross-origin request handling between frontend and backend |

### 3.3 Performance Optimization

| Task | Tool Used | Description |
|------|-----------|-------------|
| Bundle optimization | Claude Code | Vite manual chunks strategy, reducing main chunk from 1,090 kB to 206 kB |
| Route lazy loading | Claude Code | React.lazy() + Suspense implementation for route splitting |
| Route prefetch utility | Claude Code | Hover/focus-based prefetch for common navigation paths |
| Build configuration | GitHub Copilot | ES2020 target, minification settings |

### 3.4 Accessibility (WCAG Compliance)

| Task | Tool Used | Description |
|------|-----------|-------------|
| Accessibility audit | Claude Code (GitHub Copilot as reviewer) | POUR checklist creation and automated axe-core testing |
| Contrast fixes | Claude Code | Identified and fixed color contrast violations on core pages |
| Keyboard navigation | Claude Code | Skip link implementation, focus management, tab order fixes |
| ARIA improvements | Claude Code | Removed redundant ARIA, added necessary `aria-current`, `aria-expanded` |
| Reduced motion support | Claude Code | Global `prefers-reduced-motion` CSS fallback |

### 3.5 DevOps & Infrastructure

| Task | Tool Used | Description |
|------|-----------|-------------|
| Docker Compose configuration | Claude Code, ChatGPT | Multi-service setup (MongoDB, Redis, MailHog, MinIO, etc.) |
| Kubernetes manifests | Claude Code | Namespace, deployments, services, configmaps, secrets |
| Jenkins CI/CD pipelines | Claude Code | Backend/frontend CI and CD Jenkinsfiles with SonarQube integration |
| Monitoring stack | Claude Code | Prometheus, Grafana, AlertManager Kubernetes deployment |

### 3.6 Documentation

| Task | Tool Used | Description |
|------|-----------|-------------|
| README.md | Claude Code, GitHub Copilot | Project documentation, setup guides, troubleshooting |
| API documentation | GitHub Copilot | Swagger/OpenAPI decorators and descriptions |
| Accessibility checklist | Claude Code | WCAG 2.1 POUR compliance documentation |
| Bundle optimization log | Claude Code | Technical documentation of optimization work |
| Deliverables reports | Claude Code | Performance report, accessibility audit, this AI usage report |

### 3.7 Testing

| Task | Tool Used | Description |
|------|-----------|-------------|
| Unit test scaffolding | GitHub Copilot | Jest/Vitest test structure and assertions |
| E2E test setup | Claude Code | Playwright test configuration for accessibility checks |
| Automated accessibility tests | Claude Code | axe-core contrast checks, keyboard navigation smoke tests |

---

## 4. Representative Prompts

### Code Generation Prompts

**Prompt 1 - Authentication:**
> "Implement a complete JWT authentication system for the NestJS backend with access/refresh token rotation, session management with device tracking, and account lockout after failed attempts"

**Prompt 2 - Component Creation:**
> "Create a property card component in React with TypeScript, using TailwindCSS for styling, that displays property image, title, price, location, and key features with proper accessibility attributes"

### Debugging Prompts

**Prompt 3 - Build Fix:**
> "The Vite build is failing with a large chunk warning over 500KB. Analyze the bundle and implement a manual chunks strategy to split vendor dependencies into logical groups"

**Prompt 4 - TypeScript Error:**
> "Fix TypeScript compilation errors in the frontend build related to deprecated tsconfig options and translation typing conflicts"

### DevOps Prompts

**Prompt 5 - Kubernetes:**
> "Create Kubernetes deployment manifests for the SmartProperty application including namespace, secrets, configmap, and deployments for frontend, backend, MongoDB, Redis, and MinIO with health checks and resource limits"

**Prompt 6 - Monitoring:**
> "Set up a monitoring stack with Prometheus, Grafana, and AlertManager on Kubernetes for the SmartProperty namespace with service discovery and basic alerting rules"

### Accessibility Prompts

**Prompt 7 - WCAG Audit:**
> "Run an accessibility audit on the SmartProperty frontend using axe-core via Playwright. Check color contrast ratios on the home, properties, login, and register pages. Generate a report and fix any violations found"

**Prompt 8 - Keyboard Navigation:**
> "Test keyboard navigation across core pages, check for keyboard traps, verify skip links work, and fix any mobile menu items that remain in tab order when the menu is closed"

### Documentation Prompts

**Prompt 9 - Deliverables:**
> "Create a comprehensive performance report for the SmartProperty application including Lighthouse scores, Core Web Vitals, API benchmarks, and the optimization journey from initial to current state"

---

## 5. LLMs and Agents Specification

### Large Language Models (LLMs)

| Model | Provider | Capabilities Used |
|-------|----------|-------------------|
| **Claude Opus 4.6** | Anthropic | Code generation, debugging, architecture, documentation, multi-file refactoring |
| **Claude Sonnet 4.6** | Anthropic | Quick research, code review, explanations |
| **GPT-4 / GPT-4o** | OpenAI | Code generation, autocomplete, inline suggestions |

### Agents

| Agent | Platform | Role |
|-------|----------|------|
| **Claude Code CLI Agent** | Anthropic (Claude Code) | Full-stack development agent with file system access, terminal execution, and codebase exploration. Used for complex multi-step tasks (architecture, refactoring, DevOps, testing). |
| **GitHub Copilot** | VS Code Extension | Inline code completion agent providing real-time suggestions during development. Used for boilerplate, repetitive patterns, and quick completions. |
| **Claude Code Explore Agent** | Anthropic (Claude Code) | Specialized sub-agent for codebase exploration. Used to search files, understand project structure, and locate code patterns. |
| **Claude Code Plan Agent** | Anthropic (Claude Code) | Specialized sub-agent for implementation planning. Used to design approaches before making changes. |

---

## 6. Critical Assessment of AI Usage

### Where AI Was Most Valuable

1. **DevOps Configuration:** Kubernetes manifests, Docker Compose, and Jenkins pipelines significantly accelerated by AI-generated boilerplate with best practices
2. **Accessibility Compliance:** AI-driven automated testing and systematic issue identification across WCAG criteria saved considerable manual effort
3. **Performance Optimization:** AI analysis of bundle composition and suggestion of chunk splitting strategy led to 81% bundle size reduction
4. **Documentation:** Comprehensive documentation generated efficiently with AI assistance

### Where Human Judgment Was Essential

1. **Architecture Decisions:** Technology choices (NestJS, React, MongoDB) and overall system design required human expertise and project context
2. **Business Logic:** Property management workflows, user roles, and application-specific logic required domain understanding
3. **UI/UX Design:** Visual design, user experience flows, and interaction patterns were human-driven decisions
4. **Security Review:** Final security audit of authentication flows, token handling, and data protection required human verification
5. **Code Review:** All AI-generated code was reviewed, tested, and modified as needed before integration

### Lessons Learned

- AI tools are most effective when given clear, specific context about the project and requirements
- Generated code should always be reviewed and tested, not blindly accepted
- AI excels at boilerplate and patterns but needs human guidance for project-specific decisions
- Using multiple AI tools (Copilot for inline, Claude Code for complex tasks) provides complementary value

---

## 7. Conclusion

AI tools were used extensively and transparently throughout the SmartProperty project. They served as productivity multipliers for code generation, debugging, documentation, and infrastructure setup. However, all critical architectural decisions, business logic, security considerations, and final quality assurance remained under human control. The team views AI as a powerful assistant that enhances developer productivity while requiring responsible oversight and critical evaluation of its outputs.
