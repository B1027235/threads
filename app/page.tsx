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

  // 篩選與預覽用
  const [filterCat, setFilterCat] = useState('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      router.replace('/'); // 清除網址上的參數
    }
    setIsSaving(false);
  };

  // 處理刪除文章
  const deleteThread = async (id: string) => {
    if (!confirm('確定要刪除這篇文章嗎？')) return;
    await supabase.from('saved_threads').delete().eq('id', id);
    fetchData();
  };

  // 處理刪除分類
  const deleteCategory = async () => {
    if (filterCat === 'all') return;
    if (!confirm('刪除分類將會連同該分類下的所有文章一起刪除，確定嗎？')) return;
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
            <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
              {threads.length} SAVED
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
                  <option value="">選擇分類</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input 
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none"
                  placeholder="新分類..."
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
              {isSaving ? '處理中...' : '確認儲存'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 篩選工具列 */}
      <div className="max-w-5xl mx-auto px-4 mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">篩選目錄</span>
          <select 
            className="bg-transparent border-none text-lg font-bold focus:outline-none cursor-pointer"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="all">所有收藏</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {filterCat !== 'all' && (
            <button onClick={deleteCategory} className="text-xs text-red-400 hover:text-red-600 font-medium ml-2">
              刪除此分類
            </button>
          )}
        </div>
      </div>

      {/* 3. 文章清單 (卡片式) */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThreads.map((t) => (
            <div key={t.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-400 transition-all flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded text-slate-500">
                    {t.categories?.name}
                  </span>
                  <button onClick={() => deleteThread(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all text-xs">
                    刪除
                  </button>
                </div>
                
                <div className="aspect-video bg-slate-50 rounded-xl mb-4 flex items-center justify-center border border-slate-100 relative overflow-hidden">
                   <div className="text-slate-300 text-xs">Threads Preview</div>
                   <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
                </div>

                <p className="text-xs text-slate-400 mb-4 truncate">{t.url}</p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setPreviewUrl(t.url)}
                  className="bg-white border border-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all"
                >
                  快速預覽
                </button>
                <a 
                  href={t.url} target="_blank"
                  className="bg-slate-900 text-white py-2 rounded-lg text-xs font-bold text-center hover:bg-slate-800 transition-all"
                >
                  開啟原文
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 文章預覽彈窗 (Modal) */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <span className="text-sm font-bold">文章預覽</span>
              <button onClick={() => setPreviewUrl(null)} className="text-slate-400 hover:text-black text-xl">✕</button>
            </div>
            <div className="h-[500px] overflow-y-auto p-4 bg-[#F8F9FA]">
              {/* 利用 Threads Embed 機制 */}
              <iframe 
                src={`${previewUrl.split('?')[0]}/embed`}
                className="w-full h-full border-none rounded-xl"
                title="Threads Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MainDashboard />
    </Suspense>
  );
}