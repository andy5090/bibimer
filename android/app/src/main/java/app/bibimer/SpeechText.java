package app.bibimer;

import java.util.*;
import java.util.regex.*;

/** Local, extractive summary: never invokes a model or adds claims. */
final class SpeechText {
    static String plain(String source) {
        return source.replaceAll("(?m)^\\s*(```|~~~)[^\\n]*$", "")
            .replaceAll("!\\[([^\\]]*)\\]\\([^)]*\\)", "$1")
            .replaceAll("\\[([^\\]]+)\\]\\(([^)]*)\\)", "$1 ($2)")
            .replaceAll("(?m)^\\s{0,3}#{1,6}\\s+", "")
            .replaceAll("(?m)^\\s*(?:[-*+] |[0-9]+[.)] )", "")
            .replace("`", "").replaceAll("\\*\\*([^*]+)\\*\\*", "$1").replaceAll("[\\t ]+", " ").replaceAll("\\n{3,}", "\n\n").trim();
    }
    static String summary(String source) {
        String prose = source.replaceAll("(?s)(?m)^\\s*(```|~~~)[^\\n]*\\n.*?(?:^\\s*\\1\\s*$|\\z)", " ")
            .replaceAll("(?m)^\\s*\\|.*$", " ");
        String text = plain(prose);
        if (text.length() <= 650) return text;
        String[] parts = text.split("(?<=[.!?。！？])\\s*|\\n+");
        List<String> sentences = new ArrayList<>();
        Set<String> unique = new HashSet<>();
        for (String part : parts) { String value=part.trim(); if (value.length()>5 && unique.add(value)) sentences.add(value); }
        if (sentences.isEmpty()) return clip(text,650);
        Map<String,Integer> counts = new HashMap<>();
        List<Set<String>> tokens = new ArrayList<>();
        for (String sentence : sentences) {
            Set<String> words = new HashSet<>();
            Matcher match=Pattern.compile("[\\p{L}\\p{N}]{2,}").matcher(sentence.toLowerCase(Locale.ROOT));
            while(match.find()) { String word=match.group(); if(word.length()<=30)words.add(word); }
            tokens.add(words); for(String word:words)counts.put(word,counts.getOrDefault(word,0)+1);
        }
        List<Integer> order = new ArrayList<>();
        Map<Integer,Double> scores=new HashMap<>();
        for(int i=0;i<sentences.size();i++) {
            double score=(i==0?1.5:0)+(i==sentences.size()-1?1:0);
            for(String word:tokens.get(i))score+=Math.min(5,counts.get(word));
            score/=Math.sqrt(Math.max(1,tokens.get(i).size()));
            scores.put(i,score);order.add(i);
        }
        order.sort((a,b)->Double.compare(scores.get(b),scores.get(a)));
        List<Integer> chosen=new ArrayList<>();int length=0;
        for(int index:order) {
            int size=sentences.get(index).length();
            if(size<=650 && length+size+(chosen.isEmpty()?0:1)<=700) {chosen.add(index);length+=size+1;}
            if(chosen.size()==3)break;
        }
        if(chosen.isEmpty())return clip(sentences.get(order.get(0)),650);
        Collections.sort(chosen);StringBuilder result=new StringBuilder();
        for(int index:chosen){if(result.length()>0)result.append('\n');result.append(sentences.get(index));}
        return result.toString();
    }
    static String clip(String text,int limit){int end=Math.min(limit,text.length());if(end>0&&Character.isHighSurrogate(text.charAt(end-1)))end--;return text.substring(0,end)+(end<text.length()?"…":"");}
    static List<String> chunks(String text,int limit){
        List<String> result=new ArrayList<>();int start=0;
        while(start<text.length()){
            int end=Math.min(text.length(),start+limit);
            if(end<text.length()){
                if(Character.isHighSurrogate(text.charAt(end-1)))end--;
                int split=-1;
                for(int i=end-1;i>start+limit/2;i--)if("\n。！？.!? ".indexOf(text.charAt(i))>=0){split=i+1;break;}
                if(split>start)end=split;
            }
            String part=text.substring(start,end).trim();if(!part.isEmpty())result.add(part);start=end;
        }
        return result;
    }
}
