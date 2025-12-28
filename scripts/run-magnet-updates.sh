#!/bin/bash
# Execute magnet school updates batch by batch

export CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c

# Read each UPDATE line and execute
grep "^UPDATE" /Users/softdev/Sites/truschools/data/update-magnet-schools.sql | while IFS= read -r sql; do
  echo "Executing batch..."
  npx wrangler d1 execute trueschools-db --remote --command="$sql" 2>&1 | grep -E "(changes|ERROR)"
  sleep 0.5
done

echo "Done!"
