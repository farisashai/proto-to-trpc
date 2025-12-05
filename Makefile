# ================================
# Tag-Driven Release Automation
# For proto-to-trpc
# ================================

# FORCE BASH (Fixes "[[ ]]" syntax errors on macOS/Linux)
SHELL := /bin/bash

PKG := proto-to-trpc

# Current version from package.json (this is the source of truth)
VERSION := $(shell node -p "require('./package.json').version")

# Ensure working tree clean
check-clean:
	@if [ -n "$$(git status --porcelain)" ]; then \
	  echo "ERROR: Working tree is dirty. Commit or stash changes."; \
	  exit 1; \
	fi

# Build before tagging
build:
	pnpm install --frozen-lockfile
	pnpm build

# ----------------------
# RELEASE TARGETS
# ----------------------
# All tags are based on the version in package.json.
# To release a new version: update package.json, commit, then run the appropriate tag command.

# Pre-release tags: auto-increment suffix only if same base version already tagged
tag-beta: check-clean build
	@LAST=$$(git tag --list "v$(VERSION)-beta.*" | sort -V | tail -n1); \
	if [ -z "$$LAST" ]; then \
	  NEW_TAG="v$(VERSION)-beta.0"; \
	else \
	  NEW_TAG=$$(node -e "const last='$$LAST'; const num=parseInt(last.split('.').pop()); console.log(last.replace(/\.[0-9]+$$/, '.' + (num + 1)))"); \
	fi; \
	echo "Creating beta tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

tag-rc: check-clean build
	@LAST=$$(git tag --list "v$(VERSION)-rc.*" | sort -V | tail -n1); \
	if [ -z "$$LAST" ]; then \
	  NEW_TAG="v$(VERSION)-rc.0"; \
	else \
	  NEW_TAG=$$(node -e "const last='$$LAST'; const num=parseInt(last.split('.').pop()); console.log(last.replace(/\.[0-9]+$$/, '.' + (num + 1)))"); \
	fi; \
	echo "Creating rc tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

# Stable release: tags exactly the version in package.json
# Update package.json version first, commit, then run: make tag
tag: check-clean build
	@NEW_TAG="v$(VERSION)"; \
	if git rev-parse "$$NEW_TAG" >/dev/null 2>&1; then \
	  echo "ERROR: Tag $$NEW_TAG already exists. Update package.json version first."; \
	  exit 1; \
	fi; \
	echo "Creating release tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

# ----------------------
# MANUAL PUBLISH (Universal)
# ----------------------
publish: check-clean build
	@echo "🔍 finding latest tag..."
	@# Find the latest reachable tag
	@TAG=$$(git describe --tags --abbrev=0 2>/dev/null || echo ""); \
	if [ -z "$$TAG" ]; then \
	  echo "❌ Error: No Git tags found."; \
	  exit 1; \
	fi; \
	VERSION=$${TAG#v}; \
	\
	if [[ "$$VERSION" == *"beta"* ]]; then \
	  DIST_TAG="beta"; \
	elif [[ "$$VERSION" == *"rc"* ]]; then \
	  DIST_TAG="rc"; \
	else \
	  DIST_TAG="latest"; \
	fi; \
	\
	echo "🚀 Detected Git Tag: $$TAG"; \
	echo "📦 Publishing Version: $$VERSION as @$$DIST_TAG"; \
	\
	npm version $$VERSION --no-git-tag-version --allow-same-version > /dev/null; \
	\
	if npm publish --access public --tag $$DIST_TAG; then \
	  echo "✅ Publish successful."; \
	else \
	  echo "❌ Publish failed. Reverting package.json..."; \
	  git checkout package.json; \
	  exit 1; \
	fi; \
	\
	git checkout package.json; \
	echo "🔄 Reverted package.json to clean state."