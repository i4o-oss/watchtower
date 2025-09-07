#!/bin/bash
# Install release management dependencies

set -euo pipefail

echo "🔧 Installing release management tools..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go first."
    exit 1
fi

# Install SVU for semantic versioning
echo "📦 Installing SVU..."
go install github.com/caarlos0/svu@latest

# Install GoReleaser (optional backup)
echo "📦 Installing GoReleaser..."
go install github.com/goreleaser/goreleaser/v2@latest

echo "✅ Installation complete!"
echo ""
echo "You can now use:"
echo "  ./scripts/version.sh preview   # Preview next version"
echo "  svu next                       # Check version directly"
echo "  goreleaser check               # Validate config"