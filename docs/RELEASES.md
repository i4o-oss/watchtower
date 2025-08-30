# Release Management

This document explains how to create releases for Watchtower using our automated release system.

## Overview

We use a combination of tools for release management:
- **SVU**: Semantic versioning based on conventional commits
- **GoReleaser**: Docker image builds and GitHub releases
- **Changie**: Changelog management
- **GitHub Actions**: Automated CI/CD pipeline

## Quick Release Process

1. **Make your changes** with conventional commit messages
2. **Preview the next version**: `./scripts/version.sh preview`
3. **Create and push a release**: `./scripts/version.sh release`

That's it! The GitHub Action will automatically:
- Build and push Docker images
- Create a GitHub release with changelog
- Tag the release with semantic version

## Detailed Process

### 1. Conventional Commits

Use conventional commit messages to automatically determine version bumps:

```bash
# Patch version (v1.0.0 -> v1.0.1)
git commit -m "fix: resolve authentication timeout issue"

# Minor version (v1.0.0 -> v1.1.0)
git commit -m "feat: add webhook notification support"

# Major version (v1.0.0 -> v2.0.0)  
git commit -m "feat!: redesign API endpoints"
# or
git commit -m "feat: redesign API endpoints

BREAKING CHANGE: API endpoints have been restructured"
```

### 2. Version Management Scripts

We provide a helper script at `scripts/version.sh`:

```bash
# Preview what the next version would be
./scripts/version.sh preview

# Show current version
./scripts/version.sh current

# Create a version tag locally
./scripts/version.sh create

# Push the latest tag to trigger release
./scripts/version.sh push

# Create and push in one command
./scripts/version.sh release
```

### 3. Manual Changelog Management (Optional)

If you want to manually manage changelog entries, you can use Changie:

```bash
# Install changie
go install github.com/miniscruff/changie@latest

# Add a new change entry
changie new

# Generate the changelog for a release
changie batch v1.2.3

# Merge unreleased changes
changie merge
```

## Docker Images

### Release Images
When you create a tag (e.g., `v1.2.3`), the following Docker images are built:

- `i4o-oss/watchtower:v1.2.3` (exact version)
- `i4o-oss/watchtower:v1.2` (minor version)
- `i4o-oss/watchtower:v1` (major version)
- `i4o-oss/watchtower:latest` (latest release)

### Development Images
Push to main branch creates development images:

- `i4o-oss/watchtower:main-dev`
- `i4o-oss/watchtower:main-staging`
- `i4o-oss/watchtower:latest-dev`
- `i4o-oss/watchtower:latest-staging`

## GitHub Actions

### Release Workflow (`.github/workflows/release.yml`)
- Triggered on tag push (`v*`)
- Uses GoReleaser to build Docker images
- Creates GitHub release with changelog
- Pushes images to Docker Hub

### Development Workflow (`.github/workflows/docker-build.yml`)
- Triggered on push to main or PR
- Builds development Docker images
- Pushes to Docker Hub with dev/staging tags

## Prerequisites

### Tools Installation

```bash
# SVU for semantic versioning
go install github.com/caarlos0/svu@latest

# GoReleaser for releases
go install github.com/goreleaser/goreleaser/v2@latest

# Changie for changelog management (optional)
go install github.com/miniscruff/changie@latest
```

### GitHub Repository Secrets

Make sure these secrets are configured in your GitHub repository:

- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_TOKEN`: Your Docker Hub access token
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Examples

### Example 1: Bug Fix Release

```bash
# Make your fix
git add .
git commit -m "fix: resolve memory leak in monitoring engine"
git push origin main

# Check what version this would create
./scripts/version.sh preview
# Output: Current version: v1.2.0
#         Next version would be: v1.2.1

# Create and push the release
./scripts/version.sh release
```

### Example 2: Feature Release

```bash
# Add your feature
git add .
git commit -m "feat: add Prometheus metrics endpoint"
git push origin main

# Preview and release
./scripts/version.sh preview
# Output: Current version: v1.2.1
#         Next version would be: v1.3.0

./scripts/version.sh release
```

### Example 3: Breaking Change

```bash
# Make breaking changes
git add .
git commit -m "feat!: restructure configuration format

BREAKING CHANGE: Configuration file format has changed.
See migration guide in docs/MIGRATION.md"
git push origin main

# Preview and release
./scripts/version.sh preview  
# Output: Current version: v1.3.0
#         Next version would be: v2.0.0

./scripts/version.sh release
```

## Troubleshooting

### No version change detected
- Check that you're using conventional commit messages
- Ensure commits follow the format: `type: description`
- Valid types: `feat`, `fix`, `perf`, `docs`, `chore`, `refactor`, `test`

### GoReleaser fails
- Check that Docker is running
- Verify Docker Hub credentials are set in GitHub secrets
- Ensure `.goreleaser.yml` syntax is correct

### Docker build fails
- Check that `docker/Dockerfile` exists and is valid
- Verify all dependencies are properly specified
- Check Node.js and Go versions in workflows match project requirements

## Best Practices

1. **Use conventional commits** consistently
2. **Test locally** before creating releases
3. **Keep changelogs** up to date for major releases
4. **Use semantic versioning** appropriately:
   - Patch (bug fixes): 1.0.0 → 1.0.1
   - Minor (new features): 1.0.0 → 1.1.0
   - Major (breaking changes): 1.0.0 → 2.0.0
5. **Review generated changelogs** before finalizing releases
6. **Tag releases** from main branch only