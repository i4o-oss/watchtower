#!/bin/bash
# Version management script using SVU for semantic versioning

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if SVU is installed
check_svu() {
    if ! command -v svu &> /dev/null; then
        print_error "SVU is not installed. Please install it first:"
        echo "  go install github.com/caarlos0/svu@latest"
        echo "  # or"
        echo "  brew install caarlos0/tap/svu"
        exit 1
    fi
}

# Get current version
get_current_version() {
    local current_tag
    current_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    
    if [ -z "$current_tag" ]; then
        echo "v0.0.0"
    else
        echo "$current_tag"
    fi
}

# Show what the next version would be
preview_next_version() {
    local current_version
    local next_version
    
    current_version=$(get_current_version)
    next_version=$(svu next 2>/dev/null || echo "No version change")
    
    print_info "Current version: $current_version"
    print_info "Next version would be: $next_version"
    
    # Show commits since last tag
    if [ "$current_version" != "v0.0.0" ]; then
        print_info "Commits since $current_version:"
        git log --oneline "$current_version"..HEAD | head -10 | sed 's/^/  /'
        
        local commit_count
        commit_count=$(git rev-list --count "$current_version"..HEAD)
        if [ "$commit_count" -gt 10 ]; then
            echo "  ... and $((commit_count - 10)) more commits"
        fi
    else
        print_info "No previous tags found - this would be the first release"
    fi
}

# Create and push a new version tag
create_version() {
    local next_version
    local current_version
    
    # Check if working directory is clean
    if [ -n "$(git status --porcelain)" ]; then
        print_error "Working directory is not clean. Please commit or stash your changes."
        exit 1
    fi
    
    # Check if we're on main branch
    local current_branch
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        print_error "You must be on the main branch to create releases (current: $current_branch)"
        print_info "The new workflow uses GitHub Actions to create releases automatically"
        print_info "when changes are merged to main. Manual version creation is only"
        print_info "for emergency situations."
        echo
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Aborting version creation"
            print_info "To create a release:"
            print_info "  1. Merge your changes to dev branch"
            print_info "  2. Test the latest-dev image"
            print_info "  3. Create PR from dev to main"
            print_info "  4. Merge to main (triggers automatic release)"
            exit 0
        fi
    fi
    
    current_version=$(get_current_version)
    next_version=$(svu next 2>/dev/null)
    
    if [ -z "$next_version" ] || [ "$next_version" = "$current_version" ]; then
        print_warning "No new version to create. Current version: $current_version"
        print_info "Make sure you have commits with conventional commit messages (feat:, fix:, etc.)"
        exit 0
    fi
    
    print_info "Creating new version: $current_version → $next_version"
    
    # Create annotated tag
    git tag -a "$next_version" -m "Release $next_version"
    
    print_success "Created tag: $next_version"
    print_info "To trigger the release workflow, push the tag:"
    print_info "  git push origin $next_version"
}

# Push the latest tag
push_tag() {
    local latest_tag
    latest_tag=$(git describe --tags --abbrev=0 2>/dev/null)
    
    if [ -z "$latest_tag" ]; then
        print_error "No tags found to push"
        exit 1
    fi
    
    print_info "Pushing tag: $latest_tag"
    git push origin "$latest_tag"
    print_success "Tag pushed! Release workflow should start soon."
    print_info "Check: https://github.com/i4o-oss/watchtower/actions"
}

# Main script logic
main() {
    check_svu
    
    case "${1:-help}" in
        "preview"|"p")
            preview_next_version
            ;;
        "create"|"c")
            create_version
            ;;
        "push")
            push_tag
            ;;
        "release"|"r")
            create_version
            push_tag
            ;;
        "current")
            echo "Current version: $(get_current_version)"
            ;;
        "help"|"-h"|"--help"|*)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  preview, p    Show what the next version would be"
            echo "  create, c     Create a new version tag locally"
            echo "  push          Push the latest tag to trigger release"
            echo "  release, r    Create and push a new version (create + push)"
            echo "  current       Show current version"
            echo "  help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 preview    # See what version would be created"
            echo "  $0 release    # Create and push new version in one step"
            echo ""
            echo "Note: Requires conventional commit messages (feat:, fix:, etc.)"
            ;;
    esac
}

main "$@"