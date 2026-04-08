"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSavedThreads() {
      // 從資料庫抓取所有儲存的文章，並把分類名稱也一起抓出來
      const { data, error } = await supabase
        .from('saved_threads')
        .select(`
          *,
          categories ( name )
        `)
        .order('created_at', { ascending: false });

      if (data) setThreads(data);
      setLoading(false);
    }
    fetchSavedThreads();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold">正在打開你的靈感庫...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex justify-between items-end border-b pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-black mb-2">📥 Threads 蒐藏庫</h1>
            <p className="text-gray-500 text-sm">由 AI 自動為你提煉精華</p>
          </div>
          <div className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">
            共 {threads.length} 篇
          </div>
        </header>

        <div className="grid gap-6">
          {threads.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all">
              {/* 分類標籤與時間 */}
              <div className="flex justify-between items-center mb-4">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                  {item.categories?.name || '未分類'}
                </span>
                <span className="text-gray-400 text-xs font-medium">
                  {new Date(item.created_at).toLocaleDateString('zh-TW')}
                </span>
              </div>
              
              {/* AI 總結區塊 */}
              <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                <h2 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  ✨ AI 總結摘要
                </h2>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {item.ai_summary || '這篇文章沒有總結內容。'}
                </p>
              </div>

              {/* 原文連結 */}
              <div className="flex justify-end">
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-bold text-white bg-black px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  閱讀原文 ➔
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* 如果還沒有文章的提示 */}
        {threads.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 mt-10">
            <p className="text-gray-500 font-medium">目前還沒有蒐藏任何文章喔！<br/>快用手機分享 Threads 過來吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}