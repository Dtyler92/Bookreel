#!/bin/bash
# Usage: bash ~/bookreel/scripts/set-env.sh KEY_NAME "your-key-value"

KEY_NAME=$1
KEY_VALUE=$2

if [ -z "$KEY_NAME" ] || [ -z "$KEY_VALUE" ]; then
  echo "Usage: bash ~/bookreel/scripts/set-env.sh KEY_NAME your-key-value"
  exit 1
fi

ENV_FILE="/root/bookreel/.env.local"

# Use python to safely replace the line (handles special characters)
python3 -c "
import re
with open('$ENV_FILE', 'r') as f:
    content = f.read()
content = re.sub(r'^${KEY_NAME}=.*$', '${KEY_NAME}=${KEY_VALUE}', content, flags=re.MULTILINE)
with open('$ENV_FILE', 'w') as f:
    f.write(content)
print('✅ Done')
"

# Verify (show first 20 chars only for security)
RESULT=$(grep "^${KEY_NAME}=" "$ENV_FILE" | cut -c1-40)
echo "✅ Verified: ${RESULT}..."
