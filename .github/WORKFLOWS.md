# GitHub Actions Workflows Setup

This document provides setup instructions for the GitHub Actions workflows in this repository.

## Docker Build and Push Workflow

The `docker-build.yml` workflow automatically builds and pushes Docker images to Docker Hub with multi-platform support.

### Required Secrets

Before the workflow can run successfully, you need to configure the following repository secrets:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username | Yes |
| `DOCKERHUB_TOKEN` | Your Docker Hub access token | Yes |

### Creating Docker Hub Access Token

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to **Account Settings** → **Security**
3. Click **New Access Token**
4. Give it a descriptive name (e.g., "GitHub Actions")
5. Select appropriate permissions (Read, Write, Delete)
6. Copy the generated token and use it as `DOCKERHUB_TOKEN`

## Workflow Triggers

The workflow is triggered by:

- **Push to main branch**: Builds and pushes images tagged as `latest-production` and `latest-staging`
- **Pull requests**: Builds images but doesn't push them (testing only)
- **Version tags**: Builds and pushes images with semantic version tags (e.g., `v1.0.0-production`)

## Image Tags

The workflow creates the following image tags:

### Production Environment
- `latest-production` (main branch)
- `v1.0.0-production` (version tags)
- `main-production` (main branch)
- `pr-123-production` (pull requests)

### Staging Environment
- `latest-staging` (main branch)
- `v1.0.0-staging` (version tags)
- `main-staging` (main branch)
- `pr-123-staging` (pull requests)

## Multi-Platform Support

Images are built for the following architectures:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64)

## Build Optimization

The workflow includes several optimizations:

- **GitHub Actions Cache**: Caches Docker layers between builds
- **Environment-specific caching**: Separate cache scopes for production and staging
- **Inline cache**: Enables BuildKit inline cache for faster builds
- **Multi-stage builds**: Leverages the multi-stage Dockerfile for optimal image size

## Manual Workflow Dispatch

You can manually trigger the workflow:

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Docker Build and Push** workflow
4. Click **Run workflow**
5. Choose the branch and click **Run workflow**

## Monitoring Builds

To monitor your builds:

1. Go to the **Actions** tab in your repository
2. Click on any workflow run to see detailed logs
3. Each matrix job (production/staging) will show separately
4. Check the **Build and push Docker image** step for detailed build logs

## Docker Hub Repository

Make sure your Docker Hub repository exists:
- Repository name: `i4o-oss/watchtower`
- Visibility: Public or Private (as needed)
- Update the `IMAGE_NAME` environment variable in the workflow if using a different repository

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are correct
   - Check that the access token has appropriate permissions

2. **Build Fails**
   - Check the Dockerfile path (`./docker/Dockerfile`)
   - Ensure all required files are present in the repository

3. **Multi-platform Build Issues**
   - Docker Buildx automatically handles cross-platform builds
   - Check the workflow logs for platform-specific errors

4. **Cache Issues**
   - GitHub Actions cache has size limits
   - Old cache entries are automatically evicted

### Getting Help

If you encounter issues:
1. Check the workflow logs in the Actions tab
2. Review the error messages in the failed steps
3. Verify all required secrets are configured correctly
4. Ensure the Dockerfile builds successfully locally

## Local Testing

To test the Docker build locally:

```bash
# Build for single platform
docker build -f docker/Dockerfile -t watchtower:local .

# Build for multiple platforms (requires buildx)
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -f docker/Dockerfile -t watchtower:local .
```

## Security Considerations

- Access tokens should have minimal required permissions
- Use repository secrets, never commit tokens to code
- Regularly rotate access tokens
- Monitor Docker Hub for unauthorized access
- Consider using GitHub Container Registry (ghcr.io) as an alternative

## Customization

To customize the workflow:

1. **Change image repository**: Update `IMAGE_NAME` environment variable
2. **Modify platforms**: Update the `platforms` field in the build step
3. **Add build arguments**: Add them to the matrix configuration
4. **Change triggers**: Modify the `on` section of the workflow

## Next Steps

After setting up the secrets, your workflow will automatically:
- Build Docker images on every push to main
- Test builds on pull requests
- Push tagged images to Docker Hub
- Provide multi-platform support
- Optimize builds with caching

The images will be available at: `docker.io/i4o-oss/watchtower:latest-production`