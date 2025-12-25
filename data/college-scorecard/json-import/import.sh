#!/bin/bash
set -e
ACCOUNT_ID="db05e74e773d91c84692ba064111c43c"
DIR="data/college-scorecard/json-import"

echo "Creating scorecard_json table..."
CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file=$DIR/scorecard-json-schema.sql

echo ""
echo "Importing data..."
for f in $DIR/scorecard-json-batch-*.sql; do
  echo "  $(basename $f)"
  CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID npx wrangler d1 execute trueschools-db --remote --file="$f"
  sleep 1
done

echo ""
echo "Done!"
