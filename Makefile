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

push-tag:

# ----------------------
# MANUAL PUBLISH
# ----------------------
publish: build
	@# 1. Find the latest tag (e.g. v0.1.5-beta.7)
	@TAG=$$(git tag --list "v*" | sort -V | tail -n1); \
	if [ -z "$$TAG" ]; then echo "Error: No tags found."; exit 1; fi; \
	VERSION=$${TAG#v}; \
	echo "🚀 Preparing to publish version: $$VERSION"; \
	\
	# 2. Determine npm dist-tag (beta, rc, or latest) \
	if [[ "$$VERSION" == *"beta"* ]]; then DIST_TAG="beta"; \
	elif [[ "$$VERSION" == *"rc"* ]]; then DIST_TAG="rc"; \
	else DIST_TAG="latest"; fi; \
	echo "📦 NPM Tag: $$DIST_TAG"; \
	\
	# 3. Temporarily set package.json version \
	npm version $$VERSION --no-git-tag-version --allow-same-version; \
	\
	# 4. Publish (Interactive: will ask for OTP if needed) \
	npm publish --access public --tag $$DIST_TAG; \
	\
	# 5. Revert package.json to keep git clean \
	git checkout package.json; \
	echo "✅ Successfully published $$VERSION and reverted package.json"

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