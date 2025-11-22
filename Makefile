# ================================
# Tag-Driven Release Automation
# For proto-to-trpc
# ================================

# FORCE BASH (Fixes "[[ ]]" syntax errors on macOS/Linux)
SHELL := /bin/bash

PKG := proto-to-trpc

# Current version from package.json
CURRENT_VERSION := $(shell node -p "require('./package.json').version")

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

# Creates the tag (e.g. make tag-beta)
tag-beta: check-clean build
	@LAST_BETA=$$(git tag --list "v$(CURRENT_VERSION)-beta.*" | sort -V | tail -n1); \
	if [ -z "$$LAST_BETA" ]; then \
	  NEW_TAG="v$(CURRENT_VERSION)-beta.0"; \
	else \
	  NEW_TAG=$$(node -e "const last='$$LAST_BETA'; const num=parseInt(last.split('.').pop()); console.log(last.replace(/\.[0-9]+$$/, '.' + (num + 1)))"); \
	fi; \
	echo "Creating beta tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

tag-rc: check-clean build
	@LAST_RC=$$(git tag --list "v$(CURRENT_VERSION)-rc.*" | sort -V | tail -n1); \
	if [ -z "$$LAST_RC" ]; then \
	  NEW_TAG="v$(CURRENT_VERSION)-rc.0"; \
	else \
	  NEW_TAG=$$(node -e "const last='$$LAST_RC'; const num=parseInt(last.split('.').pop()); console.log(last.replace(/\.[0-9]+$$/, '.' + (num + 1)))"); \
	fi; \
	echo "Creating rc tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

tag-patch: check-clean build
	@NEW_VERSION=$(shell node -p "const v='$(CURRENT_VERSION)'.split('.'); v[2]++; v.join('.')"); \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Creating patch tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

tag-minor: check-clean build
	@NEW_VERSION=$(shell node -p "const v='$(CURRENT_VERSION)'.split('.'); v[1]++; v[2]=0; v.join('.')"); \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Creating minor tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

tag-major: check-clean build
	@NEW_VERSION=$(shell node -p "const v='$(CURRENT_VERSION)'.split('.'); v[0]++; v[1]=0; v[2]=0; v.join('.')"); \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Creating major tag: $$NEW_TAG"; \
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