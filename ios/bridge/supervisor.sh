#!/bin/sh
# PID 1 stays alive while the host replaces Linux user processes. Its private
# stdin accepts one fixed action; it never evaluates commands from app input.
set -u
umask 077
bridge_pid=
while :; do
    if IFS= read -r action; then
        case "$action" in
            start)
                if [ -n "$bridge_pid" ] && kill -0 "$bridge_pid" 2>/dev/null; then
                    continue
                fi
                /bin/sh /opt/bibimer/ios/bootstrap.sh </dev/null &
                bridge_pid=$!
                ;;
        esac
    else
        # Losing the host pipe must not shut down the embedded kernel.
        sleep 1
    fi
done
