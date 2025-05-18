# Chat Application

A basic real-time chat application.

## Prerequisites

- Node.js
- pnpm
- Docker & Docker Compose

## Getting Started

1. Set up environment variables:

```bash
cp env.example .env
```

2. Install dependencies:

```bash
pnpm i
```

3. Start the database:

```bash
docker-compose up -d
```

4. Initialize the database:

```bash
pnpm db:init
```

5. Start the development server:

```bash
pnpm dev
```

The application should now be running at `http://localhost:3000`.

## Login Credentials

You can use any of these test accounts to login:

| Username | Password |
| -------- | -------- |
| user1    | user1    |
| user2    | user2    |
| user3    | user3    |
| user4    | user4    |
