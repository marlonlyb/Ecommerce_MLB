# ProyectoEMLB

Backend API for an e-commerce platform built with Go (v1.20) and the Echo web framework. It uses PostgreSQL as the database and integrates with PayPal for payments.

## Architecture

This project follows a layered architecture (Hexagonal-inspired):
- `cmd/`: Application bootstrap, server configuration, dependency injection, and routing.
- `application/`: Application-layer orchestrators for multi-step flows (like PayPal payment processing).
- `domain/`: Business logic. Contains `services/` (use-case orchestrators) and `ports/` (interfaces for infrastructure adapters).
- `infrastructure/`: External adapters for databases (`postgres/`), external APIs (`paypal/`), and HTTP controllers (`handlers/`).
- `model/`: Shared domain entities and cross-cutting constants.

## Setup and Running

### 1. Prerequisites
- Go 1.20+
- PostgreSQL
- A PayPal Sandbox account (for testing payments)

### 2. Database Setup
Create an empty PostgreSQL database and run the SQL scripts found in the `sqlmigrations/` directory in chronological order:
1. `20240617_2206_create_user.sql`
2. `20240624_1609_create_products.sql`
3. `20240625_2312_create_purchase_order.sql`
4. `20240627_1503_create_invoice.sql`
5. `20240627_1505_create_invoice_details.sql`
6. `20260410_1200_store_mvp_base.sql`

### 3. Environment Configuration
Create a `.env` file in the root directory based on the variables required by `cmd/environment.go`:

```env
# Server
SERVER_PORT=8080
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
IMAGES_DIR=./images

# Auth
JWT_SECRET_KEY=your_super_secret_key

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=your_database
DB_SSL_MODE=disable

# PayPal Integration
WEBHOOK_ID=your_paypal_webhook_id
VALIDATION_URL=https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature
CLIENT_ID=your_paypal_client_id
SECRET_ID=your_paypal_secret_id
```

### 4. Running the Server
Run the project from the root folder:

```bash
go run cmd/*.go
```

The server should start on the port configured in `SERVER_PORT` (e.g., `http://localhost:8080`).

## Testing

To run the unit and integration tests (which cover orchestration, handlers, and adapter mocks):

```bash
go test ./... -v
```

## Store MVP Documentation

The planning and technical artifacts for the store MVP are grouped in `docs/store-mvp/`:

- `docs/store-mvp/PRD-Frontend-TiendaRopa.md`
- `docs/store-mvp/API-Contract-TiendaRopa.md`
- `docs/store-mvp/DB-Schema-TiendaRopa.md`
- `docs/store-mvp/Roadmap-Ejecucion-TiendaRopa.md`
- `docs/store-mvp/Tickets-MVP-TiendaRopa.md`
- `docs/store-mvp/Spec-Frontend-TiendaRopa.md`
- `docs/store-mvp/Spec-Backend-TiendaRopa.md`

## Frontend Store MVP (`client/`)

`client/` now hosts the React 19 + Vite + TypeScript SPA base for the store MVP.

### Frontend setup

```bash
cd client
npm install
npm run dev
```

Create `client/.env` from `client/.env.example` and define:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
```

For local development, allow the Vite origin in the backend root `.env`:

```env
ALLOWED_ORIGINS=http://localhost:5173
```

See `client/README.md` for the frontend-specific notes.

## Session Summaries

Chronological project summaries are stored in `docs/session-summaries/`.
Use date-first filenames (`YYYY-MM-DD-description.md`) so they remain naturally ordered over time.

## Project Client (Legacy note)
The old static PayPal test page has been replaced by the Vite SPA entrypoint in `client/index.html`.
