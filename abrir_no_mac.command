#!/bin/bash
set -e

cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 nao foi encontrado."
  echo "Instale Python 3 a partir de https://www.python.org/downloads/macos/ e volte a tentar."
  read -r -p "Prima Enter para sair..."
  exit 1
fi

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python coopgest_mac.py
