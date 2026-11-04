package app.bibimer;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import org.json.*;

/** Stateless synthesis requests to fixed providers; no retries or redirects. */
final class SpeechOutputApi {
    static final String ELEVEN_MODEL="eleven_multilingual_v2";
    private final VoiceTranscription.Connector connector;
    private volatile HttpURLConnection active;
    SpeechOutputApi(){this(url->(HttpURLConnection)url.openConnection());}
    SpeechOutputApi(VoiceTranscription.Connector connector){this.connector=connector;}
    void cancel(){HttpURLConnection c=active;if(c!=null)c.disconnect();}
    private HttpURLConnection open(String key,String path)throws Exception{
        if(key==null||!key.matches("[\\x21-\\x7e]{1,512}"))throw new IOException("voice_key_required");
        HttpURLConnection c=connector.open(new URL("https://api.elevenlabs.io/"+path));
        c.setInstanceFollowRedirects(false);c.setUseCaches(false);c.setConnectTimeout(15000);c.setReadTimeout(60000);
        c.setRequestProperty("xi-api-key",key);
        active=c;return c;
    }
    JSONObject voices(String key,String page,VoiceTranscription.Current current)throws Exception{
        if(!current.current()||page==null||page.length()>1024)throw new IOException();
        HttpURLConnection c=open(key,"v2/voices?page_size=100"+(page.isEmpty()?"":"&next_page_token="+URLEncoder.encode(page,"UTF-8")));
        try{
            if(!current.current())throw new IOException();
            int code=c.getResponseCode();if(code!=200)throw new IOException(VoiceTranscription.status(code));
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            try(InputStream in=c.getInputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(!current.current()||out.size()+n>2*1024*1024)throw new IOException();out.write(b,0,n);}}
            JSONObject raw=new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));
            JSONArray list=new JSONArray(),source=raw.getJSONArray("voices");
            for(int i=0;i<source.length();i++){JSONObject row=source.getJSONObject(i);String id=row.optString("voice_id");if(id.matches("[A-Za-z0-9_-]{1,128}"))list.put(new JSONObject().put("id",id).put("label",row.optString("name",id).substring(0,Math.min(200,row.optString("name",id).length()))));}
            return new JSONObject().put("voices",list).put("hasMore",raw.optBoolean("has_more")).put("next",raw.optString("next_page_token",""));
        }finally{c.disconnect();if(active==c)active=null;}
    }
    void synthesize(String provider,String key,String voice,String text,File target,VoiceTranscription.Current current)throws Exception{
        if(text==null||text.isEmpty()||text.length()>2000||!current.current())throw new IOException("tts_failed");
        JSONObject body=new JSONObject();String path;
        if("elevenlabs".equals(provider)&&voice!=null&&voice.matches("[A-Za-z0-9_-]{1,128}")){
            path="v1/text-to-speech/"+voice+"?output_format=mp3_44100_128";body.put("model_id",ELEVEN_MODEL).put("text",text);
        }else throw new IOException("tts_unavailable");
        HttpURLConnection c=open(key,path);boolean success=false;
        try{
            byte[] bytes=body.toString().getBytes(StandardCharsets.UTF_8);
            c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("Accept","audio/mpeg");c.setFixedLengthStreamingMode(bytes.length);
            if(!current.current())throw new IOException();
            try(OutputStream out=c.getOutputStream()){out.write(bytes);}
            if(!current.current())throw new IOException();
            int status=c.getResponseCode();if(status!=200)throw new IOException(VoiceTranscription.status(status));
            String type=c.getContentType();if(type!=null&&!(type.startsWith("audio/")||type.startsWith("application/octet-stream")))throw new IOException("tts_failed");
            try(InputStream in=c.getInputStream();OutputStream out=new FileOutputStream(target)){byte[] b=new byte[8192];int n,total=0;while((n=in.read(b))!=-1){if(!current.current()||(total+=n)>16*1024*1024)throw new IOException();out.write(b,0,n);}if(total==0)throw new IOException();}
            success=current.current();if(!success)throw new IOException();
        }finally{c.disconnect();if(active==c)active=null;if(!success)target.delete();}
    }
}
