# Adamemo

Adamemo 是一個簡潔的待辦與清單工具。首頁提供兩個入口：

- `To do`：管理待辦事項、期限、狀態與標籤。
- `List`：整理曲目、連結、作曲者、編曲者與難度資訊。

## 功能

- Firebase Firestore 即時同步資料。
- 本機 `localStorage` 作為離線或同步失敗時的備援。
- GitHub Pages 部署。
- Firebase Auth 管理員登入後可新增、編輯、刪除資料。
- 一般訪客可讀取公開資料，但不能寫入 Firestore。
- PWA 支援，包含 `manifest.json` 與 `service-worker.js`。

## 本機執行

由於專案使用 Firebase module 與 service worker，建議用本機伺服器開啟：

```bash
python -m http.server 8080
```

然後打開：

```text
http://localhost:8080
```

## Firebase 設定

本機需要建立：

```text
assets/js/firebase-config.js
```

可以參考：

```text
assets/js/firebase-config.example.js
```

`firebase-config.js` 會被 `.gitignore` 排除，不應上傳到 GitHub repository。

## GitHub Pages 部署

正式部署使用 GitHub Actions：

```text
.github/workflows/deploy-pages.yml
```

需要在 GitHub repository 的 `Settings > Secrets and variables > Actions` 建立以下 Secrets：

```text
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
FIREBASE_MEASUREMENT_ID
FIREBASE_ADMIN_EMAIL
```

部署時 workflow 會從 Secrets 產生 `assets/js/firebase-config.js`，但該檔案不會保存在 repository 原始碼中。

## Firestore Rules

目前規則允許所有訪客讀取 `items`，但只有指定 Firebase Auth 管理員 email 可以寫入。

更新管理員 email 後，請到 Firebase Console 的 Firestore Rules 頁面發布 `firestore.rules`。

## 安全提醒

- 不要把 `assets/js/firebase-config.js` 上傳到 GitHub。
- Firebase Web API key 會出現在前端成品中，這是正常情況。
- 真正保護資料的是 Firestore Rules、Firebase Auth 與 API key referrer 限制。
