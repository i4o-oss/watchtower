#!/bin/bash
# Installation script for release management dependencies

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

# Check if Go is installed
check_go() {
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed. Please install Go first."
        exit 1
    fi
    print_info "Go version: $(go version)"
}

# Install SVU
install_svu() {
    print_info "Installing SVU for semantic versioning..."
    go install github.com/caarlos0/svu@latest
    print_success "SVU installed successfully"
}

# Install GoReleaser
install_goreleaser() {
    print_info "Installing GoReleaser..."
    go install github.com/goreleaser/goreleaser/v2@latest
    print_success "GoReleaser installed successfully"
}

# Install Changie (optional)
install_changie() {
    print_info "Installing Changie for changelog management..."
    go install github.com/miniscruff/changie@latest
    print_success "Changie installed successfully"
}

# Verify installations
verify_installations() {
    print_info "Verifying installations..."
    
    if command -v svu &> /dev/null; then
        print_success "SVU: $(svu --version)"
    else
        print_error "SVU installation failed"
    fi
    
    if command -v goreleaser &> /dev/null; then
        print_success "GoReleaser: $(goreleaser --version | head -n1)"
    else
        print_error "GoReleaser installation failed"
    fi
    
    if command -v changie &> /dev/null; then
        print_success "Changie: $(changie --version)"
    else
        print_warning "Changie not installed (optional)"
    fi
}

# Main installation
main() {
    print_info "Installing release management dependencies for Watchtower"
    echo
    
    check_go
    echo
    
    install_svu
    install_goreleaser
    install_changie
    echo
    
    verify_installations
    echo
    
    print_success "All dependencies installed successfully!"
    print_info "You can now use:"
    echo "  ./scripts/version.sh preview   # Preview next version"
    echo "  ./scripts/version.sh release   # Create and push release"
    echo "  goreleaser check               # Validate configuration"
    echo "  changie new                    # Add changelog entry"
}

main "$@"