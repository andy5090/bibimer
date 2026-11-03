"""Native mock-provider receipts; no real model, browser or user session is touched."""
import threading
import uuid
from unittest.mock import patch
from test_chat import ChatFixture, module


class BrowserNoticeTests(ChatFixture):
    def browser(self, agent):
        browser = object.__new__(module.BrowserSession)
        browser.id = str(uuid.uuid4())
        browser.project = dict(agent.project)
        browser.browser_control_lock = threading.Lock()
        browser.browser_manual = True
        browser.browser_consent_request = None
        browser.state = 'running'
        # Only the requester discovery reads this temporary entry.
        with patch.dict(self.bridge.sessions, {browser.id:browser}):
            self.bridge.browser_requested(browser.id, agent)
        return browser

    def allow(self, browser, text='Browser control allowed'):
        browser.browser_manual = False
        return self.bridge.browser_allowed_notice(browser, {'notify':True,
            'consent_request_id':browser.browser_consent_request['id'], 'notification_text':text})

    def waiting(self):
        agent = self.chat()
        self.message('wait')
        self.until(lambda event:event['session']['turn_state']=='running')
        return agent

    def test_running_requester_receives_confirmed_steer_once(self):
        agent = self.waiting(); browser = self.browser(agent)
        result = self.allow(browser, '허용 완료')
        self.assertEqual('steered', result['state'])
        event = self.until(lambda event:any(row.get('text')=='허용 완료' for row in event['items']))
        self.assertEqual(1, sum(row.get('text')=='허용 완료' for row in event['items']))
        self.assertEqual(result, self.allow(browser, '허용 완료'))
        self.assertNotIn('허용 완료', (self.state/'metadata.json').read_text())
        self.assertFalse(agent.queue)

    def test_ready_requester_gets_followup_and_unsupported_gets_queue(self):
        agent = self.chat(); browser = self.browser(agent)
        self.assertEqual('sent', self.allow(browser)['state'])
        self.until(lambda event:any(row.get('text')=='Browser control allowed' for row in event['items']))
        self.until(lambda event:event['session']['turn_state']=='ready')
        self.message('wait');self.until(lambda event:event['session']['turn_state']=='running')
        browser = self.browser(agent);agent.can_steer=False
        self.assertEqual('queued', self.allow(browser)['state'])
        self.assertEqual('Browser control allowed',next(iter(agent.queue.values()))['text'])

    def test_turn_replacement_or_new_input_skips_notification(self):
        agent = self.waiting(); browser = self.browser(agent)
        original = agent.turn_id
        with agent.condition: agent.turn_id='other-turn'
        self.assertEqual('unavailable', self.allow(browser)['state'])
        with agent.condition: agent.turn_id=original
        self.api('POST',f'/v1/sessions/{agent.id}/interrupt',{})
        self.until(lambda event:event['session']['turn_state']=='ready')
        browser = self.browser(agent)
        self.message('another task')
        self.until(lambda event:event['session']['turn_state']=='ready')
        self.assertEqual('unavailable', self.allow(browser)['state'])

    def test_rejection_and_uncertain_receipt_never_fall_back_to_queue(self):
        agent = self.waiting(); browser = self.browser(agent)
        self.assertEqual('failed', self.allow(browser,'steer-reject')['state'])
        self.assertFalse(agent.queue)
        browser = self.browser(agent)
        self.assertEqual('uncertain', self.allow(browser,'steer-timeout')['state'])
        self.assertFalse(agent.queue)
        self.assertEqual('uncertain', self.allow(browser,'steer-timeout')['state'])

    def test_paused_queue_is_not_resumed_by_permission_notice(self):
        agent = self.chat(); browser = self.browser(agent)
        with agent.condition: agent.queue_paused=True
        self.assertEqual('unavailable',self.allow(browser)['state'])
        self.assertTrue(agent.queue_paused);self.assertFalse(agent.queue)

    def test_only_explicit_allow_matching_origin_and_no_pty_injection(self):
        agent = self.chat();browser = self.browser(agent)
        self.assertIsNone(self.bridge.browser_allowed_notice(browser,{}))
        self.assertEqual('waiting',browser.browser_consent_request['delivery'])
        self.assertEqual('unavailable',self.bridge.browser_allowed_notice(browser,{'notify':True,'consent_request_id':'other'})['state'])
        self.assertEqual('waiting',browser.browser_consent_request['delivery'])
        browser.browser_consent_request['_launch']='other-run'
        self.assertEqual('unavailable',self.allow(browser)['state'])
        browser = self.browser(agent)
        with patch.object(module,'ChatSession',new=type('UnrelatedChat',(),{})):
            with patch.dict(self.bridge.sessions,{browser.id:browser}):self.bridge.browser_requested(browser.id,agent)
        self.assertEqual('waiting',browser.browser_consent_request['delivery'])
