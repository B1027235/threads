"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // 引入我們做好的通訊兵

function SaveContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');

  // 狀態管理
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 網頁載入時，去 Supabase 抓取現有的分類
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setCategories(data);
    }
    fetchCategories();
  }, []);

  // 按下儲存按鈕的動作
  const handleSave = async () => {
    if (!url) return;
    setIsSaving(true);
    setMessage('儲存中...');

    let finalCategoryId = selectedCategoryId;

    // 邏輯 1：如果使用者輸入了「新分類」，先把它存進 categories 表單
    if (newCategoryName) {
      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName }])
        .select()
        .single();

      if (newCat) {
        finalCategoryId = newCat.id; // 拿到剛建好的新分類 ID
      } else {
        setMessage('建立分類失敗');
        setIsSaving(false);
        return;
      }
    }

    // 防呆：如果沒選也沒填，就擋下來
    if (!finalCategoryId) {
      setMessage('⚠️ 請選擇或輸入一個分類！');
      setIsSaving(false);
      return;
    }

    // 邏輯 2：把 Threads 網址跟分類 ID 存進 saved_threads 表單
    const { error } = await supabase
      .from('saved_threads')
      .insert([{ url: url, category_id: finalCategoryId }]);

    if (error) {
      setMessage('❌ 儲存失敗：' + error.message);
    } else {
      setMessage('🎉 成功儲存！現在可以關閉此網頁了。');
      setNewCategoryName(''); // 清空輸入框
    }
    
    setIsSaving(false);
  };

  return (
    <div className="p-8 max-w-md mx-auto mt-10 border rounded-xl shadow-lg bg-white text-black">
      <h1 className="text-2xl font-bold mb-4">📥 蒐藏 Threads</h1>
      <p className="mb-2 text-gray-600 text-sm">收到網址：</p>
      <div className="p-3 bg-blue-50 text-blue-600 break-all rounded-lg text-xs mb-6">
        {url || '尚未收到網址'}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">1. 選擇現有分類</label>
        <select
          className="w-full border p-3 rounded-lg bg-gray-50"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          disabled={!!newCategoryName} // 如果有打新分類，就停用下拉選單
        >
          <option value="">-- 請選擇分類 --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-bold text-gray-700 mb-2">2. 或建立新分類</label>
        <input
          type="text"
          placeholder="例如：技術文章、搞笑、美食..."
          className="w-full border p-3 rounded-lg bg-gray-50"
          value={newCategoryName}
          onChange={(e) => {
            setNewCategoryName(e.target.value);
            setSelectedCategoryId(''); // 如果打字，就清空下拉選單
          }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving || !url}
        className="w-full bg-black text-white p-4 rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
      >
        {isSaving ? '處理中...' : '儲存文章'}
      </button>

      {message && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center text-sm font-bold">
          {message}
        </div>
      )}
    </div>
  );
}

export default function SavePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">載入中...</div>}>
      <SaveContent />
    </Suspense>
  );
}