🚀 個人備忘錄與資訊整合系統 (Project: Nexus Note)1. 核心願景建立一個結合 「高主動性待辦」 與 「結構化資料庫」 的單頁應用程式 (SPA)。解決傳統備忘錄過於被動、資訊難以檢索的缺點，並整合前端開發者習慣的介面。2. 核心痛點解決方案痛點解決方案實作機制提醒度不足視覺壓迫感設計逾期事項自動變色、標題閃爍、瀏覽器原生 Notification 推送。資訊檢索難Key-Value 結構化支援自定義屬性（如型號、連結、密碼提示），不需在長文中翻找。功能不齊全雙軌制管理整合「任務流」與「知識庫」，讓「要做的事」與「要查的資料」在同一畫面連動。3. 系統架構 (System Architecture)3.1 前端技術棧框架/語法: HTML5, CSS3 (Tailwind CSS 推薦), Vanilla JS 或 Vue.js (輕量好上手)。部署: GitHub Pages。儲存:短期/離線: LocalStorage。長期/跨裝置: Firebase Firestore (實時同步)。3.2 資料模型 (Data Model)JSON{
  "items": [
    {
      "id": "uuid",
      "category": "task", // 或 "info"
      "title": "項目標題",
      "priority": "P0", // P0:緊急, P1:優先, P2:一般
      "status": "pending", // pending, completed
      "due_date": "2026-05-10T10:00:00",
      "attributes": {
        "model": "Courtois FH222", // 自定義鍵值對
        "location": "器材室"
      },
      "content": "Markdown 格式內容...",
      "tags": ["學校", "管樂團"],
      "updated_at": "timestamp"
    }
  ]
}
4. 介面規劃 (Interface Layout)4.1 佈局設計左側：導覽/快速過濾器今天、最近 7 天、所有資訊、各類標籤。中間：智能列表區待辦區： 依照 priority 排序。逾期會出現 "Overdue" 警告。資訊區： 以卡片呈現，顯示標題與 tags。右側：全功能編輯面板點擊列表後開啟。上方為「快速資訊欄」（Key-Value），下方為「詳細內容」（Markdown 編輯器）。5. 功能亮點 (Feature Highlights)[通知系統]：網頁開啟時，自動彈出視窗提示今日未完成的 P0 事項。[快速鍵支援]：Ctrl + N：新增待辦。Ctrl + K：全域搜尋。[PWA 支援]：支援「加入主畫面」，即便在手機上也能像原生 App 一樣快速點開。[一鍵複製]：針對「資訊類」項目，特定屬性旁設有「複製按鈕」，方便快速使用資料（如帳號、型號）。6. 開發藍圖 (Roadmap)[ ] Phase 1: 基礎框架建立 JSON 資料結構與 Mock Data。實作左右分割的響應式介面 (Mobile Friendly)。[ ] Phase 2: 核心功能實作待辦事項勾選機制。加入 Markdown 渲染功能。實作關鍵字搜尋與標籤過濾。[ ] Phase 3: 提醒與同步串接 Firebase 實現跨裝置資料同步。實作逾期視覺提醒邏輯。設置瀏覽器 Notification 權限。[ ] Phase 4: 優化與 PWA加入 Dark Mode (開發者必備)。完成 Manifest.json 設置，支援手機端安裝。