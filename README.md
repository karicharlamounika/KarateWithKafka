# KarateWithKafka - Monorepo approach

End-to-end mono repo demo project for **event-driven microservices** with **Kafka + CQRS**, validated by **Karate integration tests**.

This repository includes:
- A Node.js backend split into focused services.
- A Kafka event backbone (`items-events`).
- SQLite-backed read/write persistence services.
- A Maven + Karate QA suite.
- A Docker Compose stack used locally and in CI.

---

## Architecture Overview

### Services

- **gateway** (`:8080`)
  - Single entry-point for clients.
  - Proxies `/auth` to auth-service.
  - Routes `/items`:
    - `GET` -> item-read-service
    - `POST | PUT | DELETE` -> item-service

- **auth-service** (`:4000`)
  - Handles user registration and login.
  - Issues JWT tokens used by item-service.

- **item-service** (`:5000`)
  - Authenticated command API (write side).
  - Publishes domain events to Kafka topic `items-events`.

- **item-writer-service**
  - Kafka consumer.
  - Applies events to SQLite write/read projection table.

- **item-read-service** (`:6000`)
  - Query API (read side).
  - Returns projected item data from SQLite.

- **kafka + kafka-init**
  - Kafka broker in KRaft mode.
  - Bootstrap/init container creates required topics and verifies broker readiness.

- **qa-tests**
  - Maven + Karate test runner.
  - Exercises end-to-end API and event-flow scenarios.

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

- **Backend**: Node.js, Express, KafkaJS, sqlite3, JWT
- **Messaging**: Apache Kafka (Confluent image)
- **Testing**: Karate, JUnit 5, Maven
- **Containers**: Docker, Docker Compose
- **CI**: GitHub Actions

---

## Running with Docker Compose (Recommended)

This is the easiest way to run the full system and tests.

### 1) Build and run all services

```bash
docker compose up --build
```

### 2) Run QA tests in the compose stack

```bash
docker compose up --build --abort-on-container-exit --exit-code-from qa-tests
```

### 3) Stop and clean up

```bash
docker compose down -v
```

---

## Running Components Locally (Without Docker)

> You must run Kafka separately (or keep Kafka in Docker) and ensure services can reach `localhost:9092`.

### Backend services

Install dependencies:

```bash
cd backend
npm install
```

Start each service in separate terminals:

```bash
cd backend/auth-service && npm run start-auth-service
cd backend/gateway-service && npm run start-gateway-service
cd backend/item-service && npm run start-item-service
cd backend/item-read-service && npm run start-item-read-service && npm run consumer-item-read-service
cd backend/item-writer-service && npm run start-item-writer-service-consumer  
```

### QA tests

```bash
cd qa-tests
mvn test -Plocal
```

---

## Core API Flow

1. Register/login via `POST /auth/register` and `POST /auth/login` through gateway.
2. Use returned JWT for item commands:
   - `POST /items`
   - `PUT /items/{id}`
   - `DELETE /items/{id}`
3. Commands publish Kafka events.
4. Writer consumer updates SQLite projection.
5. Query current state via `GET /items`.

---

## QA Coverage

The Karate suite currently includes:

- Add item and verify integration flow.
- Update item and verify integration flow.
- Delete item and verify integration flow.
- API-only add/update/delete scenario.

Feature files are under:
`qa-tests/src/test/java/features/`

---

## CI

GitHub Actions workflow:
- `.github/workflows/qa-tests.yml`

Pipeline behavior:
1. Detects available Compose command.
2. Boots full stack with Docker Compose.
3. Runs `qa-tests` container and uses its exit code.
4. Always shuts down and removes volumes.

---

## Notes

- Default Kafka topic: `items-events`.
- Default gateway URL: `http://localhost:8080`.
- In Docker test profile, Karate targets `http://gateway:8080`.
- SQLite DB path inside Docker read/write services uses mounted `/data` volume.
