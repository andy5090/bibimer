"""Exercise the bridge's controlling-terminal, echo and poll path in the guest."""
import errno
import fcntl
import os
from pathlib import Path
import select
import signal
import struct
import subprocess
import sys
import termios
import threading
import time

BASE = Path('/root/bibimer-probe')
if len(sys.argv) > 1 and sys.argv[1] == '--child':
    (BASE / 'pty-child-progress').write_text('before-controlling-tty')
    fcntl.ioctl(0, termios.TIOCSCTTY, 0)
    (BASE / 'pty-child-progress').write_text('before-exec-shell')
    os.execvpe('/bin/sh', ['/bin/sh', '-i'], os.environ)

for attempt in range(3):
    master, slave = os.openpty()
    os.set_blocking(master, False)
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 80, 0, 0))
    result = {}
    output = bytearray()
    stop = threading.Event()
    process = None

    def spawn():
        # The production bridge starts a Python child entry point from a
        # request thread; that child claims its PTY and then execs the shell.
        result['process'] = subprocess.Popen([sys.executable, __file__, '--child'],
            stdin=slave, stdout=slave, stderr=slave, start_new_session=True,
            close_fds=True, cwd=BASE)

    def read():
        while not stop.is_set():
            if select.select([master], [], [], 0.1)[0]:
                try:
                    chunk = os.read(master, 65536)
                except BlockingIOError:
                    continue
                except OSError as error:
                    if error.errno == errno.EIO:
                        break
                    raise
                if not chunk:
                    break
                output.extend(chunk)

    creator = threading.Thread(target=spawn)
    creator.start()
    creator.join(timeout=10)
    if creator.is_alive() or 'process' not in result:
        raise RuntimeError('Request-thread PTY spawn failed')
    process = result['process']
    os.close(slave)
    reader = threading.Thread(target=read, daemon=True)
    reader.start()
    try:
        # Send before the shell finishes initializing, while select scans the
        # master and Python fstats the slave. Canonical echo used to deadlock.
        command = b"printf 'BIBIMER_BRIDGE_PTY_OK\\n'; exit 7\r"
        writer = threading.Thread(target=lambda: os.write(master, command), daemon=True)
        writer.start()
        writer.join(timeout=10)
        if writer.is_alive():
            raise RuntimeError('Canonical echo write deadlocked; child=' + (BASE / 'pty-child-progress').read_text())
        code = process.wait(timeout=12)
        reader.join(timeout=5)
        if code != 7 or b'BIBIMER_BRIDGE_PTY_OK\r\n' not in output or reader.is_alive():
            raise RuntimeError({'code': code, 'output': bytes(output).decode(errors='replace'), 'readerAlive': reader.is_alive()})
        print('bridge PTY request-thread/controlling-terminal/echo/poll PASS', attempt + 1, flush=True)
    finally:
        stop.set()
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=5)
        os.close(master)
