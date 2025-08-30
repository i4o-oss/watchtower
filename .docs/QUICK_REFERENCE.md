# Watchtower Release - Quick Reference

## 🚀 Quick Start

### First Time Setup
```bash
# Install dependencies
./scripts/install-deps.sh

# Setup dev branch (if not exists)
./scripts/setup-branches.sh
```

### Daily Development Workflow

```bash
# 1. Create feature branch from dev
git checkout dev && git pull origin dev
git checkout -b feature/my-awesome-feature

# 2. Make changes with conventional commits
git add .
git commit -m "feat: add awesome new feature"
git commit -m "fix: resolve edge case bug"

# 3. Push and create PR to dev
git push origin feature/my-awesome-feature
# → Create PR: feature/my-awesome-feature → dev

# 4. After PR merged to dev, test the dev image
docker pull i4o-oss/watchtower:latest-dev
# → Test in staging environment

# 5. Create PR from dev to main
# → Create PR: dev → main

# 6. Merge to main
# → Automatic release created! 🎉
```

## 🏷️ Commit Message Formats

```bash
# Patch version (1.2.3 → 1.2.4)
git commit -m "fix: resolve memory leak"
git commit -m "perf: optimize queries"
git commit -m "security: patch vulnerability"

# Minor version (1.2.3 → 1.3.0)  
git commit -m "feat: add user notifications"

# Major version (1.2.3 → 2.0.0)
git commit -m "feat!: redesign API"
```

## 🐳 Docker Images

```bash
# Development testing
docker pull i4o-oss/watchtower:latest-dev

# Production deployment
docker pull i4o-oss/watchtower:latest
docker pull i4o-oss/watchtower:v1.2.3
```

## 🔧 Commands

```bash
# Version management
./scripts/version.sh preview    # See next version
./scripts/version.sh current    # Show current version

# Branch setup
./scripts/setup-branches.sh     # Create dev branch

# Dependencies
./scripts/install-deps.sh       # Install SVU, GoReleaser, etc.

# GoReleaser (backup)
goreleaser check                # Validate config
```

## 📋 Branch Strategy

- **main**: Production releases (auto-deploy)
- **dev**: Integration & testing (latest-dev image)
- **feature/\***: Development branches
- **hotfix/\***: Emergency fixes

## 🚨 Emergency Hotfix

```bash
# From main branch
git checkout main && git pull
git checkout -b hotfix/critical-fix

# Make fix with proper commit message
git commit -m "security: patch critical CVE-2024-xxxx"

# Create PRs to both main and dev
git push origin hotfix/critical-fix
# → PR to main (triggers immediate release)
# → PR to dev (keeps branches synced)
```

## 🔍 Troubleshooting

### No Release Created After Main Merge
- Check commit messages use conventional format
- View GitHub Actions: https://github.com/i4o-oss/watchtower/actions
- Run `./scripts/version.sh preview` to test locally

### Docker Build Fails
- Check Action logs for errors
- Test build locally: `docker build -f docker/Dockerfile .`
- Verify secrets are configured in GitHub

### Wrong Version Number
- Ensure conventional commit messages
- Check commit history: `git log --oneline -10`
- Squash merge PRs for cleaner history

---

💡 **Need help?** Check the full guide: `.docs/RELEASE_WORKFLOW.md`