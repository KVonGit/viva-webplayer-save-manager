window.isVivaPlayer = true;
window.qvsmVersion = "1.0.8 beta";

if (window.location.href.startsWith("res")) {
  // This is the Windows app.
  window.isVivaPlayer = false;
  setTimeout(() => {
    $("#divOutput").html(
      "<center><h1>This only works in the Viva WebPlayer app.</h1></center>"
    );
  }, 500);
  throw new Error(
    "Viva Save Manager script is not compatible with the Windows app. Exiting. Not an actual error."
  );
}
console.log("Not the desktop app, continuing...");

if (window.location.href.includes("Play.aspx")) {
  // This is the v5 WebPlayer app.
  window.isVivaPlayer = false;
  setTimeout(() => {
    $("#divOutput").html(
      "<center><h1>This only works in the Viva WebPlayer app.</h1></center>"
    );
  }, 500);
  throw new Error(
    "Viva Save Manager script is not compatible with the v5 WebPlayer app. Exiting. Not an actual error."
  );
}
console.log("Not the v5 WebPlayer, continuing...");

(function () {
  const currentScript = document.currentScript;

  if (!currentScript.src.includes("?c=")) {
    const bustedUrl = currentScript.src + "?c=" + Date.now();

    const script = document.createElement("script");
    script.src = bustedUrl;

    script.onload = () => {
      console.log("Loaded fresh file:", bustedUrl);
    };

    document.head.appendChild(script);

    throw new Error("Reloading file with cache buster: " + bustedUrl);
  }
})();

console.log("Cache buster applied, continuing with version " + qvsmVersion + "...");

function replaceDivOutput() {
  const newDivOutput = `<div class="container save-manager">
  <div class="row mb-4">
    <div class="col">
      <div class="card">
        <div class="d-flex justify-content-between align-items-center">
          <!-- Separate non-collapsible container for the button -->
          <button onclick="displaySavesList()" class="btn btn-sm btn-outline-secondary me-2">🔄</button>
          
          <!-- Collapsible header without the button -->
          <div class="card-header flex-grow-1 d-flex justify-content-between align-items-center" 
               data-bs-toggle="collapse" 
               data-bs-target="#savesList-container" 
               aria-expanded="true">
            <h2 class="h4 mb-0">Available Saves</h2>
            <span class="collapse-indicator">▼</span>
          </div>
        </div>
        <div class="collapse show" id="savesList-container">
          <div class="card-body">
            <div id="savesList" class="list-group">Loading saves...</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="row mb-4">
    <div class="col">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center"
             data-bs-toggle="collapse" 
             data-bs-target="#upload-container" 
             aria-expanded="false">
          <h2 class="h4 mb-0">Upload Save Game</h2>
          <span class="collapse-indicator">▼</span>
        </div>
        <div class="collapse" id="upload-container">
          <div class="card-body">
            <div class="input-group mb-2">
              <input
                type="file"
                class="form-control"
                id="saveFileInput"
                accept=".xml,.aslx,.quest-viva-save,.quest-save,.quest-v5webplayer-save"
              />
            </div>
            <div class="input-group">
              <input
                type="text"
                class="form-control"
                id="saveNameInput"
                placeholder="Save name (optional)"
              />
              <button class="btn btn-primary" onclick="handleFileUpload()">
                Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="row mb-4">
    <div class="col">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center"
             data-bs-toggle="collapse" 
             data-bs-target="#v5-import-container" 
             aria-expanded="false">
          <h2 class="h4 mb-0">Import from v5 WebPlayer</h2>
          <span class="collapse-indicator">▼</span>
        </div>
        <div class="collapse" id="v5-import-container">
          <div class="card-body">
          <p>Enter a game ID or URL from textadventures.co.uk:</p>
          <div class="input-group mb-3">
            <input
              type="text"
              class="form-control"
              id="v5GameIdInput"
              placeholder="Game ID or URL (e.g. textadventures.co.uk/games/view/id)"
            />
            <button class="btn btn-primary" onclick="importFromV5Player()">
              Import
            </button>
          </div>
          <small class="text-muted">
            <a href="https://textadventures.co.uk/" target="_blank">
              Browse games on textadventures.co.uk
            </a>
            then copy and paste the URL here.
          </small>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="row">
    <div class="col">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center"
             data-bs-toggle="collapse" 
             data-bs-target="#attribute-container" 
             aria-expanded="false">
          <h2 class="h4 mb-0">Attribute Viewer</h2>
          <span class="collapse-indicator">▼</span>
        </div>
        <div class="collapse" id="attribute-container">
          <div class="card-body">
            <div class="row g-2">
              <div class="col-12">
                <div class="d-flex align-items-center">
                  <select class="form-select" id="gameIdSelect">
                    <option value="">-- Select Game --</option>
                  </select>
                  <span id="selectedGameName" class="ms-2 text-muted"></span>
                </div>
              </div>
              <div class="col-12">
                <select class="form-select" id="slotSelect">
                  <option value="">-- Select Slot --</option>
                </select>
              </div>
            </div>
            <div class="input-group mb-3">
              <input
                type="text"
                class="form-control"
                id="objectPath"
                placeholder="Object path (e.g. player)"
              /><input
                type="text"
                class="form-control"
                id="attrName"
                placeholder="Attribute name"
              /><button class="btn btn-primary" onclick="getAttributeValue()">
                Get Value
              </button>
            </div>
            <div
              id="attrValue"
              class="alert alert-info"
              style="display: none"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div
    id="messageDialog"
    class="alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3"
    style="display: none; z-index: 1050"
    role="alert"
  >
    <span id="messageText"></span>
  </div>
</div>`;
  const divOutput = document.getElementById("divOutput");
  divOutput.innerHTML = newDivOutput;

  // Add responsive styles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Base styles */
    .save-manager .btn-group {
      flex-wrap: wrap;
    }
    
    /* Mobile styles */
    @media (max-width: 576px) {
      .save-manager .btn-group .btn {
        font-size: 0.7rem;
        padding: 0.2rem 0.4rem;
      }
      
      .save-manager .list-group-item {
        padding: 0.5rem;
      }
      
      .save-manager .d-flex {
        flex-direction: column;
        align-items: flex-start !important;
      }
      
      .save-manager .d-flex .btn-group {
        margin-top: 0.5rem;
        width: 100%;
      }
      
      .save-manager h3.h5 {
        font-size: 1rem;
      }
      
      .save-manager .input-group {
        flex-direction: column;
      }
      
      .save-manager .input-group > * {
        width: 100%;
        margin-right: 0;
        border-radius: 0.25rem !important;
        margin-bottom: 0.5rem;
      }
    }
    
    /* Tablet styles */
    @media (min-width: 577px) and (max-width: 991px) {
      .save-manager .btn-group .btn {
        font-size: 0.8rem;
        padding: 0.25rem 0.5rem;
      }
    }
    
    /* Section collapsible styling */
    .save-manager .card-header {
      cursor: pointer;
    }
    
    .save-manager .collapse-indicator {
      transition: transform 0.3s;
    }
    
    /* Fix for arrow rotation - target based on collapse state */
    .save-manager [aria-expanded="false"] .collapse-indicator {
      transform: rotate(-90deg);
    }
    
    .save-manager .game-header {
      cursor: pointer;
    }
  `;
  document.head.appendChild(styleElement);
}

async function displaySavesList() {
  try {
    const saves = await allVivaSaves();
    const gameGroups = {};

    for (const save of saves) {
      const gameId = save.key[0];
      if (!gameGroups[gameId]) {
        const xmlString = decodeSaveData(save.value.data);
        const saveData = parseVivaSaveXML(xmlString);
        const gameInfo = saveData.getGameInfo();

        gameGroups[gameId] = {
          name: gameInfo?.name || "Unknown Game",
          saves: [],
        };
      }
      gameGroups[gameId].saves.push({
        slot: save.key[1],
        name: save.value.name,
        timestamp: new Date(save.value.timestamp).toLocaleString(),
      });
    }

    let html = "";
    for (const [gameId, game] of Object.entries(gameGroups)) {
      const gameGroupId = `game-${gameId.replace(/[^a-zA-Z0-9]/g, '')}`;
      
      html += `<div class="game-group mb-4">
  <div class="d-flex align-items-center mb-2">
    <div class="game-header me-auto" 
         data-bs-toggle="collapse" 
         data-bs-target="#${gameGroupId}" 
         aria-expanded="true"
         style="cursor: pointer;">
      <div class="d-flex align-items-center">
        <span class="collapse-indicator me-2">▼</span>
        <h3 class="h5 mb-0 me-2">${game.name}</h3>
      </div>
      <small class="text-muted d-block">ID: ${gameId}</small>
    </div>
    
    <!-- Buttons moved outside the collapsible trigger area -->
    <div class="game-actions">
      <a href="https://play.textadventures.co.uk/textadventures/${gameId}" 
         class="text-decoration-none me-2" 
         target="_blank" 
         title="Play ${game.name}">▶️</a>
      <a href="javascript:void(0)"
         class="text-decoration-none me-2"
         onclick="event.preventDefault(); event.stopPropagation(); normalizeSlots('${gameId}')"
         title="Fix slot numbering">🔢</a>
      <a href="javascript:void(0)" 
         class="text-decoration-none" 
         onclick="event.preventDefault(); event.stopPropagation(); deleteAllSavesForGame('${gameId}')"
         title="Delete all saves for this game">❌</a>
    </div>
  </div>
  <div class="collapse show" id="${gameGroupId}">
    <ul class="list-group">`;

      game.saves.sort((a, b) => a.slot - b.slot);
      game.saves.forEach((save) => {
        const escapedGameId = gameId.replace(/'/g, "\\'");
        html += `<li class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Slot ${save.slot}:</strong> ${save.name}
                            <br><small class="text-muted">${save.timestamp
          }</small>
                        </div>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="downloadVivaSave('${escapedGameId}', ${save.slot
          })">Download</button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="copyVivaSave('${escapedGameId}', ${save.slot
          }).then(() => showMessage('Save copied successfully'))">Copy</button>
                            <button class="btn btn-sm btn-outline-info" onclick="renameSaveSlot('${escapedGameId}', ${save.slot
          }, '${save.name.replace(/'/g, "\\'")}')">Rename</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteVivaSave('${escapedGameId}', ${save.slot
          })">Delete</button>
                        </div>
                    </div>
                </li>`;
      });

      html += `</ul></div></div>`;
    }

    document.getElementById("savesList").innerHTML = html || "No saves found";
  } catch (error) {
    console.error("Error displaying saves:", error);
    document.getElementById("savesList").innerHTML = "Error loading saves";
  }
}

async function allVivaSaves() {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open("quest-viva-saves");

    request.onerror = () => reject("Failed to open IndexedDB");

    request.onsuccess = function (event) {
      let db = event.target.result;
      let transaction = db.transaction(["saves"], "readonly");
      let store = transaction.objectStore("saves");

      let results = [];
      let cursorRequest = store.openCursor();

      cursorRequest.onsuccess = function (event) {
        let cursor = event.target.result;
        if (cursor) {
          results.push({
            key: cursor.key,
            value: cursor.value,
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      cursorRequest.onerror = () => reject("Cursor error");
    };
  });
}

async function getVivaSave(id, slot = 0) {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open("quest-viva-saves");

    request.onerror = () => reject("Failed to open IndexedDB");

    request.onsuccess = function (event) {
      let db = event.target.result;
      let transaction = db.transaction(["saves"], "readonly");
      let store = transaction.objectStore("saves");

      let key = [id, slot];
      let getRequest = store.get(key);

      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject("Error retrieving save");
    };
  });
}

function decodeSaveData(uint8array) {
  let decoder = new TextDecoder("utf-8");
  let xmlString = decoder.decode(uint8array);
  return xmlString;
}

async function getSaveSlots(id) {
  const allSaves = await allVivaSaves();
  return allSaves
    .filter((save) => save.key[0] === id)
    .map((save) => save.key[1]);
}

async function getHighestSlot(id) {
  const slots = await getSaveSlots(id);
  const realSlots = slots.filter(slot => slot >= 0);
  return realSlots.length > 0 ? Math.max(...realSlots) : -1;
}

async function getAutosaveSlot(id) {
  const slots = await getSaveSlots(id);
  // If slot 0 exists, use -1 for autosave
  // Otherwise use 0 so a save will exist
  return slots.includes(0) ? -1 : 0;
}

async function copyVivaSaveToSlot(
  id,
  originalSlot = 0,
  newSlot,
  newName = null,
  overwrite = false
) {
  try {
    let save = await getVivaSave(id, originalSlot);
    if (!save) throw new Error("Original save not found");

    const clonedSave = {
      gameId: id,
      slotIndex: newSlot,
      data: save.data,
      name: newName || `Copy of ${save.name}`,
      timestamp: new Date(),
    };

    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("quest-viva-saves", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const tx = db.transaction("saves", "readwrite");
    const store = tx.objectStore("saves");

    await new Promise((resolve, reject) => {
      const request = store.put(clonedSave);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await displaySavesList();
    return clonedSave;
  } catch (error) {
    console.error("Error in copyVivaSaveToSlot:", error);
    throw error;
  }
}

async function saveVivaSave(id, slot = 0, newData, name = null) {
  try {
    const saveData = {
      gameId: id,
      slotIndex: slot,
      data: newData.data,
      name: name || "Saved game at " + new Date().toISOString().replace('T', ' ').substring(0, 19),
      timestamp: new Date(),
    };

    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("quest-viva-saves", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const tx = db.transaction("saves", "readwrite");
    const store = tx.objectStore("saves");

    await new Promise((resolve, reject) => {
      const request = store.put(saveData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // await displaySavesList();
    console.log("Save data saved successfully:", saveData);
    return saveData;
  } catch (error) {
    console.error("Error in saveVivaSave:", error);
    throw error;
  }
}

async function copyVivaSave(id, originalSlot = 0, newName = null) {
  const highestSlot = await getHighestSlot(id);
  const newSlot = highestSlot + 1;

  return copyVivaSaveToSlot(id, originalSlot, newSlot, newName);
}

// Clone to different game ID
// UNUSED FUNCTION
// No clue why we'd want to do this, but here it is anyway =)
async function cloneVivaSave(
  newId,
  originalid,
  originalSlot = 0,
  newSlot = 0,
  newName = null,
  overwrite = false
) {
  let save = await getVivaSave(originalId, originalSlot);
  if (!save) throw new Error("Original save not found");

  let clonedSave = {
    ...save,
    gameId: newId,
    slotIndex: newSlot,
    name: newName || `Cloned from ${originalId}`,
    timestamp: new Date(),
  };

  return saveToDB(clonedSave, newId, newSlot, overwrite);
}

function saveToDB(saveData, gameId, slotIndex, overwrite = false) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("quest-viva-saves");

    request.onerror = () => reject("Could not open DB");

    request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(["saves"], "readwrite");
      const store = transaction.objectStore("saves");

      if (!overwrite) {
        const checkRequest = store.get([gameId, slotIndex]);
        checkRequest.onsuccess = function () {
          if (checkRequest.result && !overwrite) {
            reject(
              "Save already exists at destination. Set overwrite=true to replace."
            );
            return;
          }
          putSave();
        };
        checkRequest.onerror = () =>
          reject("Failed to check for existing save");
      } else {
        putSave();
      }

      function putSave() {
        const cleanSaveData = {
          data: saveData.data,
          name: saveData.name,
          timestamp: saveData.timestamp,
        };

        const putRequest = store.put(cleanSaveData, [gameId, slotIndex]);
        putRequest.onsuccess = () => resolve(saveData);
        putRequest.onerror = (e) => {
          console.error("Put error:", e);
          reject("Failed to save game data");
        };
      }
    };
  });
}

async function downloadVivaSave(id, slot = 0, format = "quest-viva-save") {
  if (!["xml", "quest-viva-save", "aslx"].includes(format)) {
    throw new Error("Invalid format. Use 'xml', 'aslx', or 'quest-viva-save'.");
  }
  let save = await getVivaSave(id, slot);
  if (!save) throw new Error("Save not found");

  let blob;
  let xmlString = decodeSaveData(save.data);
  const leadIn = `<?xml version="1.0"?>\n<!-- viva-save-manager game-id="${id}" -->\n`;
  blob = new Blob([leadIn + xmlString], { type: "application/xml" });
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = `qv_save-${id}-${slot}.${Date.now()}.${format}`;
  a.click();

  URL.revokeObjectURL(url);
}

function parseVivaSaveXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  function findObjectByPath(path) {
    if (!path) return null;

    const parts = path.split(".");
    let currentElement = xmlDoc.documentElement; // <asl> root element

    if (parts[0] === "game" || parts[0] === "template") {
      const elements = currentElement.getElementsByTagName(parts[0]);
      if (elements.length === 0) return null;

      if (parts[0] === "template") {
        for (let elem of elements) {
          if (elem.getAttribute("name") === parts[1]) {
            return elem;
          }
        }
        return null;
      }

      if (parts[0] === "game") {
        if (parts.length === 1) return elements[0];
        if (parts.length === 2) {
          const propElements = elements[0].getElementsByTagName(parts[1]);
          return propElements.length > 0 ? propElements[0] : null;
        }
      }

      return null;
    }

    let found = false;

    for (let i = 0; i < currentElement.children.length; i++) {
      const child = currentElement.children[i];
      if (
        child.tagName === "object" &&
        child.getAttribute("name") === parts[0]
      ) {
        currentElement = child;
        found = true;
        break;
      }
    }

    if (!found) {
      const objects = currentElement.getElementsByTagName("object");
      for (let obj of objects) {
        if (obj.getAttribute("name") === parts[0]) {
          currentElement = obj;
          found = true;
          break;
        }
      }
    }

    if (!found) return null;

    if (parts.length === 2) {
      for (let i = 0; i < currentElement.children.length; i++) {
        const child = currentElement.children[i];
        if (
          child.tagName === "attr" &&
          child.getAttribute("name") === parts[1]
        ) {
          return child;
        }
      }
    }

    return currentElement;
  }

  return {
    getDocument: () => xmlDoc,

    getObject: (path) => findObjectByPath(path),

    objectExists: (path) => findObjectByPath(path) !== null,

    getGameInfo: function () {
      const gameElem = xmlDoc.getElementsByTagName("game")[0];
      if (!gameElem) return null;

      const result = {
        name: gameElem.getAttribute("name") || "",
      };

      ["version", "author"].forEach((prop) => {
        const elements = gameElem.getElementsByTagName(prop);
        if (elements.length > 0) {
          result[prop] = elements[0].textContent;
        }
      });

      return result;
    },

    getObjectAttribute: function (objectPath, attributeName) {
      if (attributeName === "parent") {
        const obj = findObjectByPath(objectPath);
        if (!obj) return null;

        const objects = xmlDoc.getElementsByTagName("object");
        for (let potentialParent of objects) {
          for (let child of potentialParent.children) {
            if (
              child.tagName === "object" &&
              child.getAttribute("name") === obj.getAttribute("name")
            ) {
              return potentialParent.getAttribute("name");
            }
          }
        }
        return null;
      }

      if (objectPath === "template") {
        const templates = xmlDoc.getElementsByTagName("template");
        for (let template of templates) {
          if (template.getAttribute("name") === attributeName) {
            return template.textContent;
          }
        }
        return null;
      }

      const obj = findObjectByPath(objectPath);
      if (!obj) return null;

      if (attributeName === "name") {
        return obj.getAttribute("name");
      }

      function parseValue(element) {
        const type = element.getAttribute("type");
        const content = element.textContent;
        if (!type && !content && element.tagName !== "attr") {
          return true;
        }
        switch (type) {
          case "boolean":
            return content
              ? content.toLowerCase() === "true"
              : element.hasAttribute("type");
          case "int":
            return parseInt(content || "0", 10);
          case "script":
          case "string":
            return content;
          case "simplestringlist":
          case "stringlist":
          case "objectlist":
            return Array.from(element.getElementsByTagName("value")).map(
              (v) => v.textContent
            );
          case "dictionary":
          case "stringdictionary":
          case "objectdictionary":
            const dict = {};
            Array.from(element.getElementsByTagName("item")).forEach((item) => {
              const key = item.getElementsByTagName("key")[0]?.textContent;
              const value = item.getElementsByTagName("value")[0]?.textContent;
              if (key) dict[key] = value;
            });
            return dict;
          case "object":
            return content || element.getAttribute("name") || null;
          default:
            return content;
        }
      }

      const directElement = Array.from(obj.children).find(
        (child) => child.tagName === attributeName
      );
      if (directElement) {
        return parseValue(directElement);
      }

      const attrElement = Array.from(obj.children).find(
        (child) =>
          child.tagName === "attr" &&
          child.getAttribute("name") === attributeName
      );
      if (attrElement) {
        return parseValue(attrElement);
      }

      return null;
    },

    getObjectAttributes: function (objectPath) {
      const obj = findObjectByPath(objectPath);
      if (!obj) return {};

      const result = {};

      for (let i = 0; i < obj.children.length; i++) {
        const child = obj.children[i];
        if (child.tagName === "attr") {
          const name = child.getAttribute("name");
          const type = child.getAttribute("type");
          const content = child.textContent;

          if (type === "boolean")
            result[name] = content.toLowerCase() === "true";
          else if (type === "number") result[name] = parseFloat(content);
          else result[name] = content;
        }
      }

      return result;
    },

    getChildObjects: function (objectPath) {
      const obj = findObjectByPath(objectPath);
      if (!obj) return [];

      const result = [];

      for (let i = 0; i < obj.children.length; i++) {
        const child = obj.children[i];
        if (child.tagName === "object") {
          result.push(child.getAttribute("name"));
        }
      }

      return result;
    },
  };
}

async function getAttributeValue() {
  const gameId = document.getElementById("gameIdSelect").value;
  const slot = document.getElementById("slotSelect").value;
  const objectPath = document.getElementById("objectPath").value;
  const attrName = document.getElementById("attrName").value;

  if (!gameId || !slot) {
    alert("Please select both a game and save slot");
    return;
  }

  try {
    const save = await getVivaSave(gameId, parseInt(slot));
    if (!save) {
      console.error("Save not found");
      return;
    }

    const xmlString = decodeSaveData(save.data);
    const saveData = parseVivaSaveXML(xmlString);

    const value = saveData.getObjectAttribute(objectPath, attrName);
    const display = document.getElementById("attrValue");
    display.textContent = `${objectPath}.${attrName}: ${value}`;
    display.style.display = "block";
  } catch (error) {
    console.error("Error getting attribute value:", error);
  }
}

window.pendingImportData = null;

async function handleFileUpload() {
  const fileInput = document.getElementById("saveFileInput");
  const nameInput = document.getElementById("saveNameInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file first");
    return;
  }

  try {
    const xmlString = await readFileAsText(file);
    const customName = nameInput.value.trim();
    await importSaveFromXML(xmlString, customName);
    showMessage("Save imported successfully");

    fileInput.value = "";
    nameInput.value = "";
  } catch (error) {
    console.error("Error importing save:", error);
    showMessage("Error importing save: " + error.message);
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

async function importSaveFromXML(xmlString, customName = null) {
  const gameIdMatch = xmlString.match(
    /<!--\s*viva-save-manager\s+game-id="([^"]+)"\s*-->/
  );
  if (!gameIdMatch) {
    throw new Error("Invalid save file: No game ID found");
  }

  const gameId = gameIdMatch[1];
  xmlString = xmlString.replace(
    /<!--\s*viva-save-manager\s+game-id="[^"]+"\s*-->\n?/,
    ""
  );

  const nextSlot = (await getHighestSlot(gameId)) + 1;

  const saveData = {
    data: new TextEncoder().encode(xmlString),
    gameId: gameId,
    slotIndex: nextSlot,
    name: customName || `Imported save ${new Date().toLocaleString()}`,
    timestamp: new Date(),
  };

  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("quest-viva-saves", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  const tx = db.transaction("saves", "readwrite");
  const store = tx.objectStore("saves");

  await new Promise((resolve, reject) => {
    const request = store.put(saveData);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  await displaySavesList();
}

async function populateGameSelect() {
  try {
    const saves = await allVivaSaves();
    const gameIds = [...new Set(saves.map((save) => save.key[0]))];
    const select = document.getElementById("gameIdSelect");

    while (select.options.length > 1) {
      select.remove(1);
    }

    gameIds.forEach((id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      select.appendChild(option);
    });

    select.onchange = updateSlotSelect;
  } catch (error) {
    console.error("Error populating game select:", error);
  }
}

async function updateSlotSelect() {
  const gameId = document.getElementById("gameIdSelect").value;
  const select = document.getElementById("slotSelect");

  while (select.options.length > 1) {
    select.remove(1);
  }

  if (!gameId) return;

  try {
    const saves = await allVivaSaves();
    const gameSaves = saves.filter((save) => save.key[0] === gameId);

    if (gameSaves.length > 0) {
      const xmlString = decodeSaveData(gameSaves[0].value.data);
      const saveData = parseVivaSaveXML(xmlString);
      const gameInfo = saveData.getGameInfo();

      const gameIdSelect = document.getElementById("gameIdSelect");
      const gameNameSpan =
        document.getElementById("selectedGameName") ||
        (() => {
          const span = document.createElement("span");
          span.id = "selectedGameName";
          span.className = "ms-2 text-muted";
          gameIdSelect.parentNode.appendChild(span);
          return span;
        })();
      gameNameSpan.textContent = `(${gameInfo.name})`;
    }

    const slots = gameSaves.map((save) => ({
      slot: save.key[1],
      name: save.value.name,
    }));

    slots.sort((a, b) => a.slot - b.slot);

    slots.forEach(({ slot, name }) => {
      const option = document.createElement("option");
      option.value = slot;
      option.textContent = `Slot ${slot}: ${name}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error updating slot select:", error);
  }
}

function showMessage(message, autoCloseMs = 2000) {
  const messageDialog = $("#messageDialog");
  $("#messageText").text(message);

  messageDialog.removeClass("fade").show().addClass("show");

  setTimeout(() => {
    messageDialog.removeClass("show").addClass("fade").hide();
  }, autoCloseMs);
}

async function deleteAllSavesForGame(id) {
  const modalHtml = $(`
    <div class="modal fade" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirm Delete All</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-danger">Are you sure you want to delete ALL save slots for this game?</p>
            <p>This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="confirmDelete">Delete All</button>
          </div>
        </div>
      </div>
    </div>
  `).appendTo("body");

  try {
    const confirmModal = new bootstrap.Modal(modalHtml[0]);
    
    const confirmed = await new Promise(resolve => {
      modalHtml
        .on('hidden.bs.modal', () => resolve(false))
        .find('#confirmDelete').on('click', () => {
          confirmModal.hide();
          resolve(true);
        });
      
      confirmModal.show();
    });

    if (!confirmed) return;

    // Get all saves to be deleted first
    const allSaves = await allVivaSaves();
    const gameSaves = allSaves.filter(save => save.key[0] === id);
    
    if (gameSaves.length === 0) {
      showMessage("No saves found for this game");
      return;
    }

    // Open a single transaction for all operations
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("quest-viva-saves", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    // Delete each save one by one
    for (const save of gameSaves) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction("saves", "readwrite");
        const store = tx.objectStore("saves");
        const request = store.delete(save.key);
        
        request.onsuccess = () => resolve();
        request.onerror = (e) => {
          console.error("Error deleting save:", e);
          reject(e);
        };
      });
    }

    await displaySavesList();
    showMessage(`Deleted ${gameSaves.length} saves successfully`);
  } catch (error) {
    console.error("Error deleting all saves:", error);
    showMessage("Error deleting saves: " + error.message);
  } finally {
    modalHtml.remove();
  }
}

async function deleteVivaSave(id, slot = 0) {
  const modalHtml = $(`
        <div class="modal fade" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm Delete</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        Are you sure you want to delete save slot ${slot} for game ID ${id}?
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmDelete">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `).appendTo("body");

  try {
    const confirmModal = new bootstrap.Modal(modalHtml[0]);

    const confirmed = await new Promise((resolve) => {
      modalHtml
        .on("hidden.bs.modal", () => resolve(false))
        .find("#confirmDelete")
        .on("click", () => {
          confirmModal.hide();
          resolve(true);
        });

      confirmModal.show();
    });

    if (!confirmed) return;

    // Get all slots for this game before deleting
    const slots = await getSaveSlots(id);
    slots.sort((a, b) => a - b);
    
    // Delete the selected slot
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("quest-viva-saves", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    await new Promise((resolve, reject) => {
      const tx = db.transaction("saves", "readwrite");
      const store = tx.objectStore("saves");
      const request = store.delete([id, slot]);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Resequence higher slots to keep them sequential
    const higherSlots = slots.filter(s => s > slot);
    
    for (let i = 0; i < higherSlots.length; i++) {
      const currentSlot = higherSlots[i];
      const newSlot = currentSlot - 1;
      
      // Get save data from higher slot
      const save = await getVivaSave(id, currentSlot);
      if (!save) continue;
      
      // Create new save at the lower slot number
      const updatedSave = {
        data: save.data,
        name: save.name,
        timestamp: save.timestamp,
        gameId: id,
        slotIndex: newSlot
      };
      
      // Save to new slot
      await new Promise((resolve, reject) => {
        const tx = db.transaction("saves", "readwrite");
        const store = tx.objectStore("saves");
        const request = store.put(updatedSave);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Delete the original slot
      await new Promise((resolve, reject) => {
        const tx = db.transaction("saves", "readwrite");
        const store = tx.objectStore("saves");
        const request = store.delete([id, currentSlot]);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    await displaySavesList();
    showMessage(`Save deleted and ${higherSlots.length > 0 ? 'slots resequenced' : ''} successfully`);
  } catch (error) {
    console.error("Error in deleteVivaSave:", error);
    showMessage("Error deleting save");
  } finally {
    modalHtml.remove();
  }
}

async function renameSaveSlot(gameId, slot, currentName) {
  const modalHtml = $(`
        <div class="modal fade" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Rename Save</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="text" class="form-control" id="newSaveName" value="${currentName}">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmRename">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `).appendTo("body");

  try {
    const confirmModal = new bootstrap.Modal(modalHtml[0]);

    const newName = await new Promise((resolve) => {
      modalHtml
        .on("hidden.bs.modal", () => resolve(null))
        .find("#confirmRename")
        .on("click", () => {
          const name = modalHtml.find("#newSaveName").val().trim();
          confirmModal.hide();
          resolve(name);
        });

      confirmModal.show();
    });

    if (!newName) return;

    const save = await getVivaSave(gameId, slot);
    if (!save) throw new Error("Save not found");

    const updatedSave = {
      data: save.data,
      name: newName,
      timestamp: new Date(),
      gameId: gameId,
      slotIndex: slot,
    };

    // Use direct IndexedDB put without separate key
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("quest-viva-saves", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const tx = db.transaction("saves", "readwrite");
    const store = tx.objectStore("saves");

    await new Promise((resolve, reject) => {
      const request = store.put(updatedSave); // No separate key needed
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await displaySavesList();
    showMessage("Save renamed successfully");
  } catch (error) {
    console.error("Error renaming save:", error);
    showMessage("Error renaming save");
  } finally {
    modalHtml.remove();
  }
}

async function normalizeSlots(gameId, startIndex = 0) {
  try {
    // Get all saves for this game
    const allSaves = await allVivaSaves();
    const gameSaves = allSaves
      .filter(save => save.key[0] === gameId)
      .sort((a, b) => {
        // Sort by creation timestamp if available, otherwise by slot number
        if (a.value.timestamp && b.value.timestamp) {
          return new Date(a.value.timestamp) - new Date(b.value.timestamp);
        }
        return a.key[1] - b.key[1];
      });
    
    if (gameSaves.length === 0) {
      showMessage("No saves found for this game");
      return;
    }

    // Open a single database connection for all operations
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("quest-viva-saves", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    // For each save, if its slot doesn't match expected sequence, update it
    for (let i = 0; i < gameSaves.length; i++) {
      const save = gameSaves[i];
      const currentSlot = save.key[1];
      const newSlot = startIndex + i;
      
      // Only update if slot number needs to change
      if (currentSlot !== newSlot) {
        // Create updated save with new slot number
        const updatedSave = {
          gameId: save.key[0],
          slotIndex: newSlot,
          data: save.value.data,
          name: save.value.name,
          timestamp: save.value.timestamp
        };
        
        // Add the new entry first
        await new Promise((resolve, reject) => {
          const tx = db.transaction("saves", "readwrite");
          const store = tx.objectStore("saves");
          const request = store.put(updatedSave);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        
        // Delete the old entry
        await new Promise((resolve, reject) => {
          const tx = db.transaction("saves", "readwrite");
          const store = tx.objectStore("saves");
          const request = store.delete([gameId, currentSlot]);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    await displaySavesList();
    showMessage(`Normalized ${gameSaves.length} save slots successfully`);
  } catch (error) {
    console.error("Error normalizing slots:", error);
    showMessage("Error normalizing slots: " + error.message);
  }
}

function scrollToEnd() {
  // Do nothing
}

// Add this function to parse different URL formats
function extractGameIdFromUrl(input) {
  // If it's already a simple ID with no slashes or special characters, return it
  if (/^[a-zA-Z0-9_-]+$/.test(input)) {
    return input;
  }
  
  // Try to extract ID from various URL patterns
  const patterns = [
    /\/view\/([^/]+)/,
    /\/play\/([^/]+)/,
    /\/resume\/([^/]+)/,
    /\/textadventures\/([^/]+)/,
    /[?&]id=([^&]+)/
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null; // No match found
}

// Modified importFromV5Player function
async function importFromV5Player() {
  const userInput = document.getElementById("v5GameIdInput").value.trim();
  
  if (!userInput) {
    showMessage("Please enter a game ID or URL", 3000);
    return;
  }
  
  // Extract game ID from URL if necessary
  const gameId = extractGameIdFromUrl(userInput);
  
  if (!gameId) {
    showMessage("Could not determine game ID from input", 3000);
    return;
  }
  
  showMessage(`Fetching save data for game ${gameId}...`, 10000);
  
  try {
    // Fetch the v5 save data
    const response = await fetch(`https://textadventures.co.uk/games/load/${gameId}`, {
      credentials: 'include'  // Equivalent to withCredentials: true
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch save data (${response.status})`);
    }
    
    const result = await response.json();
    
    if (!result.Data) {
      throw new Error("No save data found for this game");
    }
    
    // Convert the base64 data to XML
    function base64ToBytes(base64) {
      const binString = atob(base64);
      return Uint8Array.from(binString, (m) => m.codePointAt(0));
    }
    
    let saveData = new TextDecoder().decode(base64ToBytes(result.Data));
    
    // Prepare XML with game ID
    const xmlString = 
      '<?xml version="1.0"?>\n<!-- viva-save-manager game-id="' +
      gameId +
      '" -->\n' +
      saveData;
    
    // Import it using your existing function
    await importSaveFromXML(xmlString, "Imported from v5 WebPlayer");
    
    showMessage("v5 save successfully imported!", 3000);
    document.getElementById("v5GameIdInput").value = "";
  } catch (error) {
    console.error("Error importing v5 save:", error);
    showMessage("Error: " + error.message, 5000);
  }
}
