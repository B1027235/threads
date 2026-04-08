"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function MainDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const incomingUrl = searchParams.get('url');

  // 狀態管理
  const [threads, setThreads] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 新增文章用
  const [url, setUrl] = useState(incomingUrl || '');
  const [selectedCat, setSelectedCat] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 篩選用
  const [filterCat, setFilterCat] = useState('all');

  // 初始化資料
  const fetchData = async () => {
    setLoading(true);
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    const { data: list } = await supabase.from('saved_threads').select('*, categories(name)').order('created_at', { ascending: false });
    if (cats) setCategories(cats);
    if (list) setThreads(list);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // 處理儲存
  const handleSave = async () => {
    if (!url || isSaving) return;
    setIsSaving(true);
    let catId = selectedCat;

    if (newCatName) {
      const { data: nCat } = await supabase.from('categories').insert([{ name: newCatName }]).select().single();
      if (nCat) catId = nCat.id;
    }

    if (!catId) { alert('請選擇分類'); setIsSaving(false); return; }

    const { error } = await supabase.from('saved_threads').insert([{ url, category_id: catId }]);
    if (!error) {
      setUrl(''); setNewCatName(''); setSelectedCat('');
      fetchData();
      router.replace('/'); // 清除網址上的參數，保持網址乾淨
    }
    setIsSaving(false);
  };

  // 🌟 處理刪除文章 (現在按鈕非常明顯了)
  const deleteThread = async (id: string) => {
    if (!confirm('確定要永久刪除這篇收藏嗎？')) return;
    await supabase.from('saved_threads').delete().eq('id', id);
    fetchData(); // 刪除後重新載入畫面
  };

  // 處理刪除分類
  const deleteCategory = async () => {
    if (filterCat === 'all') return;
    if (!confirm('⚠️ 警告：刪除分類將會連同該分類下的「所有文章」一起刪除，確定嗎？')) return;
    await supabase.from('categories').delete().eq('id', filterCat);
    setFilterCat('all');
    fetchData();
  };

  // 篩選邏輯
  const filteredThreads = filterCat === 'all' 
    ? threads 
    : threads.filter(t => t.category_id === filterCat);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans pb-20">
      {/* 1. 頂部導航與新增區 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-heavy tracking-tight">THREADS<span className="text-slate-400">ARCHIVE</span></h1>
            <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">
              {threads.length} 篇收藏
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input 
                className="md:col-span-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                placeholder="貼上 Threads 網址..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <select 
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none"
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  disabled={!!newCatName}
                >
                  <option value="">選擇現有分類</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input 
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none"
                  placeholder="或建立新分類..."
                  value={newCatName}
                  onChange={(e) => {setNewCatName(e.target.value); setSelectedCat('');}}
                />
              </div>
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving || !url}
              className="w-full mt-3 bg-slate-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-slate-800 disabled:bg-slate-300 transition-all shadow-lg shadow-slate-200"
            >
              {isSaving ? '處理中...' : '確認儲存文章'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 篩選工具列 */}
      <div className="max-w-5xl mx-auto px-4 mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">目前顯示分類</span>
          <select 
            className="bg-transparent border-none text-xl font-bold focus:outline-none cursor-pointer text-slate-800"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="all">所有收藏紀錄</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {filterCat !== 'all' && (
            <button onClick={deleteCategory} className="text-xs text-red-400 hover:text-red-600 font-medium ml-2 bg-red-50 px-2 py-1 rounded-md">
              🗑️ 刪除此分類
            </button>
          )}
        </div>
      </div>

      {/* 3. 文章清單 (卡片式) */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThreads.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col shadow-sm">
              
              {/* 卡片標頭：分類與日期 */}
              <div className="p-4 flex justify-between items-center border-b border-slate-50">
                <span className="text-[10px] font-bold tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase">
                  {t.categories?.name || '未分類'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(t.created_at).toLocaleDateString('zh-TW')}
                </span>
              </div>
              
              {/* 🌟 核心升級：直接把 Threads 預覽坎入卡片中 */}
              {/* 設定固定高度 360px，超出的部分可以滾動 */}
              <div className="h-[360px] w-full bg-[#F8F9FA] overflow-y-auto relative">
                 <iframe 
                   src={`${t.url.split('?')[0]}/embed`}
                   className="w-full h-full border-none absolute inset-0"
                   title="Threads Preview"
                   loading="lazy" /* 懶載入魔法：滑到才讀取，保護效能 */
                 />
              </div>

              {/* 卡片底部操作區：刪除與開啟原文 */}
              <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => deleteThread(t.id)}
                  className="flex-1 bg-white border border-red-200 text-red-500 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-all flex items-center justify-center gap-1"
                >
                  🗑️ 刪除
                </button>
                <a 
                  href={t.url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 hover:bg-slate-800 transition-all shadow-md"
                >
                  開啟原文 ↗
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* 沒文章的提示 */}
        {filteredThreads.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 mt-6 shadow-sm">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-slate-500 font-medium text-lg">這個分類目前還沒有文章喔！</p>
            <p className="text-slate-400 text-sm mt-1">快用手機捷徑把喜歡的 Threads 存進來吧</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400 font-medium animate-pulse">正在為您準備收藏庫...</div>}>
      <MainDashboard />
    </Suspense>
  );
}