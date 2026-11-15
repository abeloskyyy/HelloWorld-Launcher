#!/bin/bash
# scripts/rpmbuild-wrapper.sh
# Wraps rpmbuild to translate legacy fpm `--define "buildroot ..."` into `--buildroot=...`
# needed by modern RPM versions (4.19+/4.20/6.x).

REAL_RPMBUILD="/usr/bin/rpmbuild.real"
if [ ! -f "$REAL_RPMBUILD" ]; then
  REAL_RPMBUILD="/usr/bin/rpmbuild"
fi

EXTRA_ARGS=()
for ((i=1; i<=$#; i++)); do
  curr="${!i}"
  if [ "$curr" = "--define" ]; then
    next_i=$((i+1))
    next_val="${!next_i}"
    if [[ "$next_val" == buildroot* ]]; then
      b_val="${next_val#buildroot }"
      EXTRA_ARGS+=("--buildroot=$b_val")
    fi
  fi
done

exec "$REAL_RPMBUILD" "${EXTRA_ARGS[@]}" "$@"
