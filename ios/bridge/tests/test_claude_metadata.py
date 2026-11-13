"""Bounded Claude cold-start metadata without a model prompt or account."""
import io
import json
from pathlib import Path
import sys
import tempfile
import time
import types
import unittest
from unittest.mock import patch

import test_ios_bridge as fixtures


class ClaudeMetadataTests(unittest.TestCase):
    def setUp(self):
        self.base = fixtures.entry.adapt(fixtures.entry.load_bridge(fixtures.ROOT / 'bridge/bibimer_bridge.py'))

    def test_model_reply_after_android_deadline_uses_ios_budget_without_turn(self):
        # Actual embedded CLI metadata takes about25s; advance a controlled
        # observation clock instead of slowing every host test by that amount.
        clock = [0]
        process = types.SimpleNamespace(stdin=io.BytesIO(), stdout=object())
        def ready(*args):
            clock[0] += 1
            return ([process.stdout], [], []) if clock[0] >= 25 else ([], [], [])
        reply = json.dumps({'id':1,'result':{'data':[{'id':'native-model'}]}}).encode()+b'\n'
        with patch.object(self.base, 'provider_command', return_value=['fixture-provider']), \
             patch.object(self.base.subprocess, 'Popen', return_value=process), \
             patch.object(self.base.time, 'monotonic', side_effect=lambda:clock[0]), \
             patch.object(self.base.select, 'select', side_effect=ready), \
             patch.object(self.base.os, 'read', return_value=reply):
            # The fake pipe needs only the fileno consumed by os.read.
            process.stdout = types.SimpleNamespace(fileno=lambda:91)
            client = self.base.HistoryClient('/fixture/claude','/fixture/project','claude')
            result = client.call('model/list',{})
        self.assertEqual([{'id':'native-model'}],result['data'])
        self.assertEqual(25,clock[0])
        requests=[json.loads(line) for line in process.stdin.getvalue().splitlines()]
        self.assertEqual(['model/list'],[row['method'] for row in requests])
        self.assertLess(clock[0],client.metadata_deadline)
        process.stdin.close()

    def test_expired_metadata_budget_closes_only_owned_provider(self):
        with tempfile.TemporaryDirectory() as temporary:
            script=Path(temporary)/'provider.py'
            script.write_text('import time\ntime.sleep(60)\n')
            with patch.object(self.base,'provider_command',return_value=[sys.executable,str(script)]):
                client=self.base.HistoryClient('/fixture/claude',temporary,'claude')
            client.metadata_deadline=time.monotonic()-1
            with self.assertRaises(self.base.Problem) as error:
                with client:
                    self.fail('Expired initialize cannot create a thread or model request')
            self.assertEqual('error_history',error.exception.code)
            self.assertIsNotNone(client.process.poll())
            self.assertTrue(client.process.stdin.closed)
            self.assertTrue(client.process.stdout.closed)

    def test_claude_chat_initialization_uses_bounded_ios_startup_wait(self):
        class Condition:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def wait_for(self,predicate,timeout):
                self.timeout=timeout
                return False
        condition=Condition();fault=[]
        session=types.SimpleNamespace(agent='claude',condition=condition,imported=False,_fault=fault.append)
        self.base.ChatSession._startup_deadline(session)
        self.assertEqual(135,condition.timeout)
        self.assertEqual(['error_chat_start'],fault)


if __name__ == '__main__':
    unittest.main()
