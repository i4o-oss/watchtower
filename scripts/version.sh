#!/bin/bash
# Simple version preview script

set -euo pipefail

# Check if SVU is installed
if ! command -v svu &> /dev/null; then
    echo "❌ SVU not installed. Install it:"
    echo "  go install github.com/caarlos0/svu@latest"
    exit 1
fi

# Get current version
get_current_version() {
    git describe --tags --abbrev=0 2>/dev/null || echo "none"
}

# Show what the next version would be
preview_next_version() {
    local current_version=$(get_current_version)
    local next_version
    
    if [ "$current_version" = "none" ]; then
        echo "ℹ️  No existing tags - first release will be v0.1.0"
        echo "ℹ️  To set a different first version: git tag v1.0.0 && git push origin v1.0.0"
    else
        next_version=$(svu next 2>/dev/null || echo "no change")
        echo "ℹ️  Current version: $current_version"
        echo "ℹ️  Next version would be: $next_version"
        
        if [ "$next_version" = "no change" ]; then
            echo "💡 No version bump detected - use conventional commit messages:"
            echo "   feat: new feature (minor bump)"
            echo "   fix: bug fix (patch bump)"
            echo "   feat!: breaking change (major bump)"
        fi
    fi
}

case "${1:-preview}" in
    "preview"|"p")
        preview_next_version
        ;;
    "current")
        echo "Current version: $(get_current_version)"
        ;;
    *)
        echo "Usage: $0 [preview|current]"
        echo ""
        echo "preview  - Show what the next version would be"
        echo "current  - Show current version"
        echo ""
        echo "Note: Releases are created automatically when you merge to main branch"
        ;;
esac