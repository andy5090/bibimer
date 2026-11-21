package app.bibimer;
import java.lang.reflect.*;
import java.util.*;
/** Exports only Android's prerecorded samples, never runtime/user data. */
public final class ExportAndroidDemo {
  static String json(Object x) {
    if(x==null)return "null";
    if(x instanceof String){StringBuilder b=new StringBuilder("\"");for(char c:((String)x).toCharArray()){if(c=='"'||c=='\\')b.append('\\').append(c);else if(c<32)b.append(String.format("\\u%04x",(int)c));else b.append(c);}return b.append('"').toString();}
    if(x instanceof Map){List<String> parts=new ArrayList<>();for(Object e:((Map<?,?>)x).entrySet()){Map.Entry<?,?> p=(Map.Entry<?,?>)e;parts.add(json(p.getKey())+":"+json(p.getValue()));}return "{"+String.join(",",parts)+"}";}
    if(x instanceof List){List<String> parts=new ArrayList<>();for(Object v:(List<?>)x)parts.add(json(v));return "["+String.join(",",parts)+"]";}
    return x.toString();
  }
  @SuppressWarnings("unchecked") public static void main(String[] args)throws Exception{
    Map<String,Object> result=new LinkedHashMap<>();
    for(boolean ko:new boolean[]{false,true}){
      DemoWorkspace d=new DemoWorkspace(()->100000);d.reset(ko);
      Field field=DemoWorkspace.class.getDeclaredField("sessions");field.setAccessible(true);
      Map<String,Object> sessions=(Map<String,Object>)field.get(d), agents=new LinkedHashMap<>();
      for(Object session:sessions.values()){
        Class<?> cls=session.getClass();Field agent=cls.getDeclaredField("agent"),replay=cls.getDeclaredField("replay"),items=cls.getDeclaredField("items");agent.setAccessible(true);replay.setAccessible(true);items.setAccessible(true);
        String name=(String)agent.get(session);if(name.equals("shell"))continue;
        Method complete=DemoWorkspace.class.getDeclaredMethod("completeLog",cls);complete.setAccessible(true);
        List<Object> samples=new ArrayList<>();
        for(int n=0;n<3;n++){replay.setInt(session,n);List<Map<String,Object>> list=(List<Map<String,Object>>)items.get(session);list.clear();complete.invoke(d,session);List<Object> clean=new ArrayList<>();for(Map<String,Object> item:list){Map<String,Object> copy=new LinkedHashMap<>(item);copy.remove("id");copy.remove("revision");clean.add(copy);}samples.add(clean);}
        agents.put(name,samples);
      }
      result.put(ko?"ko":"en",agents);
    }
    System.out.println(json(result));
  }
}
