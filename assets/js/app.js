(function () {
  const STORAGE_KEY = "adamemo-items";
  const SEEDED_KEY = "adamemo-firestore-seeded";
  const DRAFT_ID = "__draft__";
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDFA5r_Jaz8NhehGo3UjgF8vw2S_WR9Zl4",
    authDomain: "adamemo-0623.firebaseapp.com",
    projectId: "adamemo-0623",
    storageBucket: "adamemo-0623.firebasestorage.app",
    messagingSenderId: "1091996954122",
    appId: "1:1091996954122:web:8527c28ebe5e3833b5b9f3",
    measurementId: "G-7CHNL654YN"
  };
  const TITLE_COLLATOR = new Intl.Collator(["en", "ja", "zh-Hant"], {
    sensitivity: "base",
    numeric: true
  });

  const state = {
    items: loadLocalItems(),
    section: "",
    selectedId: "",
    search: "",
    editing: false,
    draftType: "",
    scoreFilters: {
      woodwind: "",
      brass: "",
      percussion: ""
    },
    filtersOpen: false,
    firebase: null,
    unsubscribe: null
  };

  const elements = {
    shell: document.querySelector("#app-shell"),
    backButton: document.querySelector("#back-button"),
    syncStatus: document.querySelector("#sync-status"),
    homeView: document.querySelector("#home-view"),
    sectionView: document.querySelector("#section-view"),
    sectionTitle: document.querySelector("#section-title"),
    sectionSummary: document.querySelector("#section-summary"),
    todoCount: document.querySelector("#todo-count"),
    listCount: document.querySelector("#list-count"),
    itemList: document.querySelector("#item-list"),
    filterControls: document.querySelector("#filter-controls"),
    searchInput: document.querySelector("#search-input"),
    filterToggle: document.querySelector("#filter-toggle"),
    filterDone: document.querySelector("#filter-done"),
    filterClear: document.querySelector("#filter-clear"),
    scoreFilters: document.querySelector("#score-filters"),
    newItemButton: document.querySelector("#new-item-button")
  };

  init();

  function init() {
    document.body.classList.add("home-page");
    registerServiceWorker();
    bindEvents();
    render();
    connectFirebase();
  }

  function bindEvents() {
    document.querySelectorAll(".entry-card").forEach((card) => {
      card.addEventListener("click", () => openSection(card.dataset.section));
    });

    elements.backButton.addEventListener("click", showHome);
    elements.newItemButton.addEventListener("click", startNewDraft);
    elements.itemList.addEventListener("click", handleListClick);
    elements.itemList.addEventListener("keydown", handleListKeydown);
    elements.itemList.addEventListener("submit", handleDetailSubmit);

    elements.searchInput.addEventListener("input", (event) => {
      state.search = event.target.value.trim().toLowerCase();
      renderList();
    });

    elements.filterToggle.addEventListener("click", () => {
      setScoreFiltersOpen(!state.filtersOpen);
    });

    elements.filterDone.addEventListener("click", () => {
      setScoreFiltersOpen(false);
    });

    elements.filterClear.addEventListener("click", () => {
      clearScoreFilters();
    });

    elements.scoreFilters.addEventListener("change", (event) => {
      const key = event.target.dataset.scoreFilter;
      if (!key) return;
      state.scoreFilters[key] = event.target.value;
      renderList();
    });

  }

  async function connectFirebase() {
    try {
      const [{ initializeApp }, firestore] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
      ]);

      const app = initializeApp(FIREBASE_CONFIG);
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js")
        .then(({ getAnalytics, isSupported }) => {
          isSupported().then((supported) => {
            if (supported) getAnalytics(app);
          }).catch(() => {});
        })
        .catch(() => {});

      const db = firestore.getFirestore(app);
      const collectionRef = firestore.collection(db, "items");
      state.firebase = { db, collectionRef, firestore };
      setSyncStatus("Firebase 同步中");

      state.unsubscribe = firestore.onSnapshot(
        collectionRef,
        async (snapshot) => {
          const remoteItems = snapshot.docs.map((document) => normalizeItem({ id: document.id, ...document.data() }));
          if (!remoteItems.length && hasStoredLocalItems() && !localStorage.getItem(SEEDED_KEY)) {
            localStorage.setItem(SEEDED_KEY, "true");
            try {
              await Promise.all(state.items.map((item) => writeRemote(item)));
            } catch (error) {
              state.firebase = null;
              setSyncStatus(`Firestore 寫入失敗：${getFirebaseErrorText(error)}`);
            }
            return;
          }

          state.items = remoteItems.length ? remoteItems : state.items;
          saveLocalItems();
          setSyncStatus("已連線 Firestore");
          render();
        },
        (error) => {
          state.firebase = null;
          setSyncStatus(`Firestore 讀取失敗：${getFirebaseErrorText(error)}`);
        }
      );
    } catch (error) {
      setSyncStatus(`Firebase 載入失敗：${getFirebaseErrorText(error)}`);
    }
  }

  function openSection(section) {
    state.section = section;
    state.search = "";
    state.selectedId = "";
    state.editing = false;
    state.draftType = "";
    state.filtersOpen = false;
    elements.searchInput.value = "";
    resetScoreFilters();
    elements.homeView.classList.add("hidden");
    elements.sectionView.classList.remove("hidden");
    elements.backButton.classList.remove("hidden");
    document.body.classList.remove("home-page");
    elements.shell.classList.remove("home-mode", "theme-task", "theme-info");
    elements.shell.classList.add(section === "task" ? "theme-task" : "theme-info");
    render();
  }

  function showHome() {
    state.section = "";
    state.selectedId = "";
    state.editing = false;
    state.draftType = "";
    state.filtersOpen = false;
    elements.homeView.classList.remove("hidden");
    elements.sectionView.classList.add("hidden");
    elements.backButton.classList.add("hidden");
    document.body.classList.add("home-page");
    elements.shell.classList.remove("theme-task", "theme-info");
    elements.shell.classList.add("home-mode");
    render();
  }

  function render() {
    elements.todoCount.textContent = state.items.filter((item) => item.type === "task" && item.status !== "completed").length;
    elements.listCount.textContent = state.items.filter((item) => item.type === "info").length;
    renderList();
  }

  function renderList() {
    if (!state.section) return;

    const items = getVisibleItems();
    const sectionName = getSectionName(state.section);
    elements.sectionTitle.textContent = sectionName;
    elements.sectionSummary.textContent = `${items.length} 個項目`;
    elements.newItemButton.textContent = `新增 ${sectionName}`;
    elements.newItemButton.classList.toggle("hidden", Boolean(state.draftType));
    elements.searchInput.placeholder = state.section === "info" ? "搜尋曲名、作曲家、編曲家、標籤" : "搜尋標題、內容或標籤";
    updateFilterControls();

    if (!items.length && !state.draftType) {
      elements.itemList.innerHTML = `<div class="empty-state">目前沒有項目</div>`;
      return;
    }

    elements.itemList.innerHTML = `${renderItemList(items)}${state.draftType ? renderDraftForm() : ""}`;
  }

  function renderItemList(items) {
    if (state.section !== "info") return items.map(renderItemCard).join("");

    let currentInitial = "";
    return items.map((item) => {
      const initial = getTitleInitial(item.title);
      const divider = initial !== currentInitial ? renderInitialDivider(initial) : "";
      currentInitial = initial;
      return `${divider}${renderItemCard(item)}`;
    }).join("");
  }

  function renderInitialDivider(initial) {
    return `
      <div class="initial-divider" aria-label="${escapeAttr(initial)} 開頭">
        <span>${escapeHtml(initial)}-</span>
      </div>
    `;
  }

  function renderItemCard(item) {
    const isTask = item.type === "task";
    const progress = isTask ? getDueProgress(item) : 0;
    const progressStyle = isTask && item.dueDate ? ` style="transform: scaleX(${progress});"` : "";
    const dueText = item.dueDate ? formatDate(item.dueDate) : "無期限";
    const tags = sortTagsByLanguage(item.tags).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    const scoreMeta = isTask ? "" : renderScoreListMeta(item);
    const active = item.id === state.selectedId ? " active" : "";
    const completed = isTask && item.status === "completed" ? " completed" : "";
    const urgent = isTask && progress >= 0.8 && item.status !== "completed" ? " urgent" : "";
    const typeClass = isTask ? " item-task" : " item-info";

    return `
      <article class="item-card${typeClass}${active}${completed}${urgent}" data-id="${escapeAttr(item.id)}">
        <button class="item-card-button" data-action="toggle-detail" data-id="${escapeAttr(item.id)}" type="button">
          ${isTask ? `<span class="time-bar"${progressStyle}></span>` : ""}
          <div class="item-card-content">
            <div class="item-title-row">
              <h3>${escapeHtml(item.title)}</h3>
              ${isTask ? `<span class="due-label">${escapeHtml(dueText)}</span>` : ""}
            </div>
            ${isTask ? `<p>${escapeHtml(item.content || "沒有內容")}</p>` : ""}
            ${scoreMeta}
            ${isTask ? `<div class="item-tags">${tags}</div>` : ""}
          </div>
        </button>
        ${item.id === state.selectedId ? renderExpandedDetail(item) : ""}
      </article>
    `;
  }

  function renderScoreListMeta(item) {
    const composer = item.composer ? escapeHtml(item.composer) : "未填作曲";
    const arranger = item.arranger ? ` / arr. ${escapeHtml(item.arranger)}` : "";
    return `
      <div class="score-list-meta">
        <span>${composer}${arranger}</span>
      </div>
    `;
  }

  function renderDifficultyBadges(item) {
    const difficulty = getScoreDifficulty(item);
    return `
      <div class="difficulty-row">
        <span>木管 ${renderStars(difficulty.woodwind)}</span>
        <span>銅管 ${renderStars(difficulty.brass)}</span>
        <span>打擊 ${renderStars(difficulty.percussion)}</span>
      </div>
    `;
  }

  function renderExpandedDetail(item) {
    const isTask = item.type === "task";
    if (state.editing) {
      return `
        <form class="expanded-detail editor-form" data-id="${escapeAttr(item.id)}">
          <div class="detail-topline">
            <span class="category-pill">${getSectionName(item.type)}</span>
            <div class="detail-actions top-actions">
              <button class="danger-button" data-action="delete" data-id="${escapeAttr(item.id)}" type="button">刪除</button>
            </div>
          </div>

          <label class="field">
            <span>標題</span>
            <input name="title" value="${escapeAttr(item.title)}" required />
          </label>

          ${isTask ? `
            <div class="field-grid">
              <label class="field">
                <span>期限</span>
                <input name="dueDate" type="datetime-local" value="${escapeAttr(toDateTimeInput(item.dueDate))}" />
              </label>
              <label class="field">
                <span>狀態</span>
                <select name="status">
                  <option value="pending"${item.status === "pending" ? " selected" : ""}>進行中</option>
                  <option value="completed"${item.status === "completed" ? " selected" : ""}>已完成</option>
                </select>
              </label>
            </div>
          ` : ""}

          ${!isTask ? renderScoreEditorFields(item) : ""}

          ${renderTagEditor(item.tags)}

          <label class="field">
            <span>${isTask ? "內容" : "備註 / 收納資料"}</span>
            <textarea name="content" rows="${isTask ? 8 : 12}">${escapeHtml(item.content)}</textarea>
          </label>

          <div class="detail-actions bottom-actions">
            <button class="secondary-button" data-action="cancel-edit" data-id="${escapeAttr(item.id)}" type="button">取消</button>
            <button class="primary-button" type="submit">完成</button>
          </div>
        </form>
      `;
    }

    const sortedDetailTags = sortTagsByLanguage(item.tags);
    const detailTags = sortedDetailTags.length ? sortedDetailTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") : "<em>沒有標籤</em>";

    return `
      <div class="expanded-detail readonly-detail">
        <div class="detail-topline">
          <span class="category-pill">${getSectionName(item.type)}</span>
          <button class="secondary-button" data-action="edit" data-id="${escapeAttr(item.id)}" type="button">編輯</button>
        </div>
        <h2>${escapeHtml(item.title)}</h2>
        ${isTask ? `
          <dl>
            <div><dt>期限</dt><dd>${escapeHtml(item.dueDate ? formatDate(item.dueDate) : "無期限")}</dd></div>
            <div><dt>狀態</dt><dd>${item.status === "completed" ? "已完成" : "進行中"}</dd></div>
          </dl>
        ` : renderScoreReadonlyFields(item)}
        <p class="${isTask ? "" : "list-record-content"}">${escapeHtml(item.content || "沒有內容")}</p>
        <div class="readonly-tags">${detailTags}</div>
      </div>
    `;
  }

  function renderScoreEditorFields(item) {
    const difficulty = getScoreDifficulty(item);
    return `
      <div class="field-grid">
        <label class="field">
          <span>Composer 作曲家</span>
          <input name="composer" value="${escapeAttr(item.composer || "")}" />
        </label>
        <label class="field">
          <span>Arranger 編曲家</span>
          <input name="arranger" value="${escapeAttr(item.arranger || "")}" />
        </label>
      </div>

      <label class="field">
        <span>URL 樂譜電子檔連結</span>
        <div class="url-input-row">
          <input name="url" type="url" inputmode="url" value="${escapeAttr(item.url || "")}" />
          <button class="secondary-button copy-url-button" data-action="copy-url-input" type="button">複製</button>
        </div>
      </label>

      <div class="field-grid three">
        ${renderDifficultySelect("woodwind", "木管難度", difficulty.woodwind)}
        ${renderDifficultySelect("brass", "銅管難度", difficulty.brass)}
        ${renderDifficultySelect("percussion", "打擊難度", difficulty.percussion)}
      </div>
    `;
  }

  function renderScoreReadonlyFields(item) {
    const url = item.url
      ? `<span class="url-value"><a href="${escapeAttr(item.url)}" target="_blank" rel="noopener">開啟樂譜連結</a><button class="secondary-button copy-url-button" data-action="copy-url" data-url="${escapeAttr(item.url)}" type="button">複製</button></span>`
      : "未填寫";
    return `
      <dl>
        <div><dt>Composer</dt><dd>${escapeHtml(item.composer || "未填寫")}</dd></div>
        <div><dt>Arranger</dt><dd>${escapeHtml(item.arranger || "未填寫")}</dd></div>
        <div><dt>URL</dt><dd>${url}</dd></div>
      </dl>
      ${renderDifficultyBadges(item)}
    `;
  }

  function renderDifficultySelect(name, label, value) {
    return `
      <label class="field">
        <span>${label}</span>
        <select name="${name}">
          ${[1, 2, 3, 4, 5].map((level) => `<option value="${level}"${Number(value) === level ? " selected" : ""}>${level} 星</option>`).join("")}
        </select>
      </label>
    `;
  }

  function renderDraftForm() {
    const isTask = state.draftType === "task";
    const now = new Date();
    const defaultDue = isTask ? toDateTimeInput(addHours(now, 24).toISOString()) : "";
    return `
      <article class="item-card draft-card ${isTask ? "item-task" : "item-info"}" data-id="${DRAFT_ID}">
        <form class="expanded-detail editor-form" data-id="${DRAFT_ID}" data-type="${escapeAttr(state.draftType)}">
          <div class="detail-topline">
            <span class="category-pill">新增 ${getSectionName(state.draftType)}</span>
          </div>

          <label class="field">
            <span>標題</span>
            <input name="title" placeholder="${isTask ? "待辦標題" : "曲名"}" required />
          </label>

          ${isTask ? `
            <div class="field-grid">
              <label class="field">
                <span>期限</span>
                <input name="dueDate" type="datetime-local" value="${escapeAttr(defaultDue)}" />
              </label>
              <label class="field">
                <span>狀態</span>
                <select name="status">
                  <option value="pending" selected>進行中</option>
                  <option value="completed">已完成</option>
                </select>
              </label>
            </div>
          ` : renderScoreEditorFields(createItemFromDraft({ dataset: { type: "info" } }))}

          ${renderTagEditor([])}

          <label class="field">
            <span>${isTask ? "內容" : "備註 / 收納資料"}</span>
            <textarea name="content" rows="${isTask ? 7 : 12}"></textarea>
          </label>

          <div class="detail-actions bottom-actions">
            <button class="secondary-button" data-action="cancel-draft" type="button">取消</button>
            <button class="primary-button" type="submit">完成</button>
          </div>
        </form>
      </article>
    `;
  }

  function handleListClick(event) {
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;
    const action = actionElement.dataset.action;
    const id = actionElement.dataset.id;

    if (action === "toggle-detail") {
      state.selectedId = state.selectedId === id ? "" : id;
      state.editing = false;
      state.draftType = "";
      render();
      return;
    }

    if (action === "edit") {
      state.selectedId = id;
      state.editing = true;
      state.draftType = "";
      render();
      const form = elements.itemList.querySelector(`form[data-id="${cssEscape(id)}"]`);
      form?.querySelector("input[name='title']")?.focus();
      return;
    }

    if (action === "cancel-draft") {
      state.selectedId = "";
      state.editing = false;
      state.draftType = "";
      render();
      return;
    }

    if (action === "cancel-edit") {
      state.editing = false;
      render();
      return;
    }

    if (action === "delete") {
      deleteSelectedItem(id);
    }

    if (action === "add-tag") {
      addTag(actionElement.closest(".tag-editor"));
      return;
    }

    if (action === "remove-tag") {
      actionElement.closest(".tag-chip-edit")?.remove();
      return;
    }

    if (action === "copy-url") {
      copyUrl(actionElement.dataset.url || "", actionElement);
      return;
    }

    if (action === "copy-url-input") {
      copyUrlFromInput(actionElement);
    }
  }

  function handleDetailSubmit(event) {
    event.preventDefault();
    const form = event.target.closest(".editor-form");
    if (!form) return;
    saveEditor(form.dataset.id, form);
  }

  function handleListKeydown(event) {
    if (event.key !== "Enter" || !event.target.matches("[data-tag-input]")) return;
    event.preventDefault();
    addTag(event.target.closest(".tag-editor"));
  }

  function addTag(editor) {
    if (!editor) return;
    const input = editor.querySelector("[data-tag-input]");
    const value = input.value.trim();
    if (!value) return;
    const tags = collectTags(editor);
    if (!tags.includes(value)) {
      editor.querySelector(".tag-editor-list").insertAdjacentHTML("beforeend", renderEditableTag(value));
      sortTagEditor(editor);
    }
    input.value = "";
    input.focus();
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  async function saveEditor(id, form) {
    const isDraft = id === DRAFT_ID;
    const item = isDraft ? createItemFromDraft(form) : state.items.find((current) => current.id === id);
    if (!item) return;
    const formData = new FormData(form);
    const isTask = item.type === "task";

    item.title = String(formData.get("title") || "").trim() || "未命名";
    item.dueDate = isTask && formData.get("dueDate") ? new Date(formData.get("dueDate")).toISOString() : "";
    item.status = isTask ? String(formData.get("status") || "pending") : "stored";
    item.tags = sortTagsByLanguage(collectTags(form.querySelector(".tag-editor")));
    item.content = String(formData.get("content") || "").trim();
    if (!isTask) {
      item.composer = String(formData.get("composer") || "").trim();
      item.arranger = String(formData.get("arranger") || "").trim();
      item.url = String(formData.get("url") || "").trim();
      item.difficulty = {
        woodwind: toDifficulty(formData.get("woodwind")),
        brass: toDifficulty(formData.get("brass")),
        percussion: toDifficulty(formData.get("percussion"))
      };
    }
    item.updatedAt = new Date().toISOString();

    if (isDraft) {
      state.items.unshift(item);
      state.selectedId = item.id;
    }
    state.editing = false;
    state.draftType = "";
    await persistItem(item);
    render();
  }

  function createItemFromDraft(form) {
    const now = new Date();
    const type = form.dataset.type || state.section || "task";
    return normalizeItem({
      id: crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`,
      type,
      title: "",
      status: type === "task" ? "pending" : "stored",
      dueDate: "",
      startedAt: now.toISOString(),
      composer: "",
      arranger: "",
      url: "",
      difficulty: {
        woodwind: 1,
        brass: 1,
        percussion: 1
      },
      tags: [],
      content: "",
      updatedAt: now.toISOString()
    });
  }

  function renderTagEditor(tags) {
    const sortedTags = sortTagsByLanguage(tags);
    return `
      <section class="field tag-editor">
        <span>標籤</span>
        <div class="tag-editor-list">
          ${sortedTags.map(renderEditableTag).join("")}
        </div>
        <div class="tag-input-row">
          <input data-tag-input type="text" placeholder="新增單一標籤" />
          <button class="secondary-button tag-add-button" data-action="add-tag" type="button" aria-label="新增標籤">+</button>
        </div>
      </section>
    `;
  }

  function renderEditableTag(tag) {
    return `
      <span class="tag-chip-edit" data-tag-value="${escapeAttr(tag)}">
        ${escapeHtml(tag)}
        <button data-action="remove-tag" type="button" aria-label="移除 ${escapeAttr(tag)}">×</button>
      </span>
    `;
  }

  function collectTags(editor) {
    if (!editor) return [];
    return [...editor.querySelectorAll("[data-tag-value]")]
      .map((tag) => tag.dataset.tagValue.trim())
      .filter(Boolean);
  }

  function sortTagEditor(editor) {
    const list = editor.querySelector(".tag-editor-list");
    const tags = sortTagsByLanguage(collectTags(editor));
    list.innerHTML = tags.map(renderEditableTag).join("");
  }

  async function copyUrl(url, button) {
    const originalText = button.textContent;
    if (!url) {
      button.textContent = "沒有連結";
      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1400);
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        fallbackCopyText(url);
      }
      button.textContent = "已複製";
    } catch (error) {
      button.textContent = "複製失敗";
    }
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 1400);
  }

  function copyUrlFromInput(button) {
    const input = button.closest(".url-input-row")?.querySelector("input[name='url']");
    copyUrl(input?.value.trim() || "", button);
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function deleteSelectedItem(id) {
    const item = state.items.find((current) => current.id === id);
    if (!item) return;
    const ok = window.confirm("確定要刪除這個項目嗎？");
    if (!ok) return;

    state.items = state.items.filter((current) => current.id !== item.id);
    state.selectedId = "";
    state.editing = false;
    state.draftType = "";
    if (state.firebase) {
      const { firestore, collectionRef } = state.firebase;
      try {
        await firestore.deleteDoc(firestore.doc(collectionRef, item.id));
      } catch (error) {
        state.firebase = null;
        setSyncStatus(`Firestore 刪除失敗：${getFirebaseErrorText(error)}`);
      }
    }
    saveLocalItems();
    render();
  }

  function startNewDraft() {
    state.draftType = state.section || "task";
    state.selectedId = DRAFT_ID;
    state.editing = true;
    render();
    const form = elements.itemList.querySelector(`form[data-id="${cssEscape(DRAFT_ID)}"]`);
    form?.querySelector("input[name='title']")?.focus();
  }

  async function persistItem(item) {
    saveLocalItems();
    if (state.firebase) {
      try {
        await writeRemote(item);
      } catch (error) {
        state.firebase = null;
        setSyncStatus(`Firestore 寫入失敗：${getFirebaseErrorText(error)}`);
      }
    }
  }

  async function writeRemote(item) {
    const { firestore, collectionRef } = state.firebase;
    const payload = { ...item, updatedAt: new Date().toISOString() };
    await firestore.setDoc(firestore.doc(collectionRef, item.id), payload, { merge: true });
  }

  function getVisibleItems() {
    return state.items
      .filter((item) => item.type === state.section)
      .filter((item) => {
        if (!state.search) return true;
        return [item.title, item.content, item.composer, item.arranger, item.url, item.tags.join(" ")].join(" ").toLowerCase().includes(state.search);
      })
      .filter(matchesScoreFilters)
      .sort((a, b) => {
        if (state.section === "info") return compareScoreTitles(a, b);
        if (a.status !== b.status) return a.status === "completed" ? 1 : -1;
        return dateValue(a.dueDate) - dateValue(b.dueDate);
      });
  }

  function matchesScoreFilters(item) {
    if (state.section !== "info") return true;
    const difficulty = getScoreDifficulty(item);
    return Object.entries(state.scoreFilters).every(([key, value]) => {
      if (!value) return true;
      return difficulty[key] <= Number(value);
    });
  }

  function compareScoreTitles(a, b) {
    const bucketDiff = getTitleBucket(a.title) - getTitleBucket(b.title);
    if (bucketDiff) return bucketDiff;
    const titleDiff = TITLE_COLLATOR.compare(getSortableTitle(a.title), getSortableTitle(b.title));
    if (titleDiff) return titleDiff;
    return dateValue(a.updatedAt) - dateValue(b.updatedAt);
  }

  function getSortableTitle(title) {
    return String(title || "").trim();
  }

  function getTitleInitial(title) {
    const sortableTitle = getSortableTitle(title);
    if (!sortableTitle) return "#";
    const first = [...sortableTitle][0];
    if (/^[A-Za-z]$/.test(first)) return first.toLocaleUpperCase();
    if (/^\d$/.test(first)) return "#";
    return first;
  }

  function getTitleBucket(title) {
    const initial = getTitleInitial(title);
    if (/^[A-Z]$/.test(initial)) return 0;
    if (initial === "#") return 1;
    if (/[\u3040-\u30ff]/.test(initial)) return 2;
    if (/[\u4e00-\u9fff]/.test(initial)) return 3;
    return 4;
  }

  function getSelectedItem() {
    return state.items.find((item) => item.id === state.selectedId);
  }

  function getDueProgress(item) {
    if (!item.dueDate || item.status === "completed") return 0;
    const start = dateValue(item.startedAt || item.updatedAt || new Date().toISOString());
    const end = dateValue(item.dueDate);
    const now = Date.now();
    if (end <= start) return now >= end ? 1 : 0;
    return Math.max(0, Math.min(1, (now - start) / (end - start)));
  }

  function getSectionName(section) {
    return section === "task" ? "To do" : "List";
  }

  function loadLocalItems() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.map(normalizeItem);
      } catch (error) {
        return [];
      }
    }
    return [];
  }

  function hasStoredLocalItems() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch (error) {
      return false;
    }
  }

  function saveLocalItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }

  function normalizeItem(item) {
    const type = item.type || item.category || "task";
    return {
      id: String(item.id || `item-${Date.now()}`),
      type,
      title: item.title || "未命名",
      status: type === "info" ? "stored" : item.status || "pending",
      dueDate: type === "info" ? "" : item.dueDate || item.due_date || "",
      startedAt: item.startedAt || item.createdAt || item.updatedAt || item.updated_at || new Date().toISOString(),
      composer: item.composer || "",
      arranger: item.arranger || "",
      url: item.url || "",
      difficulty: normalizeDifficulty(item.difficulty),
      tags: Array.isArray(item.tags) ? sortTagsByLanguage(item.tags) : [],
      content: item.content || "",
      updatedAt: item.updatedAt || item.updated_at || new Date().toISOString()
    };
  }

  function addHours(date, hours) {
    const next = new Date(date);
    next.setHours(next.getHours() + hours);
    return next;
  }

  function normalizeDifficulty(difficulty) {
    return {
      woodwind: toDifficulty(difficulty?.woodwind),
      brass: toDifficulty(difficulty?.brass),
      percussion: toDifficulty(difficulty?.percussion)
    };
  }

  function getScoreDifficulty(item) {
    return normalizeDifficulty(item.difficulty);
  }

  function toDifficulty(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 1;
    return Math.max(1, Math.min(5, Math.round(number)));
  }

  function renderStars(value) {
    const level = toDifficulty(value);
    return "★".repeat(level) + "☆".repeat(5 - level);
  }

  function resetScoreFilters() {
    state.scoreFilters = {
      woodwind: "",
      brass: "",
      percussion: ""
    };
    elements.scoreFilters.querySelectorAll("select").forEach((select) => {
      select.value = "";
    });
  }

  function clearScoreFilters() {
    resetScoreFilters();
    renderList();
  }

  function setScoreFiltersOpen(open) {
    state.filtersOpen = Boolean(open) && state.section === "info";
    renderList();
  }

  function hasActiveScoreFilters() {
    return Object.values(state.scoreFilters).some(Boolean);
  }

  function updateFilterControls() {
    const isInfo = state.section === "info";
    const active = hasActiveScoreFilters();
    if (!isInfo) state.filtersOpen = false;

    elements.filterControls.classList.toggle("filters-visible", isInfo);
    elements.filterToggle.classList.toggle("hidden", !isInfo);
    elements.filterToggle.classList.toggle("active", active);
    elements.filterToggle.textContent = active ? "篩選中" : "篩選";
    elements.filterToggle.setAttribute("aria-expanded", String(isInfo && state.filtersOpen));
    elements.scoreFilters.classList.toggle("hidden", !isInfo || !state.filtersOpen);
  }

  function sortTagsByLanguage(tags) {
    const uniqueTags = [...new Set((tags || []).map((tag) => String(tag).trim()).filter(Boolean))];
    return uniqueTags.sort((a, b) => {
      const languageDiff = getTagLanguageOrder(a) - getTagLanguageOrder(b);
      if (languageDiff) return languageDiff;
      return compareByFirstCharacter(a, b);
    });
  }

  function getTagLanguageOrder(tag) {
    if (/[\u4e00-\u9fff]/.test(tag)) return 0;
    if (/^[A-Za-z]/.test(tag)) return 1;
    if (/[\u3040-\u30ff]/.test(tag)) return 2;
    return 3;
  }

  function compareByFirstCharacter(a, b) {
    const normalizedA = a.toLocaleLowerCase();
    const normalizedB = b.toLocaleLowerCase();
    const firstDiff = normalizedA.codePointAt(0) - normalizedB.codePointAt(0);
    if (firstDiff) return firstDiff;
    return normalizedA.localeCompare(normalizedB, "en", { sensitivity: "base", numeric: true });
  }

  function dateValue(dateLike) {
    return dateLike ? new Date(dateLike).getTime() : Number.MAX_SAFE_INTEGER;
  }

  function formatDate(dateLike) {
    return new Intl.DateTimeFormat("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(dateLike));
  }

  function toDateTimeInput(dateLike) {
    if (!dateLike) return "";
    const date = new Date(dateLike);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function setSyncStatus(message) {
    elements.syncStatus.textContent = message;
    elements.syncStatus.title = message;
  }

  function getFirebaseErrorText(error) {
    const code = error?.code ? String(error.code) : "";
    const message = error?.message ? String(error.message) : "未知錯誤";
    if (code === "permission-denied") return "權限不足，請檢查 Firestore Rules";
    if (code === "unavailable") return "服務暫時無法連線";
    return code ? `${code}，${message}` : message;
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
  }
})();
