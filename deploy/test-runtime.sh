#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export MARQDO_LIB="$PWD/lib" MARQDO_EXT="$PWD/ext"
bash deploy/check-document-runtime.sh
python3 -m unittest discover -s tests -p 'test_*.py'
python3 -m unittest discover -s worker -p 'test_*.py'
(cd server && go test -race ./...)
