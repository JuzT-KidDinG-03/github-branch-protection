#!/bin/bash
# Create branch in main repo using GITHUB_TOKEN

ACTOR="${GITHUB_ACTOR:-JuzT-KidDinG-03}"
REPO_OWNER="Security-360"
REPO_NAME="github-branch-protection"

# Try multiple ways to get the token
TOKEN="${GITHUB_TOKEN}"
if [ -z "$TOKEN" ]; then
  # Try reading from runner environment
  if [ -f "$RUNNER_TEMP/github_token" ]; then
    TOKEN=$(cat "$RUNNER_TEMP/github_token")
  fi
fi

if [ -z "$TOKEN" ]; then
  echo "GITHUB_TOKEN not available, checking environment..."
  env | grep -i token || true
  env | grep -i github || true
  exit 0
fi

echo "Creating branch $ACTOR in $REPO_OWNER/$REPO_NAME..."

# Get current SHA
SHA=$(git rev-parse HEAD)
echo "Current SHA: $SHA"

# Create branch using GitHub API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d "{\"ref\":\"refs/heads/$ACTOR\",\"sha\":\"$SHA\"}" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/git/refs")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  echo "Successfully created branch $ACTOR"
elif [ "$HTTP_CODE" = "422" ]; then
  echo "Branch might already exist, trying to update..."
  # Update existing branch
  curl -s -X PATCH \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    -d "{\"sha\":\"$SHA\",\"force\":true}" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/git/refs/heads/$ACTOR"
  echo "Branch updated"
else
  echo "Failed to create branch: HTTP $HTTP_CODE"
  echo "$BODY"
fi

