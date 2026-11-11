"""Exercise the fixed init control loop using isolated host subprocesses."""
from pathlib import Path
import os
import shlex
import signal
import subprocess
import sys
import tempfile
import time
import unittest


class SupervisorTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.starts = self.root / 'starts'
        self.saved = self.root / 'project.txt'
        self.saved.write_text('retained project data')
        child = self.root / 'child.py'
        child.write_text('import os, time\nfrom pathlib import Path\n'
                         'with Path(' + repr(str(self.starts)) + ').open("a") as out:\n'
                         ' out.write(str(os.getpid()) + "\\n")\n'
                         'time.sleep(60)\n')
        bootstrap = self.root / 'bootstrap.sh'
        bootstrap.write_text('exec ' + shlex.quote(sys.executable) + ' ' + shlex.quote(str(child)) + '\n')
        source = Path(__file__).parents[2] / 'bridge/supervisor.sh'
        supervisor = self.root / 'supervisor.sh'
        supervisor.write_text(source.read_text().replace('/opt/bibimer/ios/bootstrap.sh', shlex.quote(str(bootstrap))))
        self.process = subprocess.Popen(['/bin/sh', str(supervisor)], stdin=subprocess.PIPE,
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                        start_new_session=True)
        self.addCleanup(self.stop)

    def stop(self):
        try:
            os.killpg(self.process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        self.process.wait(timeout=3)
        if self.process.stdin and not self.process.stdin.closed:
            self.process.stdin.close()

    def pids(self):
        return [int(line) for line in self.starts.read_text().splitlines()] if self.starts.exists() else []

    def wait(self, predicate):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if predicate():
                return
            time.sleep(.02)
        self.fail('Supervisor fixture did not reach expected state')

    def send(self, action):
        self.process.stdin.write((action + '\n').encode())
        self.process.stdin.flush()

    def test_restart_after_confirmed_child_exit_keeps_init_and_files(self):
        self.send('start')
        self.wait(lambda: len(self.pids()) == 1)
        first = self.pids()[0]
        self.send('start')  # Active children must not be duplicated.
        time.sleep(.1)
        self.assertEqual(self.pids(), [first])
        for count in (2, 3):
            os.kill(self.pids()[-1], signal.SIGTERM)
            def exited():
                try:
                    os.kill(self.pids()[-1], 0)
                    return False
                except ProcessLookupError:
                    return True
            self.wait(exited)
            self.assertIsNone(self.process.poll(), 'Child exit must not stop init')
            self.send('start')
            self.wait(lambda: len(self.pids()) == count)
            self.assertEqual(self.saved.read_text(), 'retained project data')

    def test_control_pipe_never_evaluates_arbitrary_input(self):
        marker = self.root / 'injected'
        self.send('touch ' + str(marker))
        self.send('start; touch ' + str(marker))
        self.send('start')
        self.wait(lambda: len(self.pids()) == 1)
        self.assertFalse(marker.exists())

    def test_eof_keeps_init_alive(self):
        self.process.stdin.close()
        time.sleep(.1)
        self.assertIsNone(self.process.poll())
        self.assertEqual(self.pids(), [])


if __name__ == '__main__':
    unittest.main()
