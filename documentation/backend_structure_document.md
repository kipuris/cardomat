# Cardomat Backend Structure Document

This document describes the backend architecture, hosting solutions, and infrastructure components of the Cardomat project. It uses everyday language to explain how the system is built, how it works, and how it stays secure, scalable, and reliable.

## 1. Backend Architecture

### Overall Design
Cardomat follows a modular, layered design to keep each part of the system focused on a single responsibility. It is organized into three main layers:

- **API Layer**: Handles incoming HTTP requests, routes them to the right services, and formats responses.
- **Core Business Logic Layer**: Implements the rules for card processing, transaction handling, and reporting.
- **Data Access Layer**: Manages interactions with the database and other storage systems.

### Frameworks and Patterns
- We use **Node.js** with **Express.js** for fast, non-blocking web services.
- The **Repository Pattern** separates database operations from business logic, making the code easier to maintain and test.
- Modules are packaged independently, so new features can be added or updated without touching unrelated parts of the system.

### Scalability and Performance
- **Stateless Services**: Each API instance can handle any request; this lets us add or remove servers based on demand.
- **Asynchronous Processing**: Long-running tasks (like batch card validation) are pushed to background queues so user requests stay fast.
- **Horizontal Scaling**: We can spin up more instances behind a load balancer when traffic spikes.

## 2. Database Management

### Technology Choices
- **Relational Database**: PostgreSQL stores structured data (users, cards, transactions).
- **In-Memory Cache**: Redis handles session data, temporary locks, and rate-limiting counters.

### Data Structure and Access
- Tables are normalized to reduce duplication and ensure data integrity.
- We use an ORM (Object-Relational Mapping) tool to map tables to code objects, which simplifies queries and migrations.
- Sensitive fields (like card numbers) are encrypted before saving to the database.

### Data Management Practices
- **Backups**: Automated daily backups of the production database.
- **Migrations**: Versioned database migrations ensure every change is tracked and can be rolled back.
- **Connection Pooling**: Limits the number of active database connections and reuses them for efficiency.

## 3. Database Schema

### Human-Readable Overview
- **Users**: Stores account details and roles (admin, operator, user).
- **Cards**: Holds encrypted card details, status, and owner.
- **Transactions**: Records each payment or refund attempt with status and response codes.
- **Payment Providers**: Lists integration settings for external gateways.
- **Audit Logs**: Tracks actions taken by users or the system for compliance.

### PostgreSQL Schema (Simplified)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,         -- e.g. admin, operator, user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  encrypted_number TEXT NOT NULL,
  card_type TEXT,
  expiration_date DATE,
  status TEXT,                -- e.g. active, blocked, expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  card_id INT REFERENCES cards(id),
  amount NUMERIC(10,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  transaction_type TEXT,      -- e.g. charge, refund
  status TEXT,                -- e.g. pending, approved, declined
  response_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payment_providers (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. API Design and Endpoints

### Approach
We follow a **RESTful** design with clear resource-based URLs. All endpoints use JSON over HTTPS.

### Key Endpoints
- **Auth**
  - `POST /api/v1/auth/login` — Log in and receive a JWT.
  - `POST /api/v1/auth/logout` — Invalidate the current session.

- **Users**
  - `GET /api/v1/users` — List users (admin only).
  - `POST /api/v1/users` — Create a new user.
  - `PUT /api/v1/users/:id` — Update user details.

- **Cards**
  - `GET /api/v1/cards` — List a user’s cards.
  - `POST /api/v1/cards` — Enroll a new card.
  - `PATCH /api/v1/cards/:id/block` — Change status to blocked.

- **Transactions**
  - `POST /api/v1/transactions` — Initiate a charge or refund.
  - `GET /api/v1/transactions/:id` — Check transaction status.

- **Admin & Monitoring**
  - `GET /api/v1/audit-logs` — View system logs (admin only).
  - `GET /api/v1/health` — Quick health check for load balancer.

## 5. Hosting Solutions

- **Cloud Provider**: AWS
- **Compute**: Docker containers in Amazon ECS behind an Application Load Balancer (ALB).
- **Database**: Amazon RDS for PostgreSQL with Multi-AZ replication.
- **Cache**: Amazon ElastiCache (Redis)

### Benefits
- **Reliability**: Managed services with built-in failover.
- **Scalability**: Auto Scaling for ECS tasks and RDS read replicas.
- **Cost-Effectiveness**: Pay-as-you-go pricing with reserved instances for baseline workloads.

## 6. Infrastructure Components

- **Load Balancer (ALB)**: Distributes incoming traffic across multiple container instances.
- **CDN**: Amazon CloudFront for serving static assets (e.g., documentation, front-end bundle).
- **Caching**: Redis caches sessions and rate-limit counters to reduce database load.
- **Message Queue**: Amazon SQS handles background jobs (e.g., batch card validation).
- **Container Registry**: Amazon ECR stores Docker images.

These components work together to ensure fast response times, smooth scaling, and high availability.

## 7. Security Measures

- **Transport Security**: TLS for all HTTP communications.
- **Authentication**: JWT tokens for API access.
- **Authorization**: Role-Based Access Control (RBAC) restricts endpoints by user role.
- **Data Encryption**:
  - At rest: RDS encryption and encrypted EBS volumes.
  - In transit: TLS and VPC-only database access.
  - Application-level: Card numbers are encrypted before saving.
- **Secrets Management**: AWS Secrets Manager holds API keys and database credentials.
- **Input Validation**: All incoming data is validated against a schema to prevent injection attacks.
- **Compliance**: Logging and audit trails support PCI DSS readiness if card data handling becomes in scope.

## 8. Monitoring and Maintenance

- **Logging**: Centralized logs in Amazon CloudWatch Logs, with structured JSON entries.
- **Metrics**: CloudWatch metrics for CPU, memory, request latency, and error rates.
- **Alerts**: CloudWatch Alarms notify the on-call team when thresholds are breached.
- **Tracing**: AWS X-Ray traces requests across services to pinpoint performance bottlenecks.
- **Backups & Updates**:
  - Automated database snapshots daily.
  - Weekly patching of container base images and dependencies.
  - CI/CD pipeline (GitHub Actions) runs tests, builds images, and deploys to staging/production.

## 9. Conclusion and Overall Backend Summary

Cardomat’s backend is built to handle automated card processing, payment integrations, and centralized management in a secure, scalable manner. Key highlights:

- A modular, layered design that separates concerns and simplifies updates.
- PostgreSQL and Redis for reliable data storage and caching.
- RESTful APIs secured with JWT and TLS.
- AWS-based hosting for high availability and easy scaling.
- Robust security practices that protect sensitive card data.
- Monitoring, alerting, and automated maintenance ensure smooth, uninterrupted operation.

This setup aligns with Cardomat’s goals: fast onboarding of new payment providers, real-time transaction handling, and a clear audit trail—all while remaining maintainable and cost-effective.