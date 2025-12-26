# Cardomat Security Guidelines

**Repository:** `kipuris/cardomat`  
**URL:** https://github.com/kipuris/cardomat

> _Note: The current `README.md` contains minimal content (`"hi"`), while the reported repository structure suggests a much larger codebase (17 directories, 46 files). This document provides security guidance based on the inferred scope and standard best practices._

## 1. Project Overview & Immediate Actions

- **Clarify Project Purpose**  
  Populate `README.md` with:
  - A concise description of Cardomat’s core functionality (e.g., automated card intake, validation, payment integration).  
  - High-level architecture diagram or overview.  
  - Quick start instructions (setup, build, run).

- **Define Key Components**  
  Create a top-level section or CONOPS document listing:
  - API Layer (endpoints for card enrollment, transactions, status checks).  
  - Core Business Logic (validation, processing rules).  
  - Data Access Layer (database schemas, persistence strategies).  
  - UI/Management Console modules (dashboards, reporting).

## 2. Authentication & Access Control

- **Robust Authentication**  
  - Use secure, salted password hashing (bcrypt or Argon2).  
  - Enforce strong password policies: minimum length, complexity, rotation.
- **Session Management & JWT**  
  - If using sessions, generate unpredictable session IDs, set idle and absolute timeouts.  
  - If using JWT, avoid `none` algorithm, validate signature, check `exp` and `nbf` claims.
- **Role-Based Access Control (RBAC)**  
  - Define roles (e.g., Admin, Operator, Auditor) and permissions in a centralized policy.  
  - Enforce server-side authorization on every endpoint.
- **Multi-Factor Authentication (MFA)**  
  - Add optional MFA (e.g., TOTP, SMS/email) for high-privilege accounts.

## 3. Input Handling & Processing

- **Server-Side Validation**  
  - Treat all incoming data as untrusted.  
  - Implement strict schema validation (JSON Schema, protobuf) for API payloads.
- **Prevent Injection Attacks**  
  - Use parameterized queries or ORM prepared statements.  
  - Sanitize and whitelist input values (e.g., card numbers, customer names).
- **File Upload Hardening**  
  - If supporting file-based card data imports, validate file type/size.  
  - Store uploads outside webroot or with restricted permissions, scan for malware.
- **Output Encoding**  
  - Encode all user-supplied data in HTML contexts (CSP, templating engines).

## 4. Data Protection & Privacy

- **Encryption in Transit & At Rest**  
  - Enforce TLS 1.2+ for all service communication and external integrations.  
  - Encrypt sensitive fields (card numbers, PII) in the database using AES-256.
- **Secrets Management**  
  - Remove hard-coded credentials; store API keys and database passwords in a secrets manager (Vault, AWS Secrets Manager).
- **PII Handling**  
  - Mask or tokenise card data in logs and dashboards.  
  - Adhere to GDPR/CCPA requirements for storage and deletion.

## 5. API & Service Security

- **HTTPS Only**  
  - Redirect all HTTP requests to HTTPS; use HSTS.
- **Rate Limiting & Throttling**  
  - Implement request quotas per IP or user to prevent abuse and brute-force attacks.
- **CORS Policy**  
  - Restrict `Access-Control-Allow-Origin` to approved client domains.
- **API Versioning**  
  - Prefix endpoints with `/v1/`, `/v2/`, etc., to manage breaking changes securely.
- **Least Privilege for Service Accounts**  
  - Grant each microservice or worker only the database/API permissions it needs.

## 6. Web Application Security Hygiene

- **CSRF Protection**  
  - Use synchronizer tokens (double submit cookie pattern) on all state-changing forms and AJAX calls.
- **Security Headers**  
  - Content-Security-Policy: restrict script and style sources.  
  - X-Frame-Options: `DENY` or `SAMEORIGIN`.  
  - X-Content-Type-Options: `nosniff`.  
  - Referrer-Policy: `strict-origin-when-cross-origin`.
- **Secure Cookies**  
  - Set `HttpOnly`, `Secure`, and `SameSite=Strict` on session or auth cookies.

## 7. Infrastructure & Configuration

- **Hardened Server Configurations**  
  - Disable unused ports and services.  
  - Enforce OS-level firewall rules.
- **TLS/SSL Best Practices**  
  - Disable SSLv3/TLS1.0/1.1; prefer TLS1.3.  
  - Use strong cipher suites (ECDHE, AES-GCM).
- **Configuration Management**  
  - Version-control non-secret config in a secure repo; use environment-specific overrides.

## 8. Dependency Management & CI/CD

- **Secure Dependencies**  
  - Vet third-party libraries; prefer actively maintained packages.  
  - Use lockfiles (`package-lock.json`, `Pipfile.lock`) to ensure reproducible builds.
- **Automated Vulnerability Scanning**  
  - Integrate SCA tools (Dependabot, Snyk) into CI pipeline.
- **Continuous Integration & Delivery**  
  - Enforce static analysis, unit tests, and security linting on every PR.  
  - Automate deployments to staging with automated rollback on failure.

## 9. Documentation & Next Steps

1. **Expand `README.md`** with security policies and setup instructions.  
2. **Publish Architecture Diagrams** showing data flows and trust boundaries.  
3. **Define a Security Checklist** for each release, covering the controls above.  
4. **Conduct Threat Modeling Workshops** early in each major feature cycle.  
5. **Schedule Regular Security Reviews** (code, dependencies, infra) and pentests.

---
*Security by Design, Least Privilege, and Defense in Depth are the guiding principles for Cardomat’s ongoing development.*