"""Fixed Claude actions, Android permission replay, and interactive terminal isolation."""
from pathlib import Path
import json
import os
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
JAVA = ROOT / 'android/app/src/main/java/app/bibimer'

STUBS = {
'android/content/Intent.java': '''package android.content;
import java.util.HashMap; import java.util.Map;
public class Intent {
 public final String action; public String pkg, cls;
 public final Map<String,Object> extras = new HashMap<>();
 public Intent(String value) { action=value; }
 public Intent setClassName(String p,String c) {pkg=p;cls=c;return this;}
 public Intent putExtra(String key,Object value) {extras.put(key,value);return this;}
}''',
'android/content/pm/PackageManager.java': '''package android.content.pm;
public class PackageManager {
 public boolean missing; public String version="0.118.3";
 public static class NameNotFoundException extends Exception {}
 public static class PackageInfo {public String versionName;}
 public PackageInfo getPackageInfo(String name,int flags) throws NameNotFoundException {
  if(missing)throw new NameNotFoundException();
  PackageInfo p=new PackageInfo();p.versionName=version;return p;
 }
}''',
'android/content/res/AssetManager.java': '''package android.content.res;
import java.io.*;
public class AssetManager {
 public String opened; public boolean fail;
 public InputStream open(String name) throws IOException {
  opened=name; if(fail)throw new IOException();
  return new ByteArrayInputStream("printf 'bundled installer\\n'\\n".getBytes("UTF-8"));
 }
}''',
'android/app/Activity.java': '''package android.app;
import android.content.Intent; import android.content.pm.PackageManager;
import android.content.res.AssetManager;
public class Activity {
 public boolean destroyed, denied, fail, requestFail; public int requestCode, starts;
 public String[] permissions; public Intent command;
 public final PackageManager pm=new PackageManager();public final AssetManager assets=new AssetManager();
 public boolean isDestroyed(){return destroyed;}
 public PackageManager getPackageManager(){return pm;}
 public AssetManager getAssets(){return assets;}
 public void requestPermissions(String[] p,int r){if(requestFail)throw new SecurityException();permissions=p;requestCode=r;}
 public void startService(Intent c){if(denied)throw new SecurityException();if(fail)throw new IllegalStateException();command=c;starts++;}
}''',
'android/os/SystemClock.java': '''package android.os;
public class SystemClock {public static long now=10000;public static long elapsedRealtime(){return now;}}
''',
'app/bibimer/DemoMode.java': '''package app.bibimer;
import android.app.Activity;
final class DemoMode {static boolean enabled; static long value;
 static boolean enabled(Activity a){return enabled;}static long epoch(){return value;}}
''',
'app/bibimer/TermuxSetup.java': '''package app.bibimer;
import android.app.Activity;
final class TermuxSetup {static final String PERMISSION="com.termux.permission.RUN_COMMAND";
 static boolean allowed;static boolean permitted(Activity a){return allowed;}}
''',
'app/bibimer/ClaudeActionsTest.java': r'''package app.bibimer;
import android.app.Activity; import android.content.Intent; import android.os.SystemClock;
import java.nio.file.Files; import java.nio.file.Paths; import java.io.InputStream;
public class ClaudeActionsTest {
 static void check(boolean value){if(!value)throw new AssertionError();}
 public static void main(String[] args) throws Exception {
  if(args.length==3){
   try(InputStream input=args[1].equals("-")?null:Files.newInputStream(Paths.get(args[1]))){
    System.out.print(ClaudeSetup.action(args[0],input,args[2]));
   }return;
  }
  Activity a=new Activity(); final String[] status={""};
  TermuxClaudeActions runner=new TermuxClaudeActions(a,code->status[0]=code);
  for(String bad:new String[]{null,"","login; touch /tmp/no","shell","claude-login"})runner.request(bad,"ko");
  check(a.starts==0 && a.requestCode==0);
  a.pm.missing=true;runner.request("login","ko");check(status[0].equals("quick_termux_missing"));check(a.requestCode==0);a.pm.missing=false;
  runner.request("login","ko");check(a.requestCode==25);check(a.permissions[0].equals(TermuxSetup.PERMISSION));
  runner.request("repair","ko"); // Pending login cannot be replaced.
  runner.permissionResult();check(a.starts==0);check(status[0].equals("quick_permission"));
  TermuxSetup.allowed=true;runner.permissionResult();check(a.starts==0); // Denial consumes the request.
  TermuxSetup.allowed=false;runner.request("login","ko");TermuxSetup.allowed=true;
  runner.permissionResult();check(a.starts==1);check(status[0].equals("claude_action_sent"));
  Intent intent=a.command;check(intent.action.equals("com.termux.RUN_COMMAND"));
  check(intent.pkg.equals("com.termux") && intent.cls.equals("com.termux.app.RunCommandService"));
  check(intent.extras.size()==5); // No callback, stdin, output file, session reuse, or result capture.
  check(Boolean.FALSE.equals(intent.extras.get("com.termux.RUN_COMMAND_BACKGROUND")));
  check(intent.extras.get("com.termux.RUN_COMMAND_WORKDIR").equals("/data/data/com.termux/files/home"));
  check(intent.extras.get("com.termux.RUN_COMMAND_PATH").equals("/data/data/com.termux/files/usr/bin/bash"));
  String[] argv=(String[])intent.extras.get("com.termux.RUN_COMMAND_ARGUMENTS");
  check(argv.length==4 && argv[2].equals("-c") && argv[3].contains("auth login"));
  check(!argv[3].contains("auth status"));runner.permissionResult();check(a.starts==1);
  runner.request("login","ko");check(a.starts==1); // Double tap is suppressed.
  SystemClock.now+=2000;runner.request("status","en");check(a.starts==2);
  for(String action:new String[]{"adapter","repair","version"}){
   SystemClock.now+=2000;runner.request(action,"en");check(status[0].equals("claude_action_sent"));
   if(!action.equals("version"))check(a.assets.opened.equals("claude-"+action+"-setup.sh"));
  }
  int starts=a.starts;
  SystemClock.now+=2000;DemoMode.enabled=true;runner.request("repair","ko");check(a.starts==starts);DemoMode.enabled=false;
  TermuxSetup.allowed=false;runner.request("repair","ko");TermuxSetup.allowed=true;
  DemoMode.value++;runner.permissionResult();check(a.starts==starts); // Enter/exit demo cancels replay.
  TermuxSetup.allowed=false;runner.request("login","ko");TermuxSetup.allowed=true;
  a.destroyed=true;runner.permissionResult();check(a.starts==starts);a.destroyed=false;
  a.pm.version="0.117.0";runner.request("login","en");check(status[0].equals("quick_termux_old"));
  a.pm.version="0.118.3";a.denied=true;runner.request("login","en");check(status[0].equals("quick_permission"));a.denied=false;
  a.fail=true;runner.request("login","en");check(status[0].equals("quick_start_failed"));a.fail=false;
  a.assets.fail=true;runner.request("repair","en");check(status[0].equals("quick_start_failed"));a.assets.fail=false;
  TermuxSetup.allowed=false;a.requestFail=true;runner.request("login","en");a.requestFail=false;
  TermuxSetup.allowed=true;runner.permissionResult();check(a.starts==starts);
  runner.request("login","en");check(a.starts==starts+1); // Failed request did not leave a pending action.
  System.out.println("Claude native actions: allowlist, explicit permission replay, isolation, lifecycle, errors and duplicate taps passed");
 }
}'''
}


class ClaudeActionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='bibimer-actions-')
        cls.root = Path(cls.temp.name)
        files=[]
        for name, content in STUBS.items():
            path=cls.root/name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
            files.append(str(path))
        subprocess.run(['javac','--release','8','-d',str(cls.root),*files,
                        str(JAVA/'ClaudeSetup.java'),str(JAVA/'TermuxClaudeActions.java')],
                       check=True,capture_output=True,text=True)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def java(self, *args, check=True):
        return subprocess.run(['java','-cp',str(self.root),'app.bibimer.ClaudeActionsTest',*args],
                              capture_output=True,text=True,check=check)

    def test_permission_and_foreground_intent(self):
        self.java()

    def test_fixed_shell_actions_keep_stdin_and_preserve_failures(self):
        with tempfile.TemporaryDirectory(prefix='bibimer-action-shell-') as directory:
            home=Path(directory)/'home with spaces'
            home.mkdir()
            bin=Path(directory)/'bin';bin.mkdir()
            record=Path(directory)/'argv.json'
            cli=bin/'claude'
            cli.write_text('#!'+shutil.which('python3')+'\nimport os,json,sys,pathlib\n'
                           "pathlib.Path(os.environ['BIBIMER_ARGV']).write_text(json.dumps(sys.argv[1:]))\n"
                           "print('interactive-input:' + sys.stdin.readline().strip())\n"
                           "raise SystemExit(int(os.environ.get('BIBIMER_EXIT','0')))\n")
            cli.chmod(0o700)
            terminal=bin/'terminal'
            terminal.write_text('#!'+shutil.which('sh')+'\nprintf "terminal remains open\\n"\n')
            terminal.chmod(0o700)
            env={**os.environ,'HOME':str(home),'PATH':str(bin),'BIBIMER_ARGV':str(record)}
            env.pop('BASH_ENV',None)
            for action,expected in [('login',['auth','login']),('status',['auth','status']),('version',['--version'])]:
                script=self.java(action,'-','ko').stdout.replace('/data/data/com.termux/files/usr/bin/bash -i',str(terminal))
                result=subprocess.run([shutil.which('bash'),'--noprofile','--norc','-c',script],
                                      input='test-user-input\n',env={**env,'BIBIMER_EXIT':'7'},text=True,capture_output=True,check=True)
                self.assertEqual(json.loads(record.read_text()),expected)
                self.assertIn('interactive-input:test-user-input',result.stdout)
                self.assertIn('명령 종료 코드: 7',result.stdout)
                self.assertIn('terminal remains open',result.stdout)
            managed=home/'.local/share/bibimer/claude-runtime/claude';managed.parent.mkdir(parents=True)
            managed.write_text('#!'+shutil.which('sh')+'\nprintf "managed runtime\\n"\nexit 9\n');managed.chmod(0o700)
            script=self.java('version','-','en').stdout.replace('/data/data/com.termux/files/usr/bin/bash -i',str(terminal))
            result=subprocess.run([shutil.which('bash'),'-c',script],env=env,text=True,capture_output=True,check=True)
            self.assertIn('managed runtime',result.stdout)
            self.assertIn('Command exit code: 9',result.stdout)
            managed.unlink();cli.unlink()
            result=subprocess.run([shutil.which('bash'),'-c',script],env=env,text=True,capture_output=True,check=True)
            self.assertIn('Install or repair Claude first.',result.stderr)
            self.assertIn('Command exit code: 127',result.stdout)

    def test_bundled_installer_is_contained_and_unknown_actions_rejected(self):
        asset=self.root/'installer.sh';asset.write_text('set -eu\nprintf "bundled body\\n"\nexit 23\n')
        for action in ['adapter','repair']:
            script=self.java(action,str(asset),'ko; false').stdout
            self.assertIn('BIBIMER_LANGUAGE=en bash',script)
            self.assertNotIn('downloads',script)
            script=script.replace('exec /data/data/com.termux/files/usr/bin/bash -i','exit 0')
            result=subprocess.run([shutil.which('bash'),'-c',script],text=True,capture_output=True,check=True)
            self.assertIn('bundled body',result.stdout)
            self.assertIn('Command exit code: 23',result.stdout)
        self.assertNotEqual(self.java('login; false','-','en',check=False).returncode,0)


if __name__=='__main__':
    unittest.main()
