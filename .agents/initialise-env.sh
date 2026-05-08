#!/usr/bin/env bash

agent_environment_sourced=0

if [ -n "${BASH_SOURCE[0]:-}" ]; then
  agent_environment_script_path="${BASH_SOURCE[0]}"
  if [ "$agent_environment_script_path" != "$0" ]; then
    agent_environment_sourced=1
  fi
elif [ -n "${ZSH_EVAL_CONTEXT:-}" ]; then
  agent_environment_script_path="$0"
  case "$ZSH_EVAL_CONTEXT" in
    *:file) agent_environment_sourced=1 ;;
  esac
else
  agent_environment_script_path="$0"
fi

agent_environment_directory="$(cd -- "$(dirname -- "$agent_environment_script_path")" && pwd -P)"
agent_repository_root="$(cd -- "$agent_environment_directory/.." && pwd -P)"
agent_node_version_file="$agent_repository_root/.nvmrc"
agent_package_file="$agent_repository_root/package.json"

agent_prepend_path() {
  local path_entry="$1"

  if [ -z "$path_entry" ] || [ ! -d "$path_entry" ]; then
    return 0
  fi

  case ":${PATH:-}:" in
    *":$path_entry:"*) ;;
    *) export PATH="$path_entry:${PATH:-}" ;;
  esac
}

agent_package_manager() {
  sed -nE 's/^[[:space:]]*"packageManager"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$agent_package_file" | head -n 1
}

agent_node_version() {
  node --version 2>/dev/null | sed 's/^v//'
}

agent_pnpm_version() {
  pnpm --version 2>/dev/null | sed 's/[[:space:]]*$//'
}

agent_activate_nvm() {
  local nvm_script
  local nvm_scripts=()

  if [ -n "${NVM_DIR:-}" ]; then
    nvm_scripts+=("$NVM_DIR/nvm.sh")
  fi

  if [ -n "${HOME:-}" ]; then
    nvm_scripts+=("$HOME/.nvm/nvm.sh")
  fi

  for nvm_script in "${nvm_scripts[@]}"; do
    if [ -s "$nvm_script" ]; then
      # shellcheck source=/dev/null
      . "$nvm_script"
      nvm use --silent "$agent_expected_node_version" >/dev/null 2>&1 && return 0
    fi
  done

  return 1
}

agent_activate_fnm() {
  command -v fnm >/dev/null 2>&1 || return 1
  eval "$(fnm env --shell bash 2>/dev/null)" || return 1
  fnm use "$agent_expected_node_version" >/dev/null 2>&1
}

agent_activate_asdf() {
  if [ -n "${HOME:-}" ] && [ -s "$HOME/.asdf/asdf.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.asdf/asdf.sh"
  fi
}

agent_activate_mise() {
  command -v mise >/dev/null 2>&1 || return 0
  eval "$(mise activate bash 2>/dev/null)" || true
}

agent_report_node_failure() {
  local actual_node_version
  local node_path

  actual_node_version="$(agent_node_version)"
  node_path="$(command -v node 2>/dev/null || printf 'missing')"

  cat >&2 <<EOF
Agent environment initialisation failed.
Expected Node $agent_expected_node_version from .nvmrc, found ${actual_node_version:-none} at $node_path.
Install or activate the pinned contributor runtime, then rerun:
  source .agents/initialise-env.sh
EOF
}

agent_report_pnpm_failure() {
  local actual_pnpm_version
  local pnpm_path

  actual_pnpm_version="$(agent_pnpm_version)"
  pnpm_path="$(command -v pnpm 2>/dev/null || printf 'missing')"

  cat >&2 <<EOF
Agent environment initialisation failed.
Expected $agent_expected_package_manager from package.json, found pnpm ${actual_pnpm_version:-none} at $pnpm_path.
Run Corepack for the pinned package manager, then rerun:
  corepack prepare $agent_expected_package_manager --activate
  source .agents/initialise-env.sh
EOF
}

agent_initialise_environment() {
  if [ ! -f "$agent_node_version_file" ]; then
    printf 'Agent environment initialisation failed: missing .nvmrc\n' >&2
    return 1
  fi

  if [ ! -f "$agent_package_file" ]; then
    printf 'Agent environment initialisation failed: missing package.json\n' >&2
    return 1
  fi

  agent_expected_node_version="$(tr -d '[:space:]' < "$agent_node_version_file")"
  agent_expected_package_manager="$(agent_package_manager)"
  agent_expected_pnpm_version="${agent_expected_package_manager#pnpm@}"

  if [ -z "$agent_expected_node_version" ]; then
    printf 'Agent environment initialisation failed: .nvmrc is empty\n' >&2
    return 1
  fi

  if [ "$agent_expected_package_manager" = "$agent_expected_pnpm_version" ]; then
    printf 'Agent environment initialisation failed: packageManager must pin pnpm\n' >&2
    return 1
  fi

  agent_prepend_path "$agent_repository_root/node_modules/.bin"

  if [ -n "${HOME:-}" ]; then
    agent_prepend_path "$HOME/.volta/bin"
    agent_prepend_path "$HOME/.nvm/versions/node/v$agent_expected_node_version/bin"
    agent_prepend_path "$HOME/.local/share/fnm/node-versions/v$agent_expected_node_version/installation/bin"
  fi

  if [ "$(agent_node_version)" != "$agent_expected_node_version" ]; then
    agent_activate_nvm || agent_activate_fnm || true
  fi

  agent_activate_asdf
  agent_activate_mise

  if [ "$(agent_node_version)" != "$agent_expected_node_version" ]; then
    agent_report_node_failure
    return 1
  fi

  if ! command -v pnpm >/dev/null 2>&1 && command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
  fi

  if [ "$(agent_pnpm_version)" != "$agent_expected_pnpm_version" ] && command -v corepack >/dev/null 2>&1; then
    corepack prepare "$agent_expected_package_manager" --activate >/dev/null 2>&1 || true
  fi

  if [ "$(agent_pnpm_version)" != "$agent_expected_pnpm_version" ]; then
    agent_report_pnpm_failure
    return 1
  fi

  export AGENT_REPOSITORY_ROOT="$agent_repository_root"
  export AGENT_NODE_VERSION="$agent_expected_node_version"
  export AGENT_PACKAGE_MANAGER="$agent_expected_package_manager"

  if [ "${AGENT_ENV_QUIET:-0}" != '1' ]; then
    printf 'Agent environment ready: Node %s, %s\n' "$AGENT_NODE_VERSION" "$AGENT_PACKAGE_MANAGER"
  fi
}

if ! agent_initialise_environment; then
  if [ "$agent_environment_sourced" = '1' ]; then
    return 1
  fi

  exit 1
fi
