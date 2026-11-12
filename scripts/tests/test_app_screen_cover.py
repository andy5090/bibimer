"""Exercise the native cover's frame/lifecycle races without launching an APK."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]

class AppScreenCoverTests(unittest.TestCase):
    def test_ready_frame_timeout_and_background_races(self):
        with tempfile.TemporaryDirectory(prefix="bibimer-cover-") as tmp:
            root = Path(tmp)
            sources = {
                'android/view/View.java': '''package android.view;
import java.util.*;
public class View {
 public static final int VISIBLE=0,GONE=8;
 public int visibility=VISIBLE; public long delay;
 public List<Runnable> timers=new ArrayList<>();
 public void setVisibility(int value){visibility=value;}
 public boolean postDelayed(Runnable value,long millis){timers.add(value);delay=millis;return true;}
 public boolean removeCallbacks(Runnable value){return timers.remove(value);}
}
''',
                'android/webkit/WebView.java': '''package android.webkit;
import java.util.*;
public class WebView {
 public static abstract class VisualStateCallback {public abstract void onComplete(long requestId);}
 public List<Runnable> frames=new ArrayList<>();
 public void postVisualStateCallback(long id,VisualStateCallback value){frames.add(()->value.onComplete(id));}
}
''',
                'app/bibimer/CoverTest.java': '''package app.bibimer;
import android.view.View; import android.webkit.WebView;
public class CoverTest {
 static void check(boolean value){if(!value)throw new AssertionError();}
 public static void main(String[] args){
  View view=new View(); WebView web=new WebView(); AppScreenCover cover=new AppScreenCover(view,web);
  long initial=cover.show(8000); check(view.visibility==View.VISIBLE && view.delay==8000);
  cover.hideWhenDrawn(initial); check(view.visibility==View.VISIBLE);
  web.frames.remove(0).run(); check(view.visibility==View.GONE && view.timers.isEmpty());
  // Resume has no minimum delay and does not wait for a bridge response.
  long resume=cover.show(1500); cover.hideWhenDrawn(resume);
  Runnable oldFrame=web.frames.remove(0),oldTimeout=view.timers.get(0);
  cover.stop(); check(view.visibility==View.VISIBLE && view.timers.isEmpty());
  oldFrame.run(); oldTimeout.run(); check(view.visibility==View.VISIBLE);
  long next=cover.show(1500); cover.hideWhenDrawn(resume); check(web.frames.isEmpty());
  cover.hideWhenDrawn(next); Runnable nextFrame=web.frames.remove(0);
  // A reload invalidates the previous resume's completion callback.
  long reload=cover.show(8000); nextFrame.run(); check(view.visibility==View.VISIBLE);
  cover.hideWhenDrawn(reload); web.frames.remove(0).run(); check(view.visibility==View.GONE);
  // A stalled renderer/script cannot leave the application permanently covered.
  cover.show(1500); view.timers.get(0).run(); check(view.visibility==View.GONE && view.timers.isEmpty());
  long finalTicket=cover.show(8000); cover.hideWhenDrawn(finalTicket);
  cover.close(); check(view.timers.isEmpty()); web.frames.remove(0).run(); check(view.visibility==View.VISIBLE);
 }
}
'''
            }
            for name, source in sources.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(source)
            subprocess.run(['javac', '-d', str(root/'classes'),
                str(ROOT/'android/app/src/main/java/app/bibimer/AppScreenCover.java'),
                *[str(root/name) for name in sources]], check=True)
            subprocess.run(['java', '-cp', str(root/'classes'), 'app.bibimer.CoverTest'], check=True)

if __name__ == '__main__':
    unittest.main()
