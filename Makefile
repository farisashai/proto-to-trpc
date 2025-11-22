# ================================
# Tag-Driven Release Automation
# For proto-to-trpc
# ================================

PKG := proto-to-trpc

# Determine current package.json version
CURRENT_VERSION := $(shell node -p "require('./package.json').version")

# Get the latest tag matching vX.Y.Z or prereleases
LATEST_TAG := $(shell git tag --list 'v*' --sort=-v:refname | head -n1)

# Utility: ensure working tree clean
check-clean:
	@if [ -n "$$(git status --porcelain)" ]; then \
	  echo "ERROR: Working tree is dirty. Commit or stash changes."; \
	  exit 1; \
	fi

# Optional: ensure releases run on main or master
check-branch:
	@if [ "$$(git rev-parse --abbrev-ref HEAD)" != "main" ] && \
	    [ "$$(git rev-parse --abbrev-ref HEAD)" != "master" ]; then \
	    echo "ERROR: Releases must be run from main/master."; \
	    exit 1; \
	fi

# Build before tagging (optional)
build:
	pnpm install --frozen-lockfile
	pnpm build

# ----------------------
# VERSION HELPERS
# ----------------------

# Increment semantic version
define bump_patch
$(shell node -p "const v='$(1)'.split('.'); v[2]++; v.join('.')")
endef

define bump_minor
$(shell node -p "const v='$(1)'.split('.'); v[1]++; v[2]=0; v.join('.')")
endef

define bump_major
$(shell node -p "const v='$(1)'.split('.'); v[0]++; v[1]=0; v[2]=0; v.join('.')")
endef

# Increment prerelease versions (beta/rc)
define bump_prerelease
$(shell \
  TAG="$(1)"; \
  BASE=$${TAG%%-*}; \
  PRE=$${TAG#*-}; \
  NAME=$${PRE%%.*}; \
  NUM=$${PRE##*.}; \
  if [ "$$PRE" = "$$TAG" ]; then \
    echo "$(BASE)-$(2).0"; \
  else \
    if [ "$$NAME" = "$(2)" ]; then \
      NUM=$$((NUM+1)); \
      echo "$(BASE)-$(2).$$NUM"; \
    else \
      echo "$(BASE)-$(2).0"; \
    fi; \
  fi \
)
endef

# ----------------------
# RELEASE TARGETS
# ----------------------

# BETA RELEASE
beta: check-clean check-branch build
	@if echo "$(LATEST_TAG)" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+'; then \
	  NEW_TAG=v$(call bump_prerelease,$(LATEST_TAG),beta); \
	else \
	  NEW_TAG=v$(CURRENT_VERSION)-beta.0; \
	fi; \
	echo "Creating beta tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAGbeta: check-clean check-branch build
	@if echo "$(LATEST_TAG)" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+'; then \
	  NEW_TAG=v$(call bump_prerelease,$(LATEST_TAG),beta); \
	else \
	  NEW_TAG=v$(CURRENT_VERSION)-beta.0; \
	fi; \
	echo "Creating beta tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG


# RC RELEASE
rc: check-clean check-branch build
	@if echo "$(LATEST_TAG)" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+'; then \
	  NEW_TAG=v$(call bump_prerelease,$(LATEST_TAG),rc); \
	else \
	  NEW_TAG=v$(CURRENT_VERSION)-rc.0; \
	fi; \
	echo "Creating rc tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

# PATCH RELEASE
patch: check-clean check-branch build
	NEW_VERSION=$(call bump_patch,$(CURRENT_VERSION)); \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Creating patch tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

# MINOR RELEASE
minor: check-clean check-branch build
	NEW_VERSION=$(call bump_minor,$(CURRENT_VERSION)); \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Creating minor tag: $$NEW_TAG"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

# MAJOR RELEASE
major: check-clean check-branch build
	NEW_VERSION=$(call bump_major,$(CURRENT_VERSION)); \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Creating major tag: $$NEW_VERSION"; \
	git tag $$NEW_TAG; \
	git push origin $$NEW_TAG

# ----------------------
# HELP
# ----------------------
help:
	@echo "Tag-driven release commands:"
	@echo ""
	@echo "  make beta      -> create next beta tag: vX.Y.Z-beta.N"
	@echo "  make rc        -> create next rc tag:   vX.Y.Z-rc.N"
	@echo "  make patch     -> create patch tag:     vX.Y.(Z+1)"
	@echo "  make minor     -> create minor tag:     vX.(Y+1).0"
	@echo "  make major     -> create major tag:     v(X+1).0.0"
	@echo ""
	@echo "GitHub Actions will publish automatically when a tag is pushed."