"""Compile the native transport and test routing without a bridge or network."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]

class LocalUpdateTransportTests(unittest.TestCase):
 def test_updates_use_authenticated_loopback_and_reject_unlisted_requests(self):
  with tempfile.TemporaryDirectory(prefix='bibimer-update-java-') as tmp:
   root=Path(tmp);(root/'org/json').mkdir(parents=True);(root/'app/bibimer').mkdir(parents=True)
   (root/'org/json/JSONObject.java').write_text('''package org.json;
public class JSONObject { public JSONObject(){} public JSONObject(String value){} public JSONObject put(String k,Object v){return this;} public int optInt(String k){return 1;} public String getString(String k){return "fake-token";} public void remove(String k){} }
''')
   (root/'app/bibimer/TokenStore.java').write_text('''package app.bibimer; class TokenStore { String get(){return "fixture-token";} void save(String value){} }''')
   (root/'app/bibimer/TransportTest.java').write_text('''package app.bibimer;
import java.net.*; import java.io.*;
public class TransportTest {
 static int calls=0;static Fake last;
 static class Fake extends HttpURLConnection {
  Fake(URL url){super(url);last=this;calls++;}
  public void connect(){} public void disconnect(){} public boolean usingProxy(){return false;}
  public OutputStream getOutputStream(){return new ByteArrayOutputStream();}
  public int getResponseCode(){return 200;} public InputStream getInputStream(){return new ByteArrayInputStream("{}".getBytes());}
 }
 static void check(boolean value){if(!value)throw new AssertionError();}
 public static void main(String[] args)throws Exception {
  URL.setURLStreamHandlerFactory(protocol->protocol.equals("http")?new URLStreamHandler(){
   protected URLConnection openConnection(URL url){return new Fake(url);}
   protected URLConnection openConnection(URL url,Proxy proxy){check(proxy==Proxy.NO_PROXY);return new Fake(url);}
  }:null);
  LocalBridge bridge=new LocalBridge(new TokenStore());
  for(String path:new String[]{"/v1/agent-updates","/v1/agent-connections"}) {
   bridge.request("POST",path,"{\\"action\\":\\"check\\"}");
   check(last.getURL().getHost().equals("127.0.0.1"));check(last.getURL().getPort()==8765);check(last.getURL().getPath().equals(path));
   check(last.getReadTimeout()==(path.equals("/v1/agent-updates")?45000:25000));check(!last.getInstanceFollowRedirects());check(last.getRequestProperty("Authorization").equals("Bearer fixture-token"));
  }
  check(calls==2);
  for(String[] request:new String[][]{{"GET","/v1/agent-updates"},{"POST","/v1/agent-updates?host=evil"},{"POST","https://evil.example/v1/agent-updates"}}){
   try{bridge.request(request[0],request[1],"{}");throw new AssertionError();}catch(IllegalArgumentException expected){}
  }
  check(calls==2);
 }
}''')
   sources=list(root.rglob('*.java'))+[ROOT/'android/app/src/main/java/app/bibimer/LocalBridge.java']
   subprocess.run(['javac','--release','8','-d',str(root),*map(str,sources)],check=True,capture_output=True,text=True)
   subprocess.run(['java','-cp',str(root),'app.bibimer.TransportTest'],check=True,capture_output=True,text=True)

if __name__=='__main__':unittest.main()
