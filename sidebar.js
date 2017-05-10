/**
 * Escapes any occurances of &, ", <, > or / with XML entities.
 *
 * @param {string} str
 *        The string to escape.
 * @return {string} The escaped string.
 */
function escapeXML(str) {
  const replacements = {"&": "&amp;", "\"": "&quot;", "'": "&apos;", "<": "&lt;", ">": "&gt;", "/": "&#x2F;"};
  return String(str).replace(/[&"'<>/]/g, m => replacements[m]);
}

/**
 * A tagged template function which escapes any XML metacharacters in
 * interpolated values.
 *
 * @param {Array<string>} strings
 *        An array of literal strings extracted from the templates.
 * @param {Array} values
 *        An array of interpolated values extracted from the template.
 * @returns {string}
 *        The result of the escaped values interpolated with the literal
 *        strings.
 */
function escaped(strings, ...values) {
  const result = [];

  for (const [i, string] of strings.entries()) {
    result.push(string);
    if (i < values.length)
      result.push(escapeXML(values[i]));
  }

  return result.join("");
}

function debug() {
  if (false) {
    console.log(...arguments);
  }
}

const tabManager = {
  currentContainer: [],
  currentTabs: [],
  pinnedTabs: [],
  sidebar: null,
  draggedOver: null,
  draggingTab: null,

  init() {
    this.sidebar = document.getElementById("sidebarContainer");
    this.getContainers();
    this.loadTabs();
    this.addListeners();
  },

  addListeners() {
    browser.tabs.onActivated.addListener((activeInfo) => {

      browser.tabs.get(activeInfo.tabId).then((tab) => {
        const currentSectionElement = this.sidebar.querySelector(`section[data-cookie-store-id="${tab.cookieStoreId}"`);
        this.containerOpen(currentSectionElement);
        this.loadTabs().then((activeTab) => {
          activeTab.scrollIntoView({block: "end", behavior: "smooth"});
        });
      });
    })

    browser.tabs.onRemoved.addListener((removed) => {
      const tabElement = this.getTabById(removed);
      if (tabElement) {
        tabElement.classList.add("active");
      }
      const sectionElement = tabElement.closest("section");
      this.containerOpen(sectionElement);
    });
    browser.tabs.onActivated.addListener((activated) => {
      [...this.sidebar.querySelectorAll(".tab-item.active")].forEach((tab) => {
        tab.classList.remove("active");
      });
      
      const tabElement = this.getTabById(activated);
      if (tabElement) {
        tabElement.remove();
      }
    });
/* not sure if I need these yet
    browser.tabs.onActivated.addListener(refreshTabs);
    browser.tabs.onAttached.addListener(refreshTabs);
    browser.tabs.onCreated.addListener(refreshTabs);
    browser.tabs.onDetached.addListener(refreshTabs);
    browser.tabs.onReplaced.addListener(refreshTabs);
    browser.tabs.onUpdated.addListener(refreshTabs);
*/
    // We could potentially stale check here but it might get out of date
    // tracking the tabs state in memory might be more performant though
    const refreshTabs = (tab) => {
      this.loadTabs();
    }
    browser.tabs.onMoved.addListener(refreshTabs);
    // Once I handle everything this can be removed
    // This overfires right now but clears up stale tabs
    browser.tabs.onUpdated.addListener((tabId, update, tab) => {
console.log("refresh happened", tabId, update, tab);
  //    refreshTabs();
      const tabElement = this.getTabById(tabId);
      if (tabElement && update.title) {
        tabElement.querySelector('.tab-title').innerText = update.title;
      }
    });
  },

  getTabById(id) {
    return this.sidebar.querySelector(`.tab-item[data-tab-id="${id}"]`);
  },

  loadTabs() {
    return browser.tabs.query({
      windowId: browser.windows.WINDOW_ID_CURRENT
    }).then((tabs) => {
      debug('tab', tabs);
      this.pinnedTabs = [];
      this.currentTabs = tabs.filter((tab) => {
        if (tab.pinned) {
          this.pinnedTabs.push(tab);
          return false;
        }
        return true;
      });
      return this.renderTabs();
    });
  },
  
  getContainers() {
    browser.contextualIdentities.query({
    }).then((containers) => {
      debug('got containers', containers);
      this.currentContainers = containers; 
      this.currentContainers.unshift({
        cookieStoreId: 'firefox-default',
        name: "Default"
      });
      this.render();
    });
  },

  render() {
    debug('rendering', this.currentContainers, this.currentTabs);
    this.sidebar = document.getElementById("sidebarContainer");
    const fragment = document.createDocumentFragment();
  
    this.currentContainers.forEach((container) => {
      const containerElement = document.createElement("section");
      containerElement.className = "closed";
      containerElement.innerHTML = escaped`<div class="container">
        <div class="usercontext-icon"></div>
        <div class="container-name">
          ${container.name}
        </div>
        <span class="tab-count"></span>
        <div class="pinned-tabs"></div>
        <button class="new-tab"></button>
      </div>`;
      containerElement.setAttribute("data-identity-icon", container.icon);
      containerElement.setAttribute("data-identity-color", container.color);
      containerElement.setAttribute("data-cookie-store-id", container.cookieStoreId);
      containerElement.addEventListener("click", this);
      const tabContainerElement = document.createElement("div");
      tabContainerElement.className = "tab-container";
      containerElement.appendChild(tabContainerElement);

      fragment.appendChild(containerElement);
    });
    this.sidebar.innerHTML = "";
    this.sidebar.appendChild(fragment);
  
    this.renderTabs();
  },

  containerOpen(sectionElement, toggle) {
    let isOpen = false;
    if (!sectionElement.classList.contains("closed")) {
      isOpen = true;
    }
    [...this.sidebar.querySelectorAll("section")].forEach((section) => {
      section.classList.add("closed");
    });

    if (!toggle || !isOpen) {
      sectionElement.classList.remove("closed");
      if (toggle) {
        // Lets open the first tab on user click
        // This was annoying
        //this.tabActivate(sectionElement.querySelector('.tab-item'));
      }
    }
  },

  tabActivate(tabElement) {
    if (!tabElement) {
      return;
    }
    const tabId = tabElement.getAttribute("data-tab-id");
    if (tabId) {
      browser.tabs.update(Number(tabId), {
        active: true
      });
    }
  },

  tabClose(tabElement) {
    const tabId = tabElement.getAttribute("data-tab-id");
    if (tabId) {
      browser.tabs.remove(Number(tabId));
    }
  },

  handleEvent(e) {
    debug("event", e);
    switch (e.type) {
      case "click":
        const sectionElement = e.target.closest("section");
        const tabElement = e.target.closest(".tab-item");
        if (tabElement) {
          if (e.target.tagName === "BUTTON") {
            this.tabClose(tabElement);
          } else {
            this.tabActivate(tabElement);
          }
        } else if (sectionElement) {
          if (e.target.tagName === "BUTTON") {
            browser.tabs.create({
              cookieStoreId: sectionElement.getAttribute("data-cookie-store-id")
            });
          }
          this.containerOpen(sectionElement, true);
        }
        break;
      case "dragstart":
        this.draggingTab = e.target;
        this.draggingTab.classList.add("dragging");
        e.dataTransfer.setData("text/plain", e.target.id);
        break;
      case "dragover":
        if (this.draggedOver === e.target) {
          return;
        }
        if (this.draggedOver) {
          this.draggedOver.classList.remove("over");
        }

        const thisDraggingOverTabElement = e.target.closest(".tab-item");
        thisDraggingOverTabElement.classList.add("over");
        this.draggedOver = thisDraggingOverTabElement; //e.target;
        break;
      case "dragend":
        this.draggingTab.classList.remove("dragging");
        const tabId = Number(this.draggingTab.getAttribute("data-tab-id"));
        if (tabId && this.draggedOver) {
          const draggingOverTabId = Number(this.draggedOver.getAttribute("data-tab-id"));
          browser.tabs.get(draggingOverTabId).then((draggingOverTab) => {
            browser.tabs.move(tabId, {
              index: draggingOverTab.index + 1
            });
          });
        }
        this.draggingTab = null;
        this.draggedOver = null;
        break;
    }
  },

  renderTabs() {
    const containerTabs = {};
    const pinnedTabs = {};
    let activeTab;

    const makeTab = (storage, tab, pinned) => {
      const cookieStoreId = tab.cookieStoreId;
      if (!(cookieStoreId in storage)) {
        storage[cookieStoreId] = document.createDocumentFragment();
      }
      const tabElement = document.createElement("div");
      tabElement.className = "tab-item";
      tabElement.setAttribute("draggable", true);
      tabElement.setAttribute("data-tab-id", tab.id);
      tabElement.addEventListener("dragstart", this);
      tabElement.addEventListener("dragover", this);
      tabElement.addEventListener("dragend", this);
      debug("Found tab", tab);
      if (tab.active) {
        tabElement.classList.add("active");
        activeTab = tabElement;
      }
      let favIconUrl = "moz-icon://goat?size=16";
      if (tab.favIconUrl) {
        favIconUrl = tab.favIconUrl;
      }
      if (pinned) {
        tabElement.innerHTML = escaped`<img src="${favIconUrl}" />`;
      } else {
        tabElement.innerHTML = escaped`
          <img src="${favIconUrl}" />
          <div class="tab-title">${tab.title}</div>
          <button class="close-tab"></button>`;
      }
      storage[cookieStoreId].appendChild(tabElement);
    };
  
    this.currentTabs.forEach((tab) => {
      makeTab(containerTabs, tab);
    });
    this.pinnedTabs.forEach((tab) => {
      makeTab(pinnedTabs, tab, true);
    });
  
    [...document.querySelectorAll('section')].forEach((section) => {
      const tabCount = section.querySelector(".tab-count");
      const tabContainer = section.querySelector(".tab-container");
      const cookieStoreId = section.getAttribute("data-cookie-store-id");
      debug("found section", tabContainer, cookieStoreId, section, containerTabs[cookieStoreId]);
      if (cookieStoreId in containerTabs) {
        tabCount.innerText = `(${containerTabs[cookieStoreId].childNodes.length})`;
        tabContainer.innerHTML = "";
        tabContainer.appendChild(containerTabs[cookieStoreId]);
      }

      if (cookieStoreId in pinnedTabs) {
        const pinnedSection = section.querySelector(".pinned-tabs");
        pinnedSection.innerHTML = "";
        pinnedSection.appendChild(pinnedTabs[cookieStoreId]);
      }
    });

    return activeTab;
  }
};

tabManager.init();
