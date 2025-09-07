# Watchtower Release Workflow

This document describes the complete release workflow for Watchtower, using a dev/main branching strategy with automated releases.

## 🌊 Workflow Overview

```
feature/fix branch → dev branch → main branch → automated release
     ↓                  ↓           ↓              ↓
   develop           test dev     production    Docker Hub
                    image        release       + GitHub Release
```

## 📋 Complete Workflow Steps

### 1. Feature Development

```bash
# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/new-monitoring-feature

# Make your changes with conventional commits
git add .
git commit -m "feat: add webhook notification support"
git commit -m "fix: resolve memory leak in monitoring engine"
git commit -m "docs: update API documentation"

# Push feature branch
git push origin feature/new-monitoring-feature
```

### 2. Create PR to Dev Branch

- Open PR from `feature/new-monitoring-feature` → `dev`
- Get code review and approval
- Merge to `dev` branch

### 3. Automated Dev Image Build

**What happens automatically when merged to `dev`:**
- GitHub Action triggers (`.github/workflows/docker-build.yml`)
- Builds Docker image with tag: `i4o-oss/watchtower:latest-dev`
- Pushes to Docker Hub

### 4. Test Dev Image

```bash
# Pull and test the dev image
docker pull i4o-oss/watchtower:latest-dev

# Run tests in your staging environment
docker-compose -f docker-compose.dev.yml up
# Perform manual testing, integration tests, etc.
```

### 5. Create PR to Main Branch

Once dev testing is complete:
- Open PR from `dev` → `main`
- Final review and approval
- Merge to `main` branch

### 6. Automated Production Release

**What happens automatically when merged to `main`:**

1. **Version Detection**: GitHub Action uses SVU to detect version bump from conventional commits
2. **Version Bump**: Creates new semantic version tag (e.g., `v1.2.3`)
3. **Docker Build**: Builds production Docker image
4. **Docker Push**: Pushes image with two tags:
   - `i4o-oss/watchtower:v1.2.3` (exact version)
   - `i4o-oss/watchtower:latest` (latest release)
5. **Changelog**: Generates changelog from commit messages
6. **GitHub Release**: Creates GitHub release with changelog

## 🏷️ Conventional Commits for Version Bumping

Use these commit message formats for automatic version detection:

```bash
# PATCH version bump (1.2.3 → 1.2.4)
git commit -m "fix: resolve authentication timeout issue"
git commit -m "perf: optimize database queries"
git commit -m "security: patch XSS vulnerability"

# MINOR version bump (1.2.3 → 1.3.0)
git commit -m "feat: add webhook notification support"
git commit -m "feat: implement user roles and permissions"

# MAJOR version bump (1.2.3 → 2.0.0)
git commit -m "feat!: redesign API endpoints"
# or
git commit -m "feat: redesign API endpoints

BREAKING CHANGE: API endpoints have been restructured"
```

## 🐳 Docker Images

### Development Images
- **Tag**: `i4o-oss/watchtower:latest-dev`
- **When**: Pushed to `dev` branch
- **Purpose**: Testing and validation

### Production Images
- **Tags**:
  - `i4o-oss/watchtower:v1.2.3` (exact version)
  - `i4o-oss/watchtower:latest` (latest release)
- **When**: Pushed to `main` branch (with version bump)
- **Purpose**: Production deployment

## 🔧 GitHub Actions Workflows

### 1. Development Build (`.github/workflows/dev-release.yml`)
- **Trigger**: Push/PR to `dev` branch
- **Action**: Build and push `latest-dev` image
- **Platform**: linux/amd64

### 2. Main Release (`.github/workflows/main-release.yml`)
- **Trigger**: Push to `main` branch
- **Actions**:
  - Detect version with SVU
  - Create and push version tag
  - Build and push production Docker images
  - Generate changelog
  - Create GitHub release

## 📦 Installation & Usage

### For Development Testing
```bash
docker pull i4o-oss/watchtower:latest-dev
```

### For Production
```bash
# Latest release
docker pull i4o-oss/watchtower:latest

# Specific version
docker pull i4o-oss/watchtower:v1.2.3
```

### Docker Compose Example
```yaml
services:
  watchtower:
    image: i4o-oss/watchtower:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
    depends_on:
      - postgres
      - redis
```

## 🛠️ Branch Strategy

### Branch Structure
- **`main`**: Production-ready code, triggers releases
- **`dev`**: Integration branch for testing
- **`feature/*`**: Feature development branches
- **`fix/*`**: Bug fix branches
- **`hotfix/*`**: Emergency production fixes

### Branch Rules
1. **Direct commits to `main`**: ❌ Not allowed
2. **Direct commits to `dev`**: ❌ Not allowed (use PRs)
3. **Feature branches**: ✅ Create from `dev`, merge back to `dev`
4. **Hotfixes**: ✅ Can be created from `main`, merge to both `main` and `dev`

## 🚨 Hotfix Process

For urgent production fixes:

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# Make the fix
git commit -m "security: patch critical vulnerability (CVE-2024-xxxx)"

# Push and create PRs to both main and dev
git push origin hotfix/critical-security-fix

# Create PR to main (will trigger immediate release)
# Create PR to dev (to keep branches in sync)
```

## 📊 Monitoring & Troubleshooting

### Check Workflow Status
- Visit: https://github.com/i4o-oss/watchtower/actions
- Monitor build logs for failures
- Check Docker Hub for successful image pushes

### Common Issues

#### No Release Created
**Symptom**: Merge to main doesn't create release
**Causes**:
- No conventional commit messages
- No version bump detected
- Missing GitHub secrets

**Solution**:
```bash
# Check what version would be created
./scripts/version.sh preview

# Ensure conventional commit format
git log --oneline -10
```

#### Docker Build Failures
**Symptom**: Docker image build fails
**Causes**:
- Missing dependencies
- Frontend build errors
- Docker Hub authentication issues

**Solution**:
- Check GitHub Action logs
- Test Docker build locally
- Verify secrets are configured

#### Version Detection Issues
**Symptom**: Wrong version or no version bump
**Causes**:
- Non-conventional commit messages
- Merge commits without proper format

**Solution**:
- Use squash merging for cleaner commit history
- Follow conventional commit format strictly

## ⚙️ Configuration Files

### GitHub Workflows
- `.github/workflows/docker-build.yml` - Dev image builds
- `.github/workflows/main-release.yml` - Production releases

### Release Tools
- `.goreleaser.yml` - GoReleaser configuration (backup)
- `.changie.yaml` - Changelog generation
- `scripts/version.sh` - Manual version management

### Required GitHub Secrets
- `DOCKERHUB_USERNAME` - Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token
- `GITHUB_TOKEN` - Automatically provided

## 🎯 Best Practices

### Commit Messages
- Use conventional commit format consistently
- Include scope when relevant: `feat(api): add user authentication`
- Write clear, descriptive messages
- Use `BREAKING CHANGE:` for major version bumps

### Branch Management
- Keep feature branches small and focused
- Regularly sync dev branch with main
- Delete merged feature branches
- Use PR templates and reviews

### Release Strategy
- Test thoroughly in dev before promoting to main
- Use semantic versioning appropriately
- Document breaking changes clearly
- Monitor releases and rollback if needed

### Docker Images
- Always test latest-dev before promoting
- Use specific version tags in production
- Keep images lightweight and secure
- Regular security updates

## 🔄 Migration from Old Workflow

If migrating from the old workflow:

1. **Update local repos**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b dev
   git push origin dev
   ```

2. **Update CI/CD configs** (already done in this setup)

3. **Update deployment configs** to use new image tags

4. **Train team** on new workflow and conventional commits

---

This workflow ensures reliable, automated releases with proper testing stages and clear versioning. The separation of dev and main branches provides safety while maintaining development velocity.
