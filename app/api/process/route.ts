import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 拿出我們藏好的 Gemini 鑰匙
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    // 接收從網頁前端傳過來的網址和分類 ID
    const { url, categoryId } = await request.json();

    // 1. 魔法爬蟲：使用 Jina Reader 抓取 Threads 內容
    const jinaUrl = `https://r.jina.ai/${url}`;
    const jinaResponse = await fetch(jinaUrl);
    const content = await jinaResponse.text();

    // 2. 呼叫大腦：請 Gemini 幫忙寫總結
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `請幫我總結以下這篇 Threads 文章的重點，用繁體中文回答，盡量保持簡短精煉：\n\n${content}`;
    const aiResult = await model.generateContent(prompt);
    const summary = aiResult.response.text();

    // 3. 存入金庫：把所有東西一起存進 Supabase
    const { error } = await supabase
      .from('saved_threads')
      .insert([{ 
         url: url, 
         category_id: categoryId,
         content: content,      // 存入抓到的原始文字
         ai_summary: summary    // 存入 AI 總結
      }]);

    if (error) throw error;

    // 成功的話，把 AI 的總結回傳給網頁看
    return NextResponse.json({ success: true, summary: summary });
    
  } catch (error: any) {
    console.error("後端處理發生錯誤:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}