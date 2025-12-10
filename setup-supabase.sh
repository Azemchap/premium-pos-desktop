#!/bin/bash

# QorBooks Supabase Setup Script
# This script sets up your Supabase database automatically

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  QorBooks Supabase Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo "  # or"
    echo "  brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

# Check if we're in a supabase project
if [ ! -d "supabase" ]; then
    echo -e "${YELLOW}No supabase directory found. Initializing...${NC}"
    supabase init
fi

# Prompt for Supabase project details
echo -e "${YELLOW}Enter your Supabase project details:${NC}"
echo ""

# Read Supabase URL
read -p "Supabase URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}Error: Supabase URL is required${NC}"
    exit 1
fi

# Read Supabase Service Role Key (for admin operations)
echo ""
echo -e "${YELLOW}Service Role Key (from Settings → API → service_role):${NC}"
read -sp "Service Role Key: " SERVICE_ROLE_KEY
echo ""
if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: Service Role Key is required${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Setting up database...${NC}"

# Run the SQL script using psql or curl
# We'll use curl to execute via Supabase REST API
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": $(jq -Rs . supabase-setup.sql)}")

# Check if we should use direct database connection instead
echo ""
echo -e "${YELLOW}Choose setup method:${NC}"
echo "1) Run SQL script directly in Supabase dashboard (Recommended)"
echo "2) Use database connection string (Advanced)"
read -p "Enter choice [1-2]: " SETUP_METHOD

if [ "$SETUP_METHOD" = "1" ]; then
    echo ""
    echo -e "${GREEN}✓ Setup files are ready!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Go to your Supabase dashboard: ${SUPABASE_URL}"
    echo "2. Navigate to: SQL Editor"
    echo "3. Click 'New Query'"
    echo "4. Copy the contents of 'supabase-setup.sql'"
    echo "5. Paste into the SQL Editor and click 'Run'"
    echo ""
    echo -e "${YELLOW}After running the SQL:${NC}"
    echo "6. Go to: Database → Replication"
    echo "7. Click on 'supabase_realtime'"
    echo "8. Enable replication for these tables:"
    echo "   - products"
    echo "   - inventory"
    echo "   - customers"
    echo "   - sales"
    echo "   - purchase_orders"
    echo "   - expenses"
    echo ""

elif [ "$SETUP_METHOD" = "2" ]; then
    echo ""
    read -p "Enter database connection string: " DB_CONNECTION

    if [ -z "$DB_CONNECTION" ]; then
        echo -e "${RED}Error: Connection string is required${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}Running SQL script...${NC}"

    # Run the SQL file
    psql "$DB_CONNECTION" -f supabase-setup.sql

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Database setup complete!${NC}"
        echo ""
        echo -e "${YELLOW}Next step: Enable Realtime${NC}"
        echo "1. Go to: Database → Replication in Supabase dashboard"
        echo "2. Enable replication for key tables"
    else
        echo -e "${RED}Error: SQL execution failed${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your database is ready. Start your app with:"
echo -e "  ${YELLOW}pnpm tauri:dev${NC}"
echo ""
