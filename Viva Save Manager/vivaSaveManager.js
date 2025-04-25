/**
 * fileoverview Viva Save Manager - Manages save files for Viva web player games
 * version 0.1.5-alpha
 * author K.V.
 * license MIT
 * 
 * description
 * Provides functionality to manage, backup, and restore save files
 * for games running in the Viva web player environment.
 */

window.isVivaPlayer = true;

if (window.location.href.startsWith('res')) {
  window.isVivaPlayer = false;
  setTimeout(()=>{$('#divOutput').html('<center><h1>This only works in the Viva WebPlayer app.</h1></center>');}, 500);
  throw new Error('Viva Save Manager script is not compatible with the Windows app. Exiting. Not an actual error.');
}
console.log('Not the desktop app, continuing...');

if (window.location.href.includes('Play.aspx')) {
  window.isVivaPlayer = false;
  setTimeout(()=>{$('#divOutput').html('<center><h1>This only works in the Viva WebPlayer app.</h1></center>');}, 500);
  throw new Error('Viva Save Manager script is not compatible with the v5 WebPlayer app. Exiting. Not an actual error.');
}
console.log('Not the v5 WebPlayer, continuing...');

(function () {
  const currentScript = document.currentScript;

  if (!currentScript.src.includes('?c=')) {
      
      const bustedUrl = currentScript.src + '?c=' + Date.now();

      const script = document.createElement("script");
      script.src = bustedUrl;

      script.onload = () => {
          console.log("Loaded fresh file:", bustedUrl);
      };

      document.head.appendChild(script);

      throw new Error("Reloading file with cache buster: " + bustedUrl);
  }
})();
console.log('Cache buster applied, continuing...');
async function displaySavesList() {
    if (!window.isVivaPlayer) return;
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
                    name: gameInfo?.name || 'Unknown Game',
                    saves: []
                };
            }
            gameGroups[gameId].saves.push({
                slot: save.key[1],
                name: save.value.name,
                timestamp: new Date(save.value.timestamp).toLocaleString()
            });
        }

        let html = '';
        for (const [gameId, game] of Object.entries(gameGroups)) {
            html += `<div class="game-group mb-4">
                <div class="d-flex align-items-center mb-2">
                    <h3 class="h5 mb-0 me-2">${game.name}</h3>
                    <a href="https://play.textadventures.co.uk/textadventures/${gameId}" 
                       class="text-decoration-none" 
                       target="_blank" 
                       title="Play ${game.name}">🗗</a>
                </div>
                <small class="text-muted d-block mb-2">ID: ${gameId}</small>
                <ul class="list-group">`;
            
            game.saves.sort((a, b) => a.slot - b.slot);
            game.saves.forEach(save => {
                const escapedGameId = gameId.replace(/'/g, "\\'");
                html += `<li class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Slot ${save.slot}:</strong> ${save.name}
                            <br><small class="text-muted">${save.timestamp}</small>
                        </div>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="downloadVivaSave('${escapedGameId}', ${save.slot})">Download</button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="copyVivaSave('${escapedGameId}', ${save.slot}).then(() => showMessage('Save copied successfully'))">Copy</button>
                            <button class="btn btn-sm btn-outline-info" onclick="renameSaveSlot('${escapedGameId}', ${save.slot}, '${save.name.replace(/'/g, "\\'")}')">Rename</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteVivaSave('${escapedGameId}', ${save.slot})">Delete</button>
                        </div>
                    </div>
                </li>`;
            });
            
            html += `</ul></div>`;
        }

        document.getElementById('savesList').innerHTML = html || 'No saves found';
    } catch (error) {
        console.error('Error displaying saves:', error);
        document.getElementById('savesList').innerHTML = 'Error loading saves';
    }
}

async function allVivaSaves() {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open("quest-viva-saves");

    request.onerror = () => reject("Failed to open IndexedDB");

    request.onsuccess = function(event) {
      let db = event.target.result;
      let transaction = db.transaction(["saves"], "readonly");
      let store = transaction.objectStore("saves");

      let results = [];
      let cursorRequest = store.openCursor();

      cursorRequest.onsuccess = function(event) {
        let cursor = event.target.result;
        if (cursor) {
          results.push({
            key: cursor.key,
            value: cursor.value
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

    request.onsuccess = function(event) {
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
    .filter(save => save.key[0] === id)
    .map(save => save.key[1]);
}

async function getHighestSlot(id) {
  const slots = await getSaveSlots(id);
  return slots.length > 0 ? Math.max(...slots) : -1;
}

async function copyVivaSaveToSlot(newSlot, originalSlot = 0, newName = null, id, overwrite = false) {
    try {
        let save = await getVivaSave(id, originalSlot);
        if (!save) throw new Error("Original save not found");

        const clonedSave = {
            gameId: id,
            slotIndex: newSlot,
            data: save.data,
            name: newName || `Copy of ${save.name}`,
            timestamp: new Date()
        };

        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('quest-viva-saves', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });

        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        
        await new Promise((resolve, reject) => {
            const request = store.put(clonedSave);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        await displaySavesList();
        return clonedSave;
    } catch (error) {
        console.error('Error in copyVivaSaveToSlot:', error);
        throw error;
    }
}

async function copyVivaSave(id, originalSlot = 0, newName = null) {
  const highestSlot = await getHighestSlot(id);
  const newSlot = highestSlot + 1;
  
  return copyVivaSaveToSlot(newSlot, originalSlot, newName, id);
}

// Clone to different game ID
// UNUSED FUNCTION
// No clue why we'd want to do this, but here it is anyway =)
async function cloneVivaSave(newId, originalid, originalSlot = 0, newSlot = 0, newName = null, overwrite = false) {
  let save = await getVivaSave(originalId, originalSlot);
  if (!save) throw new Error("Original save not found");

  let clonedSave = {
    ...save,
    gameId: newId,
    slotIndex: newSlot,
    name: newName || `Cloned from ${originalId}`,
    timestamp: new Date()
  };

  return saveToDB(clonedSave, newId, newSlot, overwrite);
}

function saveToDB(saveData, gameId, slotIndex, overwrite = false) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("quest-viva-saves");
    
    request.onerror = () => reject("Could not open DB");
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(["saves"], "readwrite");
      const store = transaction.objectStore("saves");
      
      if (!overwrite) {
        const checkRequest = store.get([gameId, slotIndex]);
        checkRequest.onsuccess = function() {
          if (checkRequest.result && !overwrite) {
            reject("Save already exists at destination. Set overwrite=true to replace.");
            return;
          }
          putSave();
        };
        checkRequest.onerror = () => reject("Failed to check for existing save");
      } else {
        putSave();
      }
      
      function putSave() {
        const cleanSaveData = {
          data: saveData.data,
          name: saveData.name,
          timestamp: saveData.timestamp
        };
        
        const putRequest = store.put(cleanSaveData, [gameId, slotIndex]);
        putRequest.onsuccess = () => resolve(saveData);
        putRequest.onerror = (e) => {
          console.error('Put error:', e);
          reject("Failed to save game data");
        }
      }
    };
  });
}

async function downloadVivaSave(id, slot = 0, format = 'quest-viva-save') {
  if (!['xml', 'quest-viva-save', 'aslx'].includes(format)) {
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
    
    const parts = path.split('.');
    let currentElement = xmlDoc.documentElement; // <asl> root element
    
    if (parts[0] === 'game' || parts[0] === 'template') {
      const elements = currentElement.getElementsByTagName(parts[0]);
      if (elements.length === 0) return null;
      
      if (parts[0] === 'template') {
        for (let elem of elements) {
          if (elem.getAttribute('name') === parts[1]) {
            return elem;
          }
        }
        return null;
      }
      
      if (parts[0] === 'game') {
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
      if (child.tagName === 'object' && child.getAttribute('name') === parts[0]) {
        currentElement = child;
        found = true;
        break;
      }
    }

    if (!found) {
      const objects = currentElement.getElementsByTagName('object');
      for (let obj of objects) {
        if (obj.getAttribute('name') === parts[0]) {
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
        if (child.tagName === 'attr' && child.getAttribute('name') === parts[1]) {
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
    
    getGameInfo: function() {
      const gameElem = xmlDoc.getElementsByTagName('game')[0];
      if (!gameElem) return null;
      
      const result = { 
        name: gameElem.getAttribute('name') || ''
      };
      
      ['version', 'author'].forEach(prop => {
        const elements = gameElem.getElementsByTagName(prop);
        if (elements.length > 0) {
          result[prop] = elements[0].textContent;
        }
      });
      
      return result;
    },
    
    getObjectAttribute: function(objectPath, attributeName) {
      if (attributeName === 'parent') {
        const obj = findObjectByPath(objectPath);
        if (!obj) return null;

        const objects = xmlDoc.getElementsByTagName('object');
        for (let potentialParent of objects) {
          for (let child of potentialParent.children) {
            if (child.tagName === 'object' && 
                child.getAttribute('name') === obj.getAttribute('name')) {
              return potentialParent.getAttribute('name');
            }
          }
        }
        return null;
      }

      if (objectPath === 'template') {
        const templates = xmlDoc.getElementsByTagName('template');
        for (let template of templates) {
          if (template.getAttribute('name') === attributeName) {
            return template.textContent;
          }
        }
        return null;
      }
  
      const obj = findObjectByPath(objectPath);
      if (!obj) return null;
      
      if (attributeName === 'name') {
        return obj.getAttribute('name');
      }
      
      function parseValue(element) {
        const type = element.getAttribute('type');
        const content = element.textContent;
        if (!type && !content && element.tagName !== 'attr') {
          return true;
      }
        switch(type) {
            case 'boolean':
                return content ? content.toLowerCase() === 'true' : element.hasAttribute('type');
            case 'int':
                return parseInt(content || '0', 10);
            case 'script':
            case 'string':
                return content;
            case 'simplestringlist':
            case 'stringlist':
            case 'objectlist':
                return Array.from(element.getElementsByTagName('value')).map(v => v.textContent);
            case 'dictionary':
            case 'stringdictionary':
            case 'objectdictionary':
                const dict = {};
                Array.from(element.getElementsByTagName('item')).forEach(item => {
                    const key = item.getElementsByTagName('key')[0]?.textContent;
                    const value = item.getElementsByTagName('value')[0]?.textContent;
                    if (key) dict[key] = value;
                });
                return dict;
            case 'object':
                return content || element.getAttribute('name') || null;
            default:
                return content;
        }
      }
  
      const directElement = Array.from(obj.children).find(
          child => child.tagName === attributeName
      );
      if (directElement) {
          return parseValue(directElement);
      }
  
      const attrElement = Array.from(obj.children).find(
          child => child.tagName === 'attr' && child.getAttribute('name') === attributeName
      );
      if (attrElement) {
          return parseValue(attrElement);
      }
  
      return null;
    },
    
    getObjectAttributes: function(objectPath) {
      const obj = findObjectByPath(objectPath);
      if (!obj) return {};
      
      const result = {};
      
      for (let i = 0; i < obj.children.length; i++) {
        const child = obj.children[i];
        if (child.tagName === 'attr') {
          const name = child.getAttribute('name');
          const type = child.getAttribute('type');
          const content = child.textContent;
          
          if (type === 'boolean') result[name] = content.toLowerCase() === 'true';
          else if (type === 'number') result[name] = parseFloat(content);
          else result[name] = content;
        }
      }
      
      return result;
    },
    
    getChildObjects: function(objectPath) {
      const obj = findObjectByPath(objectPath);
      if (!obj) return [];
      
      const result = [];
      
      for (let i = 0; i < obj.children.length; i++) {
        const child = obj.children[i];
        if (child.tagName === 'object') {
          result.push(child.getAttribute('name'));
        }
      }
      
      return result;
    }
  };
}

async function getAttributeValue() {
    const gameId = document.getElementById('gameIdSelect').value;
    const slot = document.getElementById('slotSelect').value;
    const objectPath = document.getElementById('objectPath').value;
    const attrName = document.getElementById('attrName').value;
    
    if (!gameId || !slot) {
        alert('Please select both a game and save slot');
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
        const display = document.getElementById('attrValue');
        display.textContent = `${objectPath}.${attrName}: ${value}`;
        display.style.display = 'block';
    } catch (error) {
        console.error('Error getting attribute value:', error);
    }
}

window.pendingImportData = null;

async function handleFileUpload() {
    const fileInput = document.getElementById('saveFileInput');
    const nameInput = document.getElementById('saveNameInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file first');
        return;
    }

    try {
        const xmlString = await readFileAsText(file);
        const customName = nameInput.value.trim();
        await importSaveFromXML(xmlString, customName);
        showMessage('Save imported successfully');
        
        fileInput.value = '';
        nameInput.value = '';
    } catch (error) {
        console.error('Error importing save:', error);
        showMessage('Error importing save: ' + error.message);
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
}

async function importSaveFromXML(xmlString, customName = null) {
    const gameIdMatch = xmlString.match(/<!--\s*viva-save-manager\s+game-id="([^"]+)"\s*-->/);
    if (!gameIdMatch) {
        throw new Error('Invalid save file: No game ID found');
    }
    
    const gameId = gameIdMatch[1];
    xmlString = xmlString.replace(/<!--\s*viva-save-manager\s+game-id="[^"]+"\s*-->\n?/, '');

    const nextSlot = await getHighestSlot(gameId) + 1;

    const saveData = {
        data: new TextEncoder().encode(xmlString),
        gameId: gameId,
        slotIndex: nextSlot,
        name: customName || `Imported save ${new Date().toLocaleString()}`,
        timestamp: new Date()
    };

    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('quest-viva-saves', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });

    const tx = db.transaction('saves', 'readwrite');
    const store = tx.objectStore('saves');
    
    await new Promise((resolve, reject) => {
        const request = store.put(saveData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });

    await displaySavesList();
}

async function populateGameSelect() {
    if (!window.isVivaPlayer) return;
    try {
        const saves = await allVivaSaves();
        const gameIds = [...new Set(saves.map(save => save.key[0]))];
        const select = document.getElementById('gameIdSelect');
        
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        gameIds.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            select.appendChild(option);
        });
        
        select.onchange = updateSlotSelect;
    } catch (error) {
        console.error('Error populating game select:', error);
    }
}

async function updateSlotSelect() {
    const gameId = document.getElementById('gameIdSelect').value;
    const select = document.getElementById('slotSelect');
    
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    if (!gameId) return;
    
    try {
        const saves = await allVivaSaves();
        const gameSaves = saves.filter(save => save.key[0] === gameId);
        
        if (gameSaves.length > 0) {
            const xmlString = decodeSaveData(gameSaves[0].value.data);
            const saveData = parseVivaSaveXML(xmlString);
            const gameInfo = saveData.getGameInfo();
            
            const gameIdSelect = document.getElementById('gameIdSelect');
            const gameNameSpan = document.getElementById('selectedGameName') || 
                (() => {
                    const span = document.createElement('span');
                    span.id = 'selectedGameName';
                    span.className = 'ms-2 text-muted';
                    gameIdSelect.parentNode.appendChild(span);
                    return span;
                })();
            gameNameSpan.textContent = `(${gameInfo.name})`;
        }

        const slots = gameSaves.map(save => ({
            slot: save.key[1],
            name: save.value.name
        }));
        
        slots.sort((a, b) => a.slot - b.slot);
        
        slots.forEach(({slot, name}) => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = `Slot ${slot}: ${name}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error updating slot select:', error);
    }
}

function showMessage(message, autoCloseMs = 2000) {
    const messageDialog = $("#messageDialog");
    $("#messageText").text(message);
    
    messageDialog
        .removeClass('fade')
        .show()
        .addClass('show');
    
    setTimeout(() => {
        messageDialog
            .removeClass('show')
            .addClass('fade')
            .hide();
    }, autoCloseMs);
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
    `).appendTo('body');

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

        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('quest-viva-saves', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });

        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        
        await new Promise((resolve, reject) => {
            const request = store.delete([id, slot]);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        await displaySavesList();
        showMessage('Save deleted successfully');
    } catch (error) {
        console.error('Error in deleteVivaSave:', error);
        showMessage('Error deleting save');
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
    `).appendTo('body');

    try {
        const confirmModal = new bootstrap.Modal(modalHtml[0]);
        
        const newName = await new Promise(resolve => {
            modalHtml
                .on('hidden.bs.modal', () => resolve(null))
                .find('#confirmRename').on('click', () => {
                    const name = modalHtml.find('#newSaveName').val().trim();
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
            slotIndex: slot
        };

        // Use direct IndexedDB put without separate key
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('quest-viva-saves', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });

        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        
        await new Promise((resolve, reject) => {
            const request = store.put(updatedSave);  // No separate key needed
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        await displaySavesList();
        showMessage('Save renamed successfully');
    } catch (error) {
        console.error('Error renaming save:', error);
        showMessage('Error renaming save');
    } finally {
        modalHtml.remove();
    }
}

function scrollToEnd() {
  // Do nothing
}


