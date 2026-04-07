import { createClient } from '@supabase/supabase-js'

// 從環境變數讀取剛剛設定的網址與金鑰
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 建立並匯出 supabase 客戶端，讓專案其他地方可以使用
export const supabase = createClient(supabaseUrl, supabaseAnonKey)