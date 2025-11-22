# ================================
# Release Automation for proto-to-trpc
# ================================

PKG := proto-to-trpc

# Utility: ensure working tree clean
check-clean:
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "ERROR: Working tree is dirty. Commit or stash changes."; \
		exit 1; \
	fi

# Build before publishing
build:
	pnpm install --frozen-lockfile
	pnpm build

# --------------------
# BETA RELEASE
# --------------------
beta: check-clean build
	npm version prerelease --preid=beta
	npm publish --tag beta
	git push --follow-tags

# --------------------
# RC RELEASE
# --------------------
rc: check-clean build
	npm version prerelease --preid=rc
	npm publish --tag rc
	git push --follow-tags

# --------------------
# PATCH RELEASE
# --------------------
patch: check-clean build
	npm version patch
	npm publish --access public
	git push --follow-tags

# --------------------
# MINOR RELEASE
# --------------------
minor: check-clean build
	npm version minor
	npm publish --access public
	git push --follow-tags

# --------------------
# MAJOR RELEASE
# --------------------
major: check-clean build
	npm version major
	npm publish --access public
	git push --follow-tags

# --------------------
# VIEW HELP
# --------------------
help:
	@echo "Makefile commands:"
	@echo ""
	@echo "  make beta         -> bump prerelease (0.x.x-beta.N) & publish --tag beta"
	@echo "  make rc           -> bump prerelease (0.x.x-rc.N)   & publish --tag rc"
	@echo "  make patch        -> bump patch version & publish latest"
	@echo "  make minor        -> bump minor version & publish latest"
	@echo "  make major        -> bump major version & publish latest"
	@echo "  make build        -> build project using pnpm build"
	@echo "  make check-clean  -> ensure git working tree is clean"