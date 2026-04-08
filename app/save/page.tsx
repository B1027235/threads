"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function SaveContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 抓取現有的分類
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

  // 儲存與呼叫 AI 的主要邏輯
  const handleSave = async () => {
    if (!url) return;
    setIsSaving(true);
    setMessage('處理中...');

    let finalCategoryId = selectedCategoryId;

    // 邏輯 1：處理建立新分類
    if (newCategoryName) {
      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName }])
        .select()
        .single();

      if (newCat) {
        finalCategoryId = newCat.id;
      } else {
        setMessage('建立分類失敗');
        setIsSaving(false);
        return;
      }
    }

    if (!finalCategoryId) {
      setMessage('⚠️ 請選擇或輸入一個分類！');
      setIsSaving(false);
      return;
    }

    // 邏輯 2：呼叫我們剛寫好的後端 API (包含爬蟲 + Gemini AI + 存資料庫)
    setMessage('🤖 正在請 AI 閱讀文章並寫總結，請稍候...');

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url, categoryId: finalCategoryId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage('❌ 處理失敗：' + result.error);
      } else {
        setMessage(`🎉 成功儲存！AI 總結：${result.summary}`);
        setNewCategoryName('');
      }
    } catch (error) {
      setMessage('❌ 發生網路連線錯誤，請重試。');
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
          disabled={!!newCategoryName}
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
            setSelectedCategoryId('');
          }}
        />
      </div>

      <button
        type="button"
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