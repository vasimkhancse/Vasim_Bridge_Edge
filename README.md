# College Review System - MERN Stack Backend REST API

[![Tests](https://img.shields.io/badge/Tests-44%2F44%20Passed-brightgreen)](file:///tests/)
[![Coverage](https://img.shields.io/badge/Coverage-88%25-green)](file:///docs/test-coverage-output.txt)
[![Node](https://img.shields.io/badge/Node.js-v20%2B-blue)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5-lightgrey)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v7.0-brightgreen)](https://www.mongodb.com/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-orange)](http://localhost:5000/api/docs)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](file:///docker-compose.yml)

A production-grade REST API backend for a **College Review System** built with **Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, Joi, Jest, and Supertest**.

---

## 📋 Features & Assessment Capabilities

- 🔐 **JWT Authentication & Security:** Ephemeral tokens, password hashing with `bcryptjs`, and protected routes with Bearer token authentication.
- 🛡️ **Role-Based Access Control (RBAC):** Tiered roles (`admin`, `teacher`, `student`) with resource-level authorization and review ownership enforcement.
- 🏛️ **College Management (CRUD):** Admin-governed college registry with location indices and nested review relationships.
- ⭐ **Review Management (CRUD):** Student and teacher reviews with 1-5 ratings, full-text search, multi-field filtering, and pagination.
- 📊 **MongoDB Aggregation Pipelines:** Real-time computation of average college ratings, total review counts, rating breakdown distributions (1-5 stars), and platform-wide statistics.
- 🛡️ **Validation & Error Handling:** Schema validation via `Joi`, centralized error interceptor for Mongoose CastError, validation errors, duplicate keys (11000), and rate-limiting via `express-rate-limit`.
- 🧪 **Integration Tests (100% Pass):** 44 automated integration tests across Auth, College CRUD, Review CRUD, and Aggregations with >88% statement coverage.
- 🐳 **Containerization:** Production-ready `Dockerfile` and `docker-compose.yml` with health checks.
- 📖 **API Documentation:** Interactive Swagger UI at `/api/docs` and exported Postman collection in `docs/postman_collection.json`.

---

## 🚀 Quick Setup & Run Instructions

```bash
# 1. Clone the repository
git clone <repository_url>
cd BridgeEdge

# 2. Copy environment template
cp .env.example .env

# 3. Start MongoDB and API via Docker Compose
docker-compose up -d

# 4. Install dependencies (for local development)
npm install

# 5. Populate realistic seed data (users, colleges, reviews, aggregates)
npm run seed

# 6. Start development server
npm run dev

# 7. Run automated test suite
npm test
```

> **Note on Windows PowerShell:** Use `Copy-Item .env.example .env` if `cp` is unavailable.

---

## 🔑 Demo Seed Credentials

Run `npm run seed` to populate the database with realistic sample colleges, users, and reviews:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@collegereviews.com` | `AdminPass123!` | Create/Update/Delete Colleges, Moderate All Reviews, View System Aggregates |
| **Teacher** | `teacher@collegereviews.com` | `TeacherPass123!` | View Colleges, Post & Manage Own Reviews |
| **Student 1** | `student1@collegereviews.com` | `StudentPass123!` | View Colleges, Post & Manage Own Reviews |
| **Student 2** | `student2@collegereviews.com` | `StudentPass123!` | View Colleges, Post & Manage Own Reviews |

---

## 📡 API Endpoints Overview

Base URL: `http://localhost:5000/api/v1`  
Swagger UI Interactive Docs: `http://localhost:5000/api/docs`  
Raw OpenAPI JSON: `http://localhost:5000/api/docs.json`  

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new user (`name`, `email`, `password`, `role`) |
| `POST` | `/auth/login` | Public | Login with email/password; returns JWT token |
| `GET` | `/auth/me` | Authenticated | Get current authenticated profile |
| `PUT` | `/auth/profile` | Authenticated | Update user name and department |

### 2. Colleges (`/api/v1/colleges`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/colleges` | Public | List colleges with aggregated ratings (`?search=&city=&state=&page=&limit=&sort=`) |
| `GET` | `/colleges/stats/summary` | Public | Aggregation overview: Top rated colleges, totals, state distribution |
| `GET` | `/colleges/:id` | Public | College details with rating breakdown distribution (1-5 stars) & recent reviews |
| `POST` | `/colleges` | **Admin only** | Create a new college |
| `PUT` | `/colleges/:id` | **Admin only** | Update college details |
| `DELETE` | `/colleges/:id` | **Admin only** | Delete college and cascade delete all associated reviews |

### 3. Reviews (`/api/v1/reviews` & nested `/api/v1/colleges/:collegeId/reviews`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/colleges/:collegeId/reviews` | Student/Teacher/Admin | Submit review (triggers live average rating re-aggregation) |
| `GET` | `/reviews` | Public | List all reviews (`?collegeId=&rating=&search=&page=&limit=&sortBy=`) |
| `GET` | `/colleges/:collegeId/reviews` | Public | List reviews for a specific college |
| `GET` | `/reviews/:id` | Public | Get single review by ID |
| `PUT` | `/reviews/:id` | **Author or Admin** | Update review (recalculates college rating stats) |
| `DELETE` | `/reviews/:id` | **Author or Admin** | Delete review (recalculates college rating stats) |

---

## 🧪 Testing & Code Coverage

Tests are executed in-memory with zero external database dependencies using **Jest**, **Supertest**, and **MongoMemoryServer**:

```bash
# Run integration tests
npm test

# Run tests with code coverage report
npm run test:coverage
```

### Coverage Summary (44/44 Tests Passed)
```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   87.68 |    63.67 |   80.76 |   88.69 |
 src/controllers       |   86.38 |    68.54 |   88.23 |   88.34 |
 src/models            |   96.00 |    87.50 |   87.50 |   95.91 |
 src/routes            |   97.77 |   100.00 |    0.00 |   97.77 |
 src/validations       |  100.00 |   100.00 |  100.00 |  100.00 |
-----------------------|---------|----------|---------|---------|
```
*Full coverage log saved in [`docs/test-coverage-output.txt`](file:///docs/test-coverage-output.txt).*

---

## 📦 Deliverables Checklist

- [x] **Source Code:** Complete modular Express.js backend architecture.
- [x] **README:** Setup, test, and run instructions.
- [x] **Docker Compose:** [`docker-compose.yml`](file:///docker-compose.yml), [`Dockerfile`](file:///Dockerfile), and [`.env.example`](file:///.env.example).
- [x] **Postman Collection:** [`docs/postman_collection.json`](file:///docs/postman_collection.json).
- [x] **Swagger Specification:** [`docs/swagger.json`](file:///docs/swagger.json) and live `/api/docs`.
- [x] **Seed Data Script:** [`scripts/seed.js`](file:///scripts/seed.js) (`npm run seed`).
- [x] **Test Results & Coverage:** [`docs/test-coverage-output.txt`](file:///docs/test-coverage-output.txt) (44/44 passing).
- [x] **Production Readiness Document:** [`PRODUCTION_READINESS.md`](file:///PRODUCTION_READINESS.md).
