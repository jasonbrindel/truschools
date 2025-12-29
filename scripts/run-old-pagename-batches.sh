#!/bin/bash

# Run all old_page_name update batches
for i in $(seq -w 1 142); do
  batch="data/old-pagename-batches/batch-${i}.sql"
  if [ -f "$batch" ]; then
    echo "Running batch $i of 142..."
    CLOUDFLARE_ACCOUNT_ID=db05e74e773d91c84692ba064111c43c npx wrangler d1 execute trueschools-db --remote --file="$batch" 2>&1 | grep -E "(changes|Error)" | head -1
  fi
done

echo "Done!"
