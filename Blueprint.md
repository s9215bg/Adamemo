# Adamemo Blueprint

## 核心願景

建立一個結合「待辦管理」與「結構化清單」的單頁工具，讓日常任務與曲目資料可以在同一個介面中快速查看、搜尋與維護。

## 主要需求

- `To do` 用於管理待辦事項、期限、狀態與標籤。
- `List` 用於保存曲目、作曲者、編曲者、URL、難度與備註。
- 支援 Firebase Firestore 同步，並保留 localStorage 作為本機備援。
- 支援 GitHub Pages 部署。
- 管理員登入後才能新增、編輯、刪除資料。
- 一般訪客只能讀取公開資料。

## 資料模型

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "task",
      "title": "項目標題",
      "status": "pending",
      "dueDate": "2026-05-10T10:00:00.000+08:00",
      "tags": ["學校", "管樂團"],
      "content": "詳細內容",
      "updatedAt": "timestamp"
    },
    {
      "id": "uuid",
      "type": "info",
      "title": "曲目標題",
      "composer": "Composer",
      "arranger": "Arranger",
      "url": "https://example.com",
      "difficulty": {
        "woodwind": 3,
        "brass": 3,
        "percussion": 2
      },
      "tags": ["曲目"],
      "content": "補充資訊",
      "updatedAt": "timestamp"
    }
  ]
}
```

## 部署與安全

- `firebase-config.js` 不進入 GitHub repository。
- GitHub Actions 透過 Secrets 在部署時產生 Firebase config。
- Firestore Rules 只允許指定 Firebase Auth 管理員 email 寫入。
- API key 需要設定 HTTP referrer 限制。
