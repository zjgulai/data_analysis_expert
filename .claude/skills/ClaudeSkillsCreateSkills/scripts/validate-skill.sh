#!/usr/bin/env bash
# Validate a skill directory against Agent Skills specification.
# Checks: SKILL.md exists, frontmatter name/description, line count, Windows paths.
# Usage: ./scripts/validate-skill.sh [path-to-skill-dir]
# Default: parent of scripts/ (i.e. this skill's root).

set -e

SKILL_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
SKILL_MD="$SKILL_DIR/SKILL.md"
PARENT_NAME=$(basename "$SKILL_DIR")
ERR=0
WARN=0

echo "========================================"
echo "Agent Skills Validator"
echo "========================================"
echo "Skill directory: $SKILL_DIR"
echo "Parent directory: $PARENT_NAME"
echo ""

# 1. SKILL.md exists
if [[ ! -f "$SKILL_MD" ]]; then
  echo "[FAIL] SKILL.md not found at $SKILL_MD"
  ERR=1
else
  echo "[OK] SKILL.md exists"
fi

# 2. Extract name and description from frontmatter
if [[ -f "$SKILL_MD" ]]; then
  NAME=""
  DESC=""
  in_front=0
  while IFS= read -r line; do
    if [[ "$line" == "---" ]]; then
      if [[ $in_front -eq 0 ]]; then
        in_front=1
      else
        break
      fi
      continue
    fi
    if [[ $in_front -eq 1 ]]; then
      if [[ "$line" =~ ^name:[[:space:]]*(.+)$ ]]; then
        NAME="${BASH_REMATCH[1]}"
        NAME="${NAME#"${NAME%%[![:space:]]*}"}"
        NAME="${NAME%"${NAME##*[![:space:]]}"}"
      fi
      if [[ "$line" =~ ^description:[[:space:]]*(.*)$ ]]; then
        DESC="${BASH_REMATCH[1]}"
        DESC="${DESC#"${DESC%%[![:space:]]*}"}"
        DESC="${DESC%"${DESC##*[![:space:]]}"}"
      fi
    fi
  done < "$SKILL_MD"

  # name validation
  if [[ -z "$NAME" ]]; then
    echo "[FAIL] frontmatter 'name' not found"
    ERR=1
  else
    if [[ ${#NAME} -gt 64 ]]; then
      echo "[FAIL] name length ${#NAME} > 64"
      ERR=1
    elif [[ "$NAME" =~ [^a-z0-9-] ]] || [[ "$NAME" == -* ]] || [[ "$NAME" == *- ]] || [[ "$NAME" == *--* ]]; then
      echo "[WARN] name should be 1-64 chars, lowercase letters/numbers/hyphens only, no leading/trailing/consecutive hyphens (got: $NAME)"
      WARN=1
    else
      echo "[OK] name='$NAME' (length ${#NAME})"
    fi
  fi

  # description validation
  if [[ -z "$DESC" ]]; then
    echo "[FAIL] frontmatter 'description' not found or empty"
    ERR=1
  else
    LEN=${#DESC}
    if [[ $LEN -lt 1 ]]; then
      echo "[FAIL] description empty"
      ERR=1
    elif [[ $LEN -gt 1024 ]]; then
      echo "[FAIL] description length $LEN > 1024"
      ERR=1
    else
      echo "[OK] description length $LEN (max 1024)"
    fi

    # Check for WHEN indicators
    if [[ "$DESC" =~ [Uu]se\ when ]] || [[ "$DESC" =~ 当.*时 ]] || [[ "$DESC" =~ 何时 ]]; then
      echo "[OK] description contains WHEN indicator"
    else
      echo "[WARN] description may lack WHEN indicator (e.g., 'Use when...')"
      WARN=1
    fi
  fi

  # name vs directory name
  if [[ -n "$NAME" ]] && [[ "$PARENT_NAME" != "$NAME" ]]; then
    echo "[WARN] name '$NAME' != directory '$PARENT_NAME' (spec recommends match; use kebab-case)"
    WARN=1
  fi

  # 3. Line count check (< 500 recommended)
  LINE_COUNT=$(wc -l < "$SKILL_MD" | tr -d ' ')
  if [[ $LINE_COUNT -gt 500 ]]; then
    echo "[WARN] SKILL.md has $LINE_COUNT lines (recommend < 500)"
    WARN=1
  else
    echo "[OK] SKILL.md has $LINE_COUNT lines (< 500)"
  fi

  # 4. Windows path check
  if grep -qE '\\[a-zA-Z]' "$SKILL_MD" 2>/dev/null; then
    echo "[WARN] Possible Windows-style paths found (use forward slashes)"
    WARN=1
  else
    echo "[OK] No Windows-style paths detected"
  fi

  # 5. Reference files check (optional)
  echo ""
  echo "--- Optional Files ---"
  if [[ -f "$SKILL_DIR/reference.md" ]]; then
    echo "[OK] reference.md exists"
  else
    echo "[INFO] reference.md not found (optional)"
  fi
  if [[ -f "$SKILL_DIR/examples.md" ]]; then
    echo "[OK] examples.md exists"
  else
    echo "[INFO] examples.md not found (optional)"
  fi
  if [[ -d "$SKILL_DIR/scripts" ]]; then
    echo "[OK] scripts/ directory exists"
  else
    echo "[INFO] scripts/ not found (optional)"
  fi
fi

echo ""
echo "========================================"
if [[ $ERR -eq 0 ]] && [[ $WARN -eq 0 ]]; then
  echo "Result: ALL PASSED"
  exit 0
elif [[ $ERR -eq 0 ]]; then
  echo "Result: PASSED with $WARN warning(s)"
  exit 0
else
  echo "Result: FAILED with $ERR error(s), $WARN warning(s)"
  exit 1
fi
