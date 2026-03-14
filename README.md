# KarateWithKafka

> 💡 This project started as a interview task — build a Karate framework with Kafka validations. I submitted a small boilerplate at the time without fully knowing Kafka. This is the fully built version.

End-to-end monorepo demo project for **event-driven microservices** with **Kafka + CQRS**, validated by a full **Karate integration test suite**.

The backend is **tool-agnostic** — use it to build your own automation suite with any framework you choose.

---

## What You'll Learn

- Event-driven architecture with Kafka
- CQRS pattern (separate read/write services)
- Async 202 pattern with correlationId and status polling
- Testing distributed systems end-to-end
- Parallel test execution with thread-safe Kafka consumers
- CI/CD with Docker Compose + GitHub Actions

---

## Architecture Overview
```
Client → Gateway (:8080)
           ├── /auth      → auth-service (:4000)
           ├── /items GET → item-read-service (:6000)
           └── /items POST | PUT | DELETE → item-service (:5000)

item-service → Kafka (items-events)
                  ├── item-writer-service → PostgreSQL (write)
                  └── item-read-service   → PostgreSQL (read projection)
```

### Async 202 Pattern

Every write operation returns immediately — no blocking:
```json
POST /items → 202
{
  "correlationId": "req_xxx",
  "statusUrl": "/items/req_xxx/status",
  "item": { "itemId": "item_xxx", "status": "PENDING" }
}
```

Poll `/items/:correlationId/status` until `COMPLETED`, `FAILED`, or `PROCESSING`.

---

## Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant GW as gateway-service
    participant Auth as auth-service
    participant IS as item-service
    participant Writer as item-writer-service
    participant Read as item-read-service
    participant Kafka as Kafka (items-events topic)
    participant PGW as PostgreSQL (Write DB)
    participant PGR as PostgreSQL (Read DB)

    Note over Client,GW: Pre-requisite: Client Registers & Logins to get JWT

    Note right of Client: CREATE ITEM Flow (Async 202)
    Client->>GW: POST /items (JWT, payload)
    GW->>Auth: Validate JWT
    activate Auth
    Auth-->>GW: Valid
    deactivate Auth
    GW->>IS: Forward Request
    activate IS
    IS->>PGW: Record Job Status (PENDING)
    activate PGW
    PGW-->>IS: OK
    deactivate PGW
    IS->>Kafka: Produce EVENT (ITEM_CREATED)
    activate Kafka
    Kafka-->>IS: Acknowledge
    deactivate Kafka
    IS-->>Client: 202 ACCEPTED (correlationId, statusUrl)
    deactivate IS

    Note left of Kafka: ASYNC PROCESSING
    Kafka-)Writer: Consume EVENT (ITEM_CREATED)
    activate Writer
    Writer->>PGW: Update Job Status (PROCESSING)
    activate PGW
    PGW-->>Writer: OK
    deactivate PGW
    Writer->>PGW: Insert Item Data
    activate PGW
    PGW-->>Writer: OK
    deactivate PGW
    Writer->>PGW: Update Job Status (COMPLETED)
    activate PGW
    PGW-->>Writer: OK
    deactivate PGW
    deactivate Writer

    Kafka-)Read: Consume EVENT (ITEM_CREATED)
    activate Read
    Read->>PGR: Materialize / Project Read Projection
    activate PGR
    PGR-->>Read: OK
    deactivate PGR
    deactivate Read

    loop Polling until COMPLETED
        Client->>GW: GET /items/{correlationId}/status
        GW->>IS: Forward Request
        activate IS
        IS->>PGW: Query Job Status
        activate PGW
        PGW-->>IS: Status (PROCESSING → COMPLETED)
        deactivate PGW
        IS-->>Client: 200 OK (status, itemId)
        deactivate IS
    end

    Note right of Client: QUERY ITEM Flow (CQRS Read)
    Client->>GW: GET /items (JWT)
    GW->>Auth: Validate JWT
    activate Auth
    Auth-->>GW: Valid
    deactivate Auth
    GW->>Read: Forward Request
    activate Read
    Read->>PGR: Query Read Projection
    activate PGR
    PGR-->>Read: OK (Item Data)
    deactivate PGR
    Read-->>Client: 200 OK (Item Data)
    deactivate Read
```

## Services

| Service | Port | Responsibility |
|---|---|---|
| gateway-service | 8080 | Single entry point, proxies to all services |
| auth-service | 4000 | JWT registration & login |
| item-service | 5000 | Async write API + job status tracking |
| item-writer-service | — | Kafka consumer, writes/updates/deletes items in DB |
| item-read-service | 6000 | Kafka consumer, read projection + query API |
| kafka | 9092 | Event backbone (KRaft mode, no Zookeeper) |
| kafka-init | — | Creates topics and verifies broker readiness |
| postgres | 5432 | Separate DBs: authdb, jobstatusdb, itemsdb |

---

## Repository Structure
```text
.
├── .github/
│   └── workflows/
│       └── qa-tests.yml
├── backend/
│   ├── auth-service/
│   ├── contracts/
│   │   └── items-events.json
│   ├── gateway-service/
│   ├── item-read-service/
│   ├── item-service/
│   ├── item-writer-service/
│   └── package.json
├── qa-tests/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/test/java/
│       ├── features/
│       ├── karatehelpers/
│       ├── runners/
│       └── utils/
├── docker-compose.yml
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, KafkaJS, pg, JWT |
| Messaging | Apache Kafka (Confluent, KRaft mode) |
| Database | PostgreSQL 15 |
| Testing | Karate, JUnit 5, Maven |
| Containers | Docker, Docker Compose |
| CI | GitHub Actions |

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Java 21 (for running tests locally outside Docker)

### Environment Setup

Create a `.env` file in the root:
```bash
AUTH_SECRET_KEY=<64-char-hex>
POSTGRES_USER=admin
POSTGRES_PASSWORD=yourpassword
AUTH_DB_URL=postgresql://admin:yourpassword@postgres:5432/authdb
JOB_STATUS_DB_URL=postgresql://admin:yourpassword@postgres:5432/jobstatusdb
ITEMS_WRITE_DB_URL=postgresql://admin:yourpassword@postgres:5432/itemsdb
ITEMS_READ_DB_URL=postgresql://admin:yourpassword@postgres:5432/itemsdb
```

---

## Running with Docker Compose (Recommended)

### Start full stack
```bash
docker compose up --build
```

### Run QA tests only
```bash
docker compose up --build --abort-on-container-exit --exit-code-from qa-tests
```

### Stop and clean up
```bash
docker compose down -v
```

---

## Running Locally (Without Docker)

> Kafka must be running separately and reachable at `localhost:9092`.

### Install backend dependencies
```bash
cd backend
npm install
```

### Start each service in a separate terminal
```bash
cd backend/auth-service && npm run start-auth-service
cd backend/gateway-service && npm run start-gateway-service
cd backend/item-service && npm run start-item-service
cd backend/item-read-service && npm run start-item-read-service
cd backend/item-writer-service && npm run start-item-writer-service-consumer
```

### Run QA tests
```bash
cd qa-tests
mvn test -Plocal
```

---

## Core API Flow

1. Register → `POST /auth/register`
2. Login → `POST /auth/login` → receive JWT
3. Use JWT for item commands:
   - Create → `POST /items`
   - Update → `PUT /items/{id}`
   - Delete → `DELETE /items/{id}`
4. Each command returns `202` with `correlationId`
5. Poll → `GET /items/{correlationId}/status` until `COMPLETED`
6. Query → `GET /items`

---

## QA Suite

Built with **Karate + JUnit5**, running in **parallel** (4 threads) in under 10 seconds.

| Feature File | Type | Coverage |
|---|---|---|
| `AddItemAndVerifyIntegrationTest` | Integration | Add → Kafka → DB verify |
| `UpdateItemAndVerifyIntegrationTest` | Integration | Update → Kafka → DB verify |
| `DeleteItemAndVerifyIntegrationTest` | Integration | Delete → Kafka → DB verify |
| `ItemCRUDAPIOnlyTest` | API Contract | Response shape & status codes |
| `APINegativeValidationTest` | Negative | Auth, missing fields, invalid tokens |

Feature files: `qa-tests/src/test/java/features/`

---

## Use This Backend With Any Tool

The backend is fully functional and realistic — use it to build your own test suite:

| Tool | Use Case |
|---|---|
| 🔧 Karate *(included)* | API + Kafka integration tests |
| 🔧 RestAssured | Java-based API testing |
| 🔧 Playwright / Cypress | UI or API testing |
| 🔧 PyTest | Python-based API testing |
| 🔧 Postman / Newman | Manual + automated API testing |

Perfect for building a portfolio project that demonstrates testing of real-world distributed systems.

---

## CI Pipeline

GitHub Actions workflow: `.github/workflows/qa-tests.yml`

1. Detects available Docker Compose command
2. Creates `.env` from GitHub Secrets
3. Boots full stack with Docker Compose
4. Runs `qa-tests` container and captures exit code
5. Uploads Karate HTML report as artifact
6. Always shuts down stack and removes volumes

---

## Contributing

Contributions are welcome — open an issue or submit a PR.

---

## License

MIT © Mounika Karicharla 2026
