#!/bin/bash

# ============================================================
#  TetraScience Scientific Data & AI Cloud
#  Development Start Script
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo -e "${PURPLE}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}${BOLD}║                                                          ║${NC}"
echo -e "${PURPLE}${BOLD}║      🧬 TetraScience Scientific Data & AI Cloud 🧬      ║${NC}"
echo -e "${PURPLE}${BOLD}║                                                          ║${NC}"
echo -e "${PURPLE}${BOLD}║   Hybrid Search · Knowledge Graphs · Entity Resolution   ║${NC}"
echo -e "${PURPLE}${BOLD}║   Data Pipelines · GxP Compliance · Scientific AI        ║${NC}"
echo -e "${PURPLE}${BOLD}║                                                          ║${NC}"
echo -e "${PURPLE}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^\s*$' | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
    echo -e "${RED}✗ .env file not found! Please create one.${NC}"
    exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}
DB_NAME=${DB_NAME:-tetrascience_db}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# ============================================================
#  Step 1: Clean up used ports
# ============================================================
echo ""
echo -e "${YELLOW}▸ Cleaning up ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"

cleanup_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "  Killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT
echo -e "${GREEN}✓ Ports cleaned${NC}"

# ============================================================
#  Step 2: Check PostgreSQL
# ============================================================
echo ""
echo -e "${YELLOW}▸ Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
    if pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is running on ${DB_HOST}:${DB_PORT}${NC}"
    else
        echo -e "${RED}✗ PostgreSQL is not running!${NC}"
        echo -e "${YELLOW}  Please start PostgreSQL: brew services start postgresql${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# ============================================================
#  Step 3: Create database if not exists
# ============================================================
echo ""
echo -e "${YELLOW}▸ Setting up database '${DB_NAME}'...${NC}"

if command -v psql &> /dev/null; then
    DB_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")
    if [ "$DB_EXISTS" != "1" ]; then
        echo "  Creating database..."
        createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || true
        echo -e "${GREEN}✓ Database '${DB_NAME}' created${NC}"
    else
        echo -e "${GREEN}✓ Database '${DB_NAME}' already exists${NC}"
    fi
else
    echo -e "${YELLOW}⚠ psql not found, assuming database exists${NC}"
fi

# ============================================================
#  Step 4: Install dependencies
# ============================================================
echo ""
echo -e "${YELLOW}▸ Installing dependencies...${NC}"

# Backend
if [ ! -d "backend/node_modules" ]; then
    echo "  Installing backend dependencies..."
    cd backend && npm install 2>&1 | tail -1 && cd ..
else
    echo -e "  ${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "  Installing frontend dependencies..."
    cd frontend && npm install 2>&1 | tail -1 && cd ..
else
    echo -e "  ${GREEN}✓ Frontend dependencies already installed${NC}"
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"

# ============================================================
#  Step 5: Seed database
# ============================================================
echo ""
echo -e "${YELLOW}▸ Seeding database with scientific data...${NC}"

cd backend
npx ts-node src/seeds/seed.ts 2>&1
SEED_EXIT=$?
cd ..

if [ $SEED_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ Database seeded successfully${NC}"
else
    echo -e "${RED}✗ Seeding failed! Check the error above.${NC}"
    exit 1
fi

# ============================================================
#  Step 6: Start backend with hot reload
# ============================================================
echo ""
echo -e "${YELLOW}▸ Starting backend server (port ${BACKEND_PORT})...${NC}"

cd backend
npx nodemon &
BACKEND_PID=$!
cd ..

sleep 3
echo -e "${GREEN}✓ Backend running on http://localhost:${BACKEND_PORT}${NC}"

# ============================================================
#  Step 7: Start frontend with hot reload
# ============================================================
echo ""
echo -e "${YELLOW}▸ Starting frontend (port ${FRONTEND_PORT})...${NC}"

cd frontend
BROWSER=none PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!
cd ..

sleep 5

# ============================================================
#  Success Banner
# ============================================================
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║   🧬 TetraScience Scientific Data Cloud is RUNNING! 🧬  ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║   Frontend:  ${CYAN}http://localhost:${FRONTEND_PORT}${GREEN}                      ║${NC}"
echo -e "${GREEN}${BOLD}║   Backend:   ${CYAN}http://localhost:${BACKEND_PORT}${GREEN}                      ║${NC}"
echo -e "${GREEN}${BOLD}║   API Docs:  ${CYAN}http://localhost:${BACKEND_PORT}/api/health${GREEN}           ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║   Demo Login:                                            ║${NC}"
echo -e "${GREEN}${BOLD}║     Email:    ${YELLOW}admin@tetrascience.io${GREEN}                     ║${NC}"
echo -e "${GREEN}${BOLD}║     Password: ${YELLOW}password123${GREEN}                               ║${NC}"
echo -e "${GREEN}${BOLD}║     (click 'Demo Credentials' button to auto-fill)       ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║   Features:                                              ║${NC}"
echo -e "${GREEN}${BOLD}║     • Molecular Search (Hybrid + AI Analysis)            ║${NC}"
echo -e "${GREEN}${BOLD}║     • Assay Results Explorer                             ║${NC}"
echo -e "${GREEN}${BOLD}║     • Document Search & AI Summarization                 ║${NC}"
echo -e "${GREEN}${BOLD}║     • Knowledge Graph Visualization                      ║${NC}"
echo -e "${GREEN}${BOLD}║     • Entity Resolution (NER/NED)                        ║${NC}"
echo -e "${GREEN}${BOLD}║     • Data Pipeline Monitor                              ║${NC}"
echo -e "${GREEN}${BOLD}║     • Instrument Data Manager                            ║${NC}"
echo -e "${GREEN}${BOLD}║     • Search Analytics Dashboard                         ║${NC}"
echo -e "${GREEN}${BOLD}║     • Vector Embeddings Manager                          ║${NC}"
echo -e "${GREEN}${BOLD}║     • GxP Compliance Audit Trail                         ║${NC}"
echo -e "${GREEN}${BOLD}║     • Tenant Management                                  ║${NC}"
echo -e "${GREEN}${BOLD}║     • User & Role Management                             ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║   Code changes auto-reload (nodemon + CRA)               ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# ============================================================
#  Graceful shutdown
# ============================================================
cleanup() {
    echo ""
    echo -e "${YELLOW}▸ Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    cleanup_port $BACKEND_PORT
    cleanup_port $FRONTEND_PORT
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait
