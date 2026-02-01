# Environment Setup for Demo Mode

## Quick Start

1. **Create `.env.local` file** (already created):
```bash
# Demo Mode - No API key required
DEMO_MODE=true

# Database - SQLite for local dev (demo mode)
DATABASE_URL=file:/Users/sammy/decisiontrace/tmp/demo.db

# Prisma Schema Target
PRISMA_SCHEMA_TARGET=sqlite
```

2. **Generate Prisma Client**:
```bash
npm run prisma:generate:sqlite
```

3. **Create Database**:
```bash
DATABASE_URL="file:$(pwd)/tmp/demo.db" npm run prisma:db:push:sqlite
```

4. **Seed Demo Data**:
```bash
DATABASE_URL="file:$(pwd)/tmp/demo.db" npm run db:seed
```

5. **Start Dev Server**:
```bash
npm run dev
```

## Connection Issues Fixed

✅ Added `dev` script to `package.json`
✅ Created `.env.local` with demo mode settings
✅ Set up SQLite database path
✅ Generated Prisma client for SQLite
✅ Server now starts successfully

## Testing

Visit: http://localhost:3000

Click "🚀 Load Demo Case" to load the pre-populated demo case.


