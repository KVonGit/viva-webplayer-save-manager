/**
 * fileoverview Viva Save Manager - Manages save files for Viva web player games
 * version 0.1.0-beta
 * author K.V.
 * license MIT
 * 
 * description
 * Provides functionality to manage, backup, and restore save files
 * for games running in the Viva web player environment.
 */

window.isVivaPlayer = true;
// First, don't run this if this is running in the Windows app.
if (window.location.href.startsWith('res')) {
  window.isVivaPlayer = false;
  setTimeout(()=>{$('#divOutput').html('<center><h1>This only works in the Viva WebPlayer app.</h1></center>');}, 500);
  throw new Error('Viva Save Manager script is not compatible with the Windows app. Exiting. Not an actual error.');
}
console.log('Not the desktop app, continuing...');
// Second, don't run this if the URL includes 'Play.aspx', because the v5 WebPlayer works differently.
if (window.location.href.includes('Play.aspx')) {
  window.isVivaPlayer = false;
  setTimeout(()=>{$('#divOutput').html('<center><h1>This only works in the Viva WebPlayer app.</h1></center>');}, 500);
  throw new Error('Viva Save Manager script is not compatible with the v5 WebPlayer app. Exiting. Not an actual error.');
}
console.log('Not the v5 WebPlayer, continuing...');
// Now, let's Viva-beta-fy this code with a custom cache buster!
(function () {
  const currentScript = document.currentScript;

  /* The Windows app and the v5 WebPlayer both have '?c=' */
  if (!currentScript.src.includes('?c=')) {
      
      // Build cache-busted URL
      const bustedUrl = currentScript.src + '?c=' + Date.now();

      // Create new script element
      const script = document.createElement("script");
      script.src = bustedUrl;

      // Replace self
      script.onload = () => {
          console.log("Loaded fresh file:", bustedUrl);
      };

      document.head.appendChild(script);

      // Prevent this (stale) version from continuing
      throw new Error("Reloading file with cache buster: " + bustedUrl);
  }
})();
console.log('Cache buster applied, continuing...');
async function displaySavesList() { // Exit if window.isVivaPlayer is false
    if (!window.isVivaPlayer) return;
    try {
        const saves = await allVivaSaves();
        const gameGroups = {};

        // First pass: group saves by game ID and get game names
        for (const save of saves) {
            const gameId = save.key[0];
            if (!gameGroups[gameId]) {
                // Get game name from first save's XML
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

        // Generate HTML
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
  return xmlString; // Just a string, not parsed XML yet
}

/*
// Then use it in your function
getVivaSave().then(save => {
  const xmlString = decodeSaveData(save.data);
  console.log(xmlString); // The full XML save content
});
*/

// Get all slots for a specific game
async function getSaveSlots(id) {
  const allSaves = await allVivaSaves();
  // Filter for the specific game ID and extract slot numbers
  return allSaves
    .filter(save => save.key[0] === id)
    .map(save => save.key[1]);
}

// Get the highest slot number for a game
async function getHighestSlot(id) {
  const slots = await getSaveSlots(id);
  return slots.length > 0 ? Math.max(...slots) : -1;
}

// Changed parameter order and renamed for clarity
async function copyVivaSaveToSlot(newSlot, originalSlot = 0, newName = null, id, overwrite = false) {
    try {
        // Get original save
        let save = await getVivaSave(id, originalSlot);
        if (!save) throw new Error("Original save not found");

        // Create save entry matching GameSaver's structure
        const clonedSave = {
            gameId: id,          // Required by keyPath
            slotIndex: newSlot,  // Required by keyPath
            data: save.data,     // The actual save data
            name: newName || `Copy of ${save.name}`, // Use original save's name
            timestamp: new Date()
        };

        // Save using IndexedDB put operation
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

// Automatic slot copying function - creates a new slot with next number
async function copyVivaSave(id, originalSlot = 0, newName = null) {
  // Find the next available slot (max + 1)
  const highestSlot = await getHighestSlot(id);
  const newSlot = highestSlot + 1;
  
  return copyVivaSaveToSlot(newSlot, originalSlot, newName, id);
}

// Clone to different game ID
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

// Helper function for DB operations
function saveToDB(saveData, gameId, slotIndex, overwrite = false) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("quest-viva-saves");
    
    request.onerror = () => reject("Could not open DB");
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(["saves"], "readwrite");
      const store = transaction.objectStore("saves");
      
      // Check if save already exists at destination
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
        // Create a clean save object without the composite key fields
        const cleanSaveData = {
          data: saveData.data,
          name: saveData.name,
          timestamp: saveData.timestamp
        };
        
        // Use the composite key separately
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
  a.download = `qv_save-${id}-${slot}.${format}`;
  // TODO: Add timestamp to filename
  a.click();

  URL.revokeObjectURL(url);
}

function parseVivaSaveXML(xmlString) {
  // Parse the XML string into a DOM Document
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  // Find an object by path (e.g., "room.player.lamp")
  function findObjectByPath(path) {
    if (!path) return null;
    
    const parts = path.split('.');
    let currentElement = xmlDoc.documentElement; // <asl> root element
    
    // Special case for game properties and templates
    if (parts[0] === 'game' || parts[0] === 'template') {
      const elements = currentElement.getElementsByTagName(parts[0]);
      if (elements.length === 0) return null;
      
      // For templates, find by name attribute
      if (parts[0] === 'template') {
        for (let elem of elements) {
          if (elem.getAttribute('name') === parts[1]) {
            return elem;
          }
        }
        return null;
      }
      
      // Handle game properties
      if (parts[0] === 'game') {
        if (parts.length === 1) return elements[0];
        if (parts.length === 2) {
          const propElements = elements[0].getElementsByTagName(parts[1]);
          return propElements.length > 0 ? propElements[0] : null;
        }
      }
      
      return null;
    }

    // For regular objects (like 'player' or room names)
    let found = false;
    
    // First try to find the object as a direct child
    for (let i = 0; i < currentElement.children.length; i++) {
      const child = currentElement.children[i];
      if (child.tagName === 'object' && child.getAttribute('name') === parts[0]) {
        currentElement = child;
        found = true;
        break;
      }
    }

    // If not found as direct child, try searching all object elements
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

    // If looking for an attribute
    if (parts.length === 2) {
      // Search through attr elements
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
    // Get raw document
    getDocument: () => xmlDoc,
    
    // Get a specific object by path
    getObject: (path) => findObjectByPath(path),
    
    // Check if an object exists
    objectExists: (path) => findObjectByPath(path) !== null,
    
    // Get game info
    getGameInfo: function() {
      const gameElem = xmlDoc.getElementsByTagName('game')[0];
      if (!gameElem) return null;
      
      const result = { 
        name: gameElem.getAttribute('name') || ''
      };
      
      // Add other game properties
      ['version', 'author'].forEach(prop => {
        const elements = gameElem.getElementsByTagName(prop);
        if (elements.length > 0) {
          result[prop] = elements[0].textContent;
        }
      });
      
      return result;
    },
    
    // Get an attribute value for a specific object
    getObjectAttribute: function(objectPath, attributeName) {
      // Special handling for 'parent' attribute
      if (attributeName === 'parent') {
        const obj = findObjectByPath(objectPath);
        if (!obj) return null;

        // Look through all object elements in the document
        const objects = xmlDoc.getElementsByTagName('object');
        for (let potentialParent of objects) {
          // Check if this object contains our target as a direct child
          for (let child of potentialParent.children) {
            if (child.tagName === 'object' && 
                child.getAttribute('name') === obj.getAttribute('name')) {
              return potentialParent.getAttribute('name');
            }
          }
        }
        return null;
      }

      // Handle template elements specially
      if (objectPath === 'template') {
        const templates = xmlDoc.getElementsByTagName('template');
        for (let template of templates) {
          if (template.getAttribute('name') === attributeName) {
            return template.textContent;
          }
        }
        return null;
      }
  
      // For regular objects and other attributes
      const obj = findObjectByPath(objectPath);
      if (!obj) return null;
      
      // First check if we're looking for the 'name' attribute of the object itself
      if (attributeName === 'name') {
        return obj.getAttribute('name');
      }
      
      // Helper function to parse value based on type
      function parseValue(element) {
        const type = element.getAttribute('type');
        const content = element.textContent;
        // Handle empty elements as booleans set to true first
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
  
      // Check both formats: direct element and attr element
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
    
    // Get all attributes of an object
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
          else result[name] = content; // String or other types
        }
      }
      
      return result;
    },
    
    // Get direct child objects of an object
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

// Example usage
async function checkSaveData() {
  const save = await getVivaSave();
  if (!save) {
    console.error("No save found");
    return;
  }
  
  const xmlString = decodeSaveData(save.data);
  const saveData = parseVivaSaveXML(xmlString);
  
  // Get game info
  const gameInfo = saveData.getGameInfo();
  console.log(`Game: ${gameInfo.name} v${gameInfo.version} by ${gameInfo.author}`);

  // The above works, the next two do not.
  // Example file in examples folder: qv_save-z2yqtt1as0qxprpe1f5xag-0.quest-viva-save

  // Check specific attribute
  const myAttribute = saveData.getObjectAttribute('player', 'name');
  console.log(`player.name: ${myAttribute}`); // Will be true as a boolean
  
  // List all objects in room
  const roomObjects = saveData.getChildObjects('Your Hovel');
  console.log("Objects in room:", roomObjects);
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
        
        // Clear inputs
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

    // Match the working structure from copyVivaSaveToSlot
    const saveData = {
        data: new TextEncoder().encode(xmlString),
        gameId: gameId,
        slotIndex: nextSlot,
        name: customName || `Imported save ${new Date().toLocaleString()}`,
        timestamp: new Date()
    };

    // Use direct IndexedDB put like copyVivaSaveToSlot does
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
        
        // Clear existing options except first
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
    
    // Clear existing options except first
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    if (!gameId) return;
    
    try {
        const saves = await allVivaSaves();
        const gameSaves = saves.filter(save => save.key[0] === gameId);
        
        if (gameSaves.length > 0) {
            // Get game name from first save
            const xmlString = decodeSaveData(gameSaves[0].value.data);
            const saveData = parseVivaSaveXML(xmlString);
            const gameInfo = saveData.getGameInfo();
            
            // Show game name next to the select
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

        // Populate slots
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

// Call this when page loads
// window.addEventListener('load', populateGameSelect);

function showMessage(message, autoCloseMs = 2000) {
    const messageDialog = $("#messageDialog");
    $("#messageText").text(message);
    
    // Using Bootstrap's alert show/hide
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
    // Create and show Bootstrap confirmation modal
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
        // Initialize Bootstrap modal
        const confirmModal = new bootstrap.Modal(modalHtml[0]);
        
        // Wait for user confirmation
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

        // Perform delete operation
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

        // Get the save data
        const save = await getVivaSave(gameId, slot);
        if (!save) throw new Error("Save not found");

        // Create save object matching the working structure
        const updatedSave = {
            data: save.data,
            name: newName,
            timestamp: new Date(),
            gameId: gameId,      // Include these fields like copyVivaSaveToSlot
            slotIndex: slot      // Include these fields like copyVivaSaveToSlot
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

window.scrollToEnd = () => { /* do nothing */ }; // This is needed in this environment.



