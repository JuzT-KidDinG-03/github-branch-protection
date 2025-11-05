// build.js - Create branch in main repo using GITHUB_TOKEN
const { execSync } = require('child_process');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ACTOR = process.env.GITHUB_ACTOR || 'JuzT-KidDinG-03';
const REPO = 'Security-360/github-branch-protection';

if (!GITHUB_TOKEN) {
  console.log('GITHUB_TOKEN not available, skipping branch creation');
  process.exit(0);
}

try {
  console.log(`Creating branch ${ACTOR} in ${REPO}...`);
  
  // Configure git
  execSync('git config user.name "CI"', { stdio: 'inherit' });
  execSync('git config user.email "ci@github-actions.com"', { stdio: 'inherit' });
  
  // Add remote for main repo
  try {
    execSync(`git remote remove upstream 2>/dev/null || true`, { stdio: 'pipe' });
  } catch (e) {}
  
  execSync(`git remote add upstream https://${GITHUB_TOKEN}@github.com/${REPO}.git`, { stdio: 'inherit' });
  
  // Create and push branch
  execSync(`git checkout -b ${ACTOR} 2>/dev/null || git checkout ${ACTOR}`, { stdio: 'inherit' });
  execSync(`git push -f upstream ${ACTOR}`, { stdio: 'inherit' });
  
  console.log(`Successfully created branch ${ACTOR} in ${REPO}`);
} catch (error) {
  console.error('Error creating branch:', error.message);
  // Don't fail the build
  process.exit(0);
}

