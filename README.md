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

## List 曲目規則

- 每首曲目需保留 `overallLevel` 作為總級數，範圍為 1 到 5，可使用半級：1、1.5、2、2.5、3、3.5、4、4.5、5。
- 木管、銅管、打擊難度存放在 `difficulty.woodwind`、`difficulty.brass`、`difficulty.percussion`，只能使用 1 到 5 的整數級。
- List 卡片右上角只顯示總級數數字，並以粗體呈現；木管、銅管、打擊不在卡片右上角顯示。
- List 卡片的總級數需放在卡片最右側並垂直置中，數字尺寸要比標題輔助資訊醒目。
- 篩選欄需提供總級數、木管、銅管、打擊四種篩選；總級數可半級，三個分部只可整級。
- 篩選下拉選單需維持一致的原生選單樣式；級數文字使用星星圖示呈現，例如 `★`、`★★`，總級數半級在原生選單中使用前方全星加一顆空心星標示，例如 `★★ ☆`，不使用 `1/2`、`½` 或字型支援不穩定的半星字元。
- List 排列預設為字首排列，並在列表第一條分隔線提供「字首」與「總級數」點擊切換；切換控制不可放在篩選欄。
- 字首排列時，第一條分隔線左側顯示目前字首的亮藍色膠囊，右側顯示灰色「級數」膠囊；總級數排列時，左側顯示目前字首的灰色膠囊，右側顯示目前級數的亮橘色膠囊。只有第一條分隔線可切換排列。
- 總級數排列由低到高，同級再依字首/曲名排序。
- List 卡片標題必須維持單行顯示，標題過長時以程式自動縮小字體，並保留右上角總級數空間。
- 作曲者、編曲者資訊在 List 卡片中必須維持單行，內容過長時尾端使用省略號，不可換行撐高卡片。
- 編輯標籤的刪除按鈕使用穩定的 `x` 字元，避免字型或編碼造成亂碼。
- 點擊曲目展開或收合細節時，需盡量保持被點擊卡片在畫面中的位置不變，讓細節內容向下推開。
- 編輯或新增表單不得因一般輸入欄位按下 Enter 自動儲存；必須手動按下儲存按鈕才完成。textarea 可保留換行，標籤輸入可保留 Enter 新增標籤。

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
