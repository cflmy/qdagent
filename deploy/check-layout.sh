#!/bin/sh
# 仓库布局守卫：顶层目录名不得包含空格或引号。
# 这类目录只会来自未加引号的路径拼接（例如 "$EXT + "/native/..."），
# 它们会生成一份看不见的重复产物树，因此在这里直接失败而不是静默继续。
set -eu
cd "$(dirname "$0")/.."

bad=0
for entry in ./* ./.[!.]*; do
  [ -e "$entry" ] || continue
  name=$(basename "$entry")
  case "$name" in
    *\"* | *"'"* | *" "*)
      printf 'layout: 非法目录名 %s\n' "$name" >&2
      bad=1
      ;;
  esac
done

if [ "$bad" -ne 0 ]; then
  printf 'layout: 请修正生成该路径的脚本，不要提交带空格或引号的目录\n' >&2
  exit 1
fi

printf 'layout: ok\n'
