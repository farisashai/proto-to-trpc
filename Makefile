# ================================
# Tag-Driven Release Automation
# For proto-to-trpc
# ================================

PKG := proto-to-trpc

# Current version from package.json (e.g. "0.1.5")
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
# HELP
# ----------------------

help:
	@echo "Available targets:"
	@echo "  make beta        - Create a new beta tag (v$(CURRENT_VERSION)-beta.*)"
	@echo "  make rc          - Create a new rc tag (v$(CURRENT_VERSION)-rc.*)"
	@echo "  make patch       - Create a new patch tag"
	@echo "  make minor       - Create a new minor tag"
	@echo "  make major       - Create a new major tag"
	@echo "  make help        - Show this help message"

# ----------------------
# RELEASE TARGETS
# ----------------------

beta: check-clean build
	@# Find the latest tag specifically for the CURRENT version (e.g. v0.1.5-beta.*)
	@LAST_BETA=$$(git tag --list "v$(CURRENT_VERSION)-beta.*" | sort -V | tail -n1); \
	if [ -z "$$LAST_BETA" ]; then \
	  NEW_TAG="v$(CURRENT_VERSION)-beta.0"; \
	else \
	  NEW_TAG=$$(node -p "const last='$$LAST_BETA'; const num=parseInt(last.split('.').pop()); console.log(last.replace(/\.[0-9]+$$/, '.' + (num + 1)))"); \
	fi; \
	echo "Creating beta tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

rc: check-clean build
	@# Find the latest tag specifically for the CURRENT version (e.g. v0.1.5-rc.*)
	@LAST_RC=$$(git tag --list "v$(CURRENT_VERSION)-rc.*" | sort -V | tail -n1); \
	if [ -z "$$LAST_RC" ]; then \
	  NEW_TAG="v$(CURRENT_VERSION)-rc.0"; \
	else \
	  NEW_TAG=$$(node -p "const last='$$LAST_RC'; const num=parseInt(last.split('.').pop()); console.log(last.replace(/\.[0-9]+$$/, '.' + (num + 1)))"); \
	fi; \
	echo "Creating rc tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

# Note: The following targets create a tag based on package.json, 
# but they do NOT update package.json. 
patch: check-clean build
	@NEW_VERSION=$(shell node -p "const v='$(CURRENT_VERSION)'.split('.'); v[2]++; v.join('.')"); \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Creating patch tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

minor: check-clean build
	@NEW_VERSION=$(shell node -p "const v='$(CURRENT_VERSION)'.split('.'); v[1]++; v[2]=0; v.join('.')"); \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Creating minor tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

major: check-clean build
	@NEW_VERSION=$(shell node -p "const v='$(CURRENT_VERSION)'.split('.'); v[0]++; v[1]=0; v[2]=0; v.join('.')"); \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Creating major tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG