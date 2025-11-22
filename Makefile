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
# RELEASE TARGETS
# ----------------------


# ----------------------
# MANUAL PUBLISH (Universal)
# ----------------------
publish: check-clean build
	@# 1. Find the latest tag
	@TAG=$$(git tag --list "v*" | sort -V | tail -n1); \
	if [ -z "$$TAG" ]; then \
	  echo "❌ Error: No Git tags found."; \
	  exit 1; \
	fi; \
	VERSION=$${TAG#v}; \
	\
	# 2. Determine npm dist-tag based on version string \
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
	# 3. Temporarily sync package.json \
	npm version $$VERSION --no-git-tag-version --allow-same-version > /dev/null; \
	\
	# 4. Publish (with error handling to ensure revert) \
	if npm publish --access public --tag $$DIST_TAG; then \
	  echo "✅ Publish successful."; \
	else \
	  echo "❌ Publish failed."; \
	  git checkout package.json; \
	  exit 1; \
	fi; \
	\
	# 5. Revert package.json \
	git checkout package.json; \
	echo "🔄 Reverted package.json to clean state."
tag-beta: check-clean build
	@# Find the latest tag specifically for the CURRENT version (e.g. v0.1.5-beta.*)
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
	@# Find the latest tag specifically for the CURRENT version (e.g. v0.1.5-rc.*)
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