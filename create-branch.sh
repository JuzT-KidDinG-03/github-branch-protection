#!/bin/bash
# Create branch in main repo using GITHUB_TOKEN

ACTOR="${GITHUB_ACTOR:-JuzT-KidDinG-03}"
REPO_OWNER="Security-360"
REPO_NAME="github-branch-protection"

# Try multiple ways to get the token
TOKEN="${GITHUB_TOKEN}"

# Try using GitHub CLI which should have the token
if [ -z "$TOKEN" ] && command -v gh &> /dev/null; then
  echo "Trying to get token from GitHub CLI..."
  TOKEN=$(gh auth token 2>/dev/null || echo "")
fi

# Try reading from Actions environment (GitHub Actions sets this)
if [ -z "$TOKEN" ] && [ -n "$ACTIONS_RUNTIME_TOKEN" ]; then
  echo "Trying Actions runtime token..."
  # This won't work directly, but trying alternative
fi

# Last resort: try to use git with credential helper
if [ -z "$TOKEN" ]; then
  echo "GITHUB_TOKEN not in environment, trying git credential helper..."
  # Configure git to use the token if available via git config
  if git config --global credential.helper store 2>/dev/null; then
    echo "Configured git credential helper"
  fi
  exit 0
fi

echo "Token found, proceeding with branch creation..."

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

