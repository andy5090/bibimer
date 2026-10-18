"""Run fixed native bridge actions, permission replay and result validation with JVM doubles."""
from pathlib import Path
import subprocess
import tempfile
import unittest

from test_agent_actions import STUBS, JAVA


class BridgeMaintenanceTests(unittest.TestCase):
    def test_fixed_actions_permission_lifecycle_and_status_only_results(self):
        stubs = {name: source for name, source in STUBS.items() if not name.endswith('AgentActionsTest.java')}
        stubs['android/app/Activity.java'] = stubs['android/app/Activity.java'].replace('public class Activity {', 'public class Activity extends android.content.Context {')
        stubs['android/content/Context.java'] = '''package android.content;
import java.util.*;
public class Context {
 public static final int MODE_PRIVATE=0;
 private final Map<String,SharedPreferences> stores=new HashMap<>();
 public SharedPreferences getSharedPreferences(String name,int mode){return stores.computeIfAbsent(name,n->new SharedPreferences());}
}'''
        stubs['android/content/SharedPreferences.java'] = '''package android.content;
import java.util.*;
public class SharedPreferences {
 final Map<String,Object> values=new HashMap<>();
 public String getString(String k,String d){return (String)values.getOrDefault(k,d);}
 public long getLong(String k,long d){return (Long)values.getOrDefault(k,d);}
 public Editor edit(){return new Editor();}
 public class Editor {
  public Editor putString(String k,String v){values.put(k,v);return this;}
  public Editor putLong(String k,long v){values.put(k,v);return this;}
  public boolean commit(){return true;}
 }
}'''
        stubs['android/content/Intent.java'] = '''package android.content;
import java.util.*;import android.net.Uri;import android.os.Bundle;
public class Intent {
 public String action,pkg,cls;public Uri data;public final Map<String,Object> extras=new HashMap<>();
 public Intent(String a){action=a;}public Intent(Context c,Class<?> target){}
 public Intent setAction(String a){action=a;return this;}public String getAction(){return action;}
 public Intent setData(Uri u){data=u;return this;}public Uri getData(){return data;}
 public Intent setClassName(String p,String c){pkg=p;cls=c;return this;}
 public Intent putExtra(String k,Object v){extras.put(k,v);return this;}
 public Bundle getBundleExtra(String k){return (Bundle)extras.get(k);}
}'''
        stubs['android/app/PendingIntent.java'] = '''package android.app;
import android.content.*;
public class PendingIntent {
 public static final int FLAG_ONE_SHOT=1,FLAG_MUTABLE=2;public Intent intent;public int flags;
 public static PendingIntent getBroadcast(Context c,int request,Intent i,int f){PendingIntent p=new PendingIntent();p.intent=i;p.flags=f;return p;}
}'''
        stubs['android/net/Uri.java'] = '''package android.net;
public class Uri {String value;public static Uri parse(String s){Uri u=new Uri();u.value=s;return u;}
 public boolean equals(Object o){return o instanceof Uri && value.equals(((Uri)o).value);}}
'''
        stubs['android/os/Bundle.java'] = '''package android.os;
import java.util.*;
public class Bundle extends HashMap<String,Object> {
 public int getInt(String k,int d){return (Integer)getOrDefault(k,d);}public String getString(String k,String d){return (String)getOrDefault(k,d);}}
'''
        stubs['android/os/Build.java'] = 'package android.os;public class Build {public static class VERSION {public static int SDK_INT=36;}}'
        stubs['org/json/JSONObject.java'] = '''package org.json;
public class JSONObject {String value;public JSONObject(String v){value=v;}
 public String getString(String k){String prefix="{\\\"status\\\":\\\"";if(!value.startsWith(prefix)||!value.endsWith("\\\"}"))throw new IllegalArgumentException();return value.substring(prefix.length(),value.length()-2);}}
'''
        stubs['app/bibimer/BridgeMaintenanceReceiver.java'] = 'package app.bibimer;final class BridgeMaintenanceReceiver {}'
        harness = '''package app.bibimer;
import android.app.*;import android.content.*;import android.os.*;import android.net.Uri;
public class MaintenanceHarness {
 static void check(boolean v){if(!v)throw new AssertionError();}
 static void result(Activity a,String code,int exit) {
  PendingIntent p=(PendingIntent)a.command.extras.get("com.termux.RUN_COMMAND_PENDING_INTENT");
  Bundle b=new Bundle();b.put("err",-1);b.put("exitCode",exit);b.put("stdout","{\\\"status\\\":\\\""+code+"\\\"}");
  BridgeMaintenance.receive(a,p.intent.putExtra("result",b));
 }
 public static void main(String[] args) {
  Activity a=new Activity();BridgeMaintenance runner=new BridgeMaintenance();
  runner.request(a,"arbitrary command");check(a.starts==0);
  TermuxSetup.allowed=false;runner.request(a,"update");check(a.requestCode==26);check(a.starts==0);
  runner.request(a,"restart");TermuxSetup.allowed=true;runner.permissionResult(a);check(a.starts==1);
  String script=(String)a.command.extras.get("com.termux.RUN_COMMAND_STDIN");
  check(script.startsWith("python - update <<"));check(!script.contains("downloads"));
  check(Boolean.TRUE.equals(a.command.extras.get("com.termux.RUN_COMMAND_BACKGROUND")));
  PendingIntent callback=(PendingIntent)a.command.extras.get("com.termux.RUN_COMMAND_PENDING_INTENT");
  check(callback.flags==3);check(a.command.pkg.equals("com.termux"));
  runner.request(a,"restart");check(a.starts==1);
  BridgeMaintenance.receive(a,new Intent("forged").setData(Uri.parse("bibimer-maintenance://result/forged")));
  check(BridgeMaintenance.status(a).equals("bridge_maintenance_running"));
  result(a,"bridge_maintenance_done",0);check(BridgeMaintenance.status(a).equals("bridge_maintenance_done"));
  runner.request(a,"restart");check(a.starts==2);
  result(a,"secret raw output",0);check(BridgeMaintenance.status(a).equals("bridge_maintenance_failed"));
  runner.request(a,"update");result(a,"bridge_maintenance_busy",1);check(BridgeMaintenance.status(a).equals("bridge_maintenance_busy"));
  TermuxSetup.allowed=false;runner.request(a,"restart");DemoMode.value++;TermuxSetup.allowed=true;runner.permissionResult(a);check(a.starts==3);
  TermuxSetup.allowed=false;runner.request(a,"restart");TermuxSetup.allowed=true;a.destroyed=true;runner.permissionResult(a);check(a.starts==3);a.destroyed=false;
  DemoMode.enabled=true;runner.request(a,"restart");check(a.starts==3);DemoMode.enabled=false;
  a.pm.missing=true;runner.request(a,"restart");check(BridgeMaintenance.status(a).equals("quick_termux_missing"));a.pm.missing=false;
  a.pm.version="0.117";runner.request(a,"restart");check(BridgeMaintenance.status(a).equals("quick_termux_old"));
  System.out.println("native bridge maintenance passed");
 }
}'''
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, content in {**stubs, 'app/bibimer/MaintenanceHarness.java': harness}.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content)
            compiled = subprocess.run(['javac', '-encoding', 'UTF-8', '-d', directory, str(JAVA / 'BridgeMaintenance.java'), *map(str, root.rglob('*.java'))], capture_output=True, text=True)
            self.assertEqual(0, compiled.returncode, compiled.stderr)
            result = subprocess.run(['java', '-cp', directory, 'app.bibimer.MaintenanceHarness'], check=True, capture_output=True, text=True)
            self.assertIn('native bridge maintenance passed', result.stdout)
