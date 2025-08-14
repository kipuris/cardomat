# Project Requirements Document (PRD) for Cardomat

## 1. Project Overview

Cardomat is a web-based platform designed to automate the intake, validation, enrichment, and processing of card data (payment cards, identification cards, membership cards, etc.) at scale. By handling multiple input formats, enforcing configurable business rules, and integrating directly with payment gateways, Cardomat eliminates manual data entry, reduces human error, and accelerates transaction lifecycles. Administrators and internal users interact via a secure dashboard, while partner systems connect through a well-documented RESTful API.

We’re building Cardomat to help businesses and service providers manage high volumes of card-based workflows with minimal intervention. Key success criteria include: 1) reducing manual card-processing time by at least 80%, 2) achieving 99.9% system uptime, 3) meeting industry compliance standards (PCI DSS, GDPR), and 4) enabling new payment or card-format integrations to be developed and deployed within days rather than weeks.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)
- Automated card-data ingestion from file uploads (CSV, JSON, XML) and API calls.  
- Card normalization and validation engine with configurable business-rule pipelines.  
- Payment gateway integration layer (Stripe and Adyen adapters included).  
- Centralized admin console (web dashboard) for monitoring, exception handling, and reporting.  
- Secure RESTful API for card enrollment, transaction submission, and status queries.  
- Role-Based Access Control (RBAC) and audit logging.  
- Documentation: README with setup, API reference, and architecture overview.  
- CI/CD pipeline with automated testing (unit, integration, end-to-end) and staging deploys.  

### Out-of-Scope (Later Phases)
- Mobile application or native client.  
- Blockchain-based transaction logging.  
- Advanced analytics or machine-learning fraud detection.  
- Bulk data analytics dashboard beyond basic reporting filters.  
- Self-service onboarding for new payment gateway providers (will be manual at first).  

## 3. User Flow

When a new user (administrator) logs in through the web dashboard, they see a sidebar navigation with links: **Dashboard**, **Card Intake**, **Transactions**, **Reports**, and **Settings**. On the Dashboard, key metrics (cards processed today, failed validations, pending exceptions) appear. Under **Card Intake**, the admin can upload files or view recent API submissions. The system processes each batch automatically, flags any errors, and notifies the user via an in-app alert.

For API partners, the flow starts with obtaining an API key from the **Settings** page. A partner sends a POST request to `/api/v1/cards/enroll` with card data in JSON. Cardomat responds immediately with an acceptance ID. Partners can poll `/api/v1/cards/status/{id}` or subscribe to webhooks for updates. Once validation and payment gateway interactions complete, Cardomat sends a final status update. Any errors or exceptions are logged and visible in the **Transactions** section of the dashboard.

## 4. Core Features

- **Card Intake & Parsing**: Accept CSV, JSON, or XML uploads; parse diverse card formats.  
- **Business Rules Engine**: Configure validation rules (e.g., expiration date checks, card-type restrictions, custom field requirements).  
- **Payment Gateway Adapters**: Built-in support for Stripe and Adyen; adapter interface for adding more gateways.  
- **RESTful API**: Endpoints for `enroll`, `submit-transaction`, `get-status`; supports JSON and webhook callbacks.  
- **Admin Dashboard**: Overview metrics, detailed logs, exception queue, manual override for stuck transactions.  
- **Role-Based Access Control**: Admin, Operator, and Read-Only roles with permission enforcement.  
- **Reporting & Filtering**: Search and filter by date range, status, card type, or customer ID; export to CSV.  
- **Security**: OAuth2 / API keys, TLS encryption in transit, AES-256 encryption at rest.  
- **Logging & Auditing**: Structured logs (timestamp, user, action, outcome) and immutable audit trail.  
- **Continuous Integration & Delivery**: Automated unit tests (Jest), integration tests (Supertest), and end-to-end tests (Cypress); GitHub Actions pipeline.

## 5. Tech Stack & Tools

- **Frontend**: React.js + TypeScript, React Router, Material-UI for rapid UI components.  
- **Backend**: Node.js with NestJS (TypeScript); Express under the hood.  
- **Database**: PostgreSQL (relational, encrypted columns for sensitive data).  
- **Caching & Queues**: Redis for caching and background job queue (Bull).  
- **Payment Gateways**: Official Stripe and Adyen SDKs for Node.js.  
- **CI/CD**: GitHub Actions; Docker for container builds; optional Kubernetes deployment.  
- **Testing**: Jest (unit), Supertest (API), Cypress (E2E).  
- **Documentation**: Swagger / OpenAPI spec for REST endpoints; Markdown guides.  
- **Monitoring & Logging**: Winston (app logs), Datadog (metrics & traces).  
- **Infrastructure**: AWS (ECS or EKS, RDS for PostgreSQL, S3 for file storage).  

## 6. Non-Functional Requirements

- **Performance**: <200ms average API response time for simple lookups; able to process 100 concurrent enroll calls.  
- **Scalability**: Horizontal scaling for stateless backend; job queue workers scale based on backlog.  
- **Availability**: 99.9% uptime (SLA), multi-AZ database deployment.  
- **Security & Compliance**: PCI DSS Level 1 readiness, GDPR data-handling policies, OWASP Top 10 mitigation.  
- **Usability**: Dashboard load times <1s; intuitive UI with inline help tooltips.  
- **Maintainability**: 80%+ unit test coverage; code linting (ESLint) and formatting (Prettier) enforced.  

## 7. Constraints & Assumptions

- **Constraints**:  
  - Payment gateway API rate limits (Stripe: 100 requests/sec).  
  - AWS account availability and service quotas.  
  - Data encryption keys managed via AWS KMS.  

- **Assumptions**:  
  - Administrators use modern browsers (Chrome, Firefox, Edge).  
  - Card data formats conform to ISO 7816 or agreed JSON schema.  
  - Network connectivity is reliable between backend services and payment gateways.  

## 8. Known Issues & Potential Pitfalls

- **Diverse Card Formats**: Custom or legacy card data may fail parsing—mitigation: provide a schema-based mapping tool and fallback manual upload.  
- **Payment Gateway Downtime**: Temporary gateway outages could stall transactions—mitigation: automatic retries with exponential backoff and queue-based reprocessing.  
- **API Rate Limits**: Surges in enrollment calls risk hitting provider limits—mitigation: implement client-side rate limiting and server-side queuing.  
- **Sensitive Data Exposure**: Improper logging could leak card data—mitigation: mask or omit PAN and CVV fields in all logs and audit records.  
- **Schema Evolution**: Future changes to card data schema could break ingestion—mitigation: versioned API and transformation layer.

---

This PRD captures all core requirements for Cardomat’s initial release. It is intended as the single source of truth for any subsequent technical documentation or code generation tasks.