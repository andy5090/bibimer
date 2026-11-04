package app.bibimer;
import java.io.*;import java.net.*;import java.nio.charset.StandardCharsets;import java.nio.file.*;import java.util.*;import org.json.*;
public final class SpeechOutputApiTest{
 static void check(boolean b){if(!b)throw new AssertionError();}
 static class Connection extends HttpURLConnection{
  ByteArrayOutputStream body=new ByteArrayOutputStream();Map<String,String> headers=new HashMap<>();int code=200,responses;String type="audio/mpeg",json="";boolean closed;
  Connection(URL u){super(u);}public void connect(){}public boolean usingProxy(){return false;}public void disconnect(){closed=true;}
  public void setRequestProperty(String k,String v){headers.put(k,v);}public OutputStream getOutputStream(){return body;}
  public int getResponseCode(){responses++;return code;}public String getContentType(){return type;}
  public InputStream getInputStream(){return new ByteArrayInputStream(json.isEmpty()?new byte[]{'I','D','3',1,2}:json.getBytes(StandardCharsets.UTF_8));}
  public InputStream getErrorStream(){throw new AssertionError("Private error body read");}
 }
 static Connection last;static int opens;
 static SpeechOutputApi api(int code,String type,String json){return new SpeechOutputApi(url->{opens++;last=new Connection(url);last.code=code;last.type=type;last.json=json;return last;});}
 public static void main(String[] args)throws Exception{
  File f=File.createTempFile("tts-protocol", ".mp3");
  try{
   SpeechOutputApi a=api(200,"audio/mpeg","");
   a.synthesize("elevenlabs","test-only","voice123","읽을 텍스트",f,()->true);
   check(last.getURL().toString().equals("https://api.elevenlabs.io/v1/text-to-speech/voice123?output_format=mp3_44100_128"));check(!last.getInstanceFollowRedirects()&&!last.getUseCaches());check(last.closed);
   check(last.headers.get("xi-api-key").equals("test-only")&&!last.headers.containsKey("Authorization"));JSONObject body=new JSONObject(new String(last.body.toByteArray(),StandardCharsets.UTF_8));
   check(body.getString("text").equals("읽을 텍스트")&&body.getString("model_id").equals("eleven_multilingual_v2"));check(f.length()==5);
   for(int code:new int[]{302,401,403,429,500}){try{api(code,"audio/mpeg","").synthesize("elevenlabs","test","voice123","text",f,()->true);throw new AssertionError();}catch(IOException e){check(e.getMessage().equals(VoiceTranscription.status(code)));}check(!f.exists()&&last.closed&&last.responses==1);}
   try{api(200,"application/json","PRIVATE").synthesize("elevenlabs","test","voice123","text",f,()->true);throw new AssertionError();}catch(IOException e){check(!f.exists());}
   int before=opens;for(String voice:new String[]{"../../private","bad?key=",""}){try{a.synthesize("elevenlabs","test",voice,"text",f,()->true);throw new AssertionError();}catch(IOException e){}}check(opens==before);
   try{a.synthesize("elevenlabs","test","voice123","text",f,()->false);throw new AssertionError();}catch(IOException e){}check(opens==before);
   try{a.synthesize("openai","test","coral","text",f,()->true);throw new AssertionError("Removed provider must be rejected");}catch(IOException e){check(e.getMessage().equals("tts_unavailable"));}check(opens==before);
   String voices="{\"voices\":[{\"voice_id\":\"good_123\",\"name\":\"Voice <script>\",\"secret\":\"private\"},{\"voice_id\":\"bad/path\"}],\"has_more\":true,\"next_page_token\":\"next token\"}";
   JSONObject listing=api(200,"application/json",voices).voices("test","",()->true);check(listing.getJSONArray("voices").length()==1);check(!listing.toString().contains("private"));check(listing.getBoolean("hasMore"));
   api(200,"application/json",voices).voices("test","next token",()->true);check(last.getURL().toString().endsWith("next_page_token=next+token"));check(last.body.size()==0);
  }finally{f.delete();}
  String source="# Heading\nA **bold** answer with `foo_bar = x * y` and [link](https://example.com).\n```java\nvalue = foo_bar; __init__();\n```";
  String plain=SpeechText.plain(source);check(plain.contains("foo_bar = x * y")&&plain.contains("value = foo_bar; __init__();")&&!plain.contains("```"));
  String longText="";for(int i=0;i<40;i++)longText+="The project build has succeeded and validation is complete. ";
  String summary=SpeechText.summary(longText+"\n```\nSECRET_CODE_ONLY\n```\nNext, install the app to validate microphone access.");
  check(summary.length()<=701&&!summary.contains("SECRET_CODE_ONLY"));check(!summary.isEmpty());
  String emoji=String.join("",Collections.nCopies(3000,"🙂"));List<String> chunks=SpeechText.chunks(emoji,2000);check(String.join("",chunks).equals(emoji));for(String chunk:chunks)check(chunk.length()<=2000&&!Character.isHighSurrogate(chunk.charAt(chunk.length()-1)));
  check(SpeechText.summary("짧은 답변입니다.").equals("짧은 답변입니다."));
  System.out.println("PASS TTS API/text: fixed auth/endpoints, no fallback/redirect/error bodies, binary cleanup, bounded voice metadata/pagination, full text preservation, local extractive summary and safe chunking");
 }
}
