#!/bin/bash
# Setup script to create dev branch for the new workflow

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
}

# Check if we're on main branch
check_main_branch() {
    local current_branch
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        print_error "You must be on the main branch to run this setup"
        print_info "Current branch: $current_branch"
        exit 1
    fi
}

# Create dev branch
create_dev_branch() {
    # Check if dev branch already exists
    if git show-ref --verify --quiet refs/heads/dev; then
        print_warning "Dev branch already exists locally"
    else
        print_info "Creating dev branch from main..."
        git checkout -b dev
        print_success "Created dev branch"
    fi
    
    # Check if remote dev branch exists
    if git ls-remote --exit-code --heads origin dev > /dev/null 2>&1; then
        print_warning "Dev branch already exists on remote"
        print_info "Switching to dev branch..."
        git checkout dev
        git pull origin dev
    else
        print_info "Pushing dev branch to remote..."
        git checkout dev
        git push -u origin dev
        print_success "Pushed dev branch to remote"
    fi
}

# Update branch protection (informational)
setup_branch_protection() {
    print_info "Branch setup complete!"
    print_warning "Don't forget to set up branch protection rules on GitHub:"
    echo
    echo "1. Go to: https://github.com/i4o-oss/watchtower/settings/branches"
    echo "2. Add protection rule for 'main' branch:"
    echo "   - Require pull request reviews"
    echo "   - Require status checks to pass"
    echo "   - Restrict pushes"
    echo "3. Add protection rule for 'dev' branch:"
    echo "   - Require pull request reviews"
    echo "   - Require status checks to pass"
    echo
}

# Main setup function
main() {
    print_info "Setting up dev/main branching workflow for Watchtower"
    echo
    
    check_git_repo
    check_main_branch
    
    # Ensure we have latest main
    print_info "Updating main branch..."
    git pull origin main
    
    create_dev_branch
    echo
    
    setup_branch_protection
    echo
    
    print_success "Branch setup completed!"
    print_info "You can now:"
    echo "  1. Create feature branches from dev: git checkout dev && git checkout -b feature/my-feature"
    echo "  2. Push to dev branch to trigger latest-dev image builds"
    echo "  3. Merge dev to main to trigger production releases"
    echo
    print_info "Current branch structure:"
    git branch -a | grep -E "(main|dev)" | head -10
}

main "$@"