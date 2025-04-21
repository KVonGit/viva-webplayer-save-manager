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


async function getVivaSave(id = getGameIdFromUrl(), slot = 0) {
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

function getGameIdFromUrl() {
  return window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
}

// Then use it in your function
getVivaSave().then(save => {
  const xmlString = decodeSaveData(save.data);
  console.log(xmlString); // The full XML save content
});

// Get all slots for a specific game
async function getSaveSlots(id = getGameIdFromUrl()) {
  const allSaves = await allVivaSaves();
  // Filter for the specific game ID and extract slot numbers
  return allSaves
    .filter(save => save.key[0] === id)
    .map(save => save.key[1]);
}

// Get the highest slot number for a game
async function getHighestSlot(id = getGameIdFromUrl()) {
  const slots = await getSaveSlots(id);
  return slots.length > 0 ? Math.max(...slots) : -1;
}

// Changed parameter order and renamed for clarity
async function copyVivaSaveToSlot(newSlot, originalSlot = 0, newName = null, id = getGameIdFromUrl(), overwrite = false) {
  let save = await getVivaSave(id, originalSlot);
  if (!save) throw new Error("Original save not found");

  let clonedSave = {
    ...save,
    slotIndex: newSlot,
    name: newName || `Copy of slot ${originalSlot}`,
    timestamp: new Date()
  };

  return saveToDB(clonedSave, id, newSlot, overwrite);
}

// Automatic slot copying function - creates a new slot with next number
async function copyVivaSave(originalSlot = 0, newName = null, id = getGameIdFromUrl()) {
  // Find the next available slot (max + 1)
  const highestSlot = await getHighestSlot(id);
  const newSlot = highestSlot + 1;
  
  return copyVivaSaveToSlot(newSlot, originalSlot, newName, id);
}

// Clone to different game ID
// No clue why we'd want to do this, but here it is anyway =)
async function cloneVivaSave(newId, originalId = getGameIdFromUrl(), originalSlot = 0, newSlot = 0, newName = null, overwrite = false) {
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
        const putRequest = store.put(saveData, [gameId, slotIndex]);
        putRequest.onsuccess = () => resolve(saveData);
        putRequest.onerror = () => reject("Failed to save game data");
      }
    };
  });
}

async function downloadVivaSave(id = getGameIdFromUrl(), slot = 0, format = 'quest-viva-save') {
  if (!['xml', 'json', 'quest-viva-save', 'aslx'].includes(format)) {
    throw new Error("Invalid format. Use 'xml', 'json', or 'quest-viva-save'.");
  }
  let save = await getVivaSave(id, slot);
  if (!save) throw new Error("Save not found");

  let blob;
  if (format === 'xml' || format === 'aslx' || format === 'quest-viva-save') {
    let xmlString = decodeSaveData(save.data);
    blob = new Blob(['<?xml version="1.0"?>\n<!-- Downloaded by Viva Save Manager 0.1.0 alpha -->\n' + xmlString], { type: "application/xml" });
  }
  else if (format === 'json') {
    blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
  }
   // Concert uint8array to XML instead of JSON
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = `qv_save-${id}-${slot}.${format}`; // TODO: Add timestamp to filename
  a.click();

  URL.revokeObjectURL(url);
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

  // The above works, the rest don't
  
  // Check if player has lamp
  const hasLamp = saveData.objectExists('room.player.lamp');
  console.log(`Player has lamp: ${hasLamp}`);
  
  // Check specific attribute
  const myAttribute = saveData.getObjectAttribute('player', 'name');
  console.log(`player.name: ${myAttribute}`); // Will be true as a boolean
  
  // List all objects in room
  const roomObjects = saveData.getChildObjects('room');
  console.log("Objects in room:", roomObjects); // Will include "player"
}

// Add this function to your code
function parseVivaSaveXML(xmlString) {
  // Parse the XML string into a DOM Document
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  // Find an object by path (e.g., "room.player.lamp")
  function findObjectByPath(path) {
    if (!path) return null;
    
    const parts = path.split('.');
    let currentElement = xmlDoc.documentElement; // <asl> root element
    
    // Special case for game properties
    if (parts[0] === 'game') {
      const gameElements = currentElement.getElementsByTagName('game');
      if (gameElements.length === 0) return null;
      
      if (parts.length === 1) return gameElements[0];
      
      // Handle game properties like game.version
      if (parts.length === 2) {
        const propElements = gameElements[0].getElementsByTagName(parts[1]);
        return propElements.length > 0 ? propElements[0] : null;
      }
      
      return null;
    }
    
    // Navigate through object hierarchy
    for (const part of parts) {
      let found = false;
      
      // Find direct child objects with matching name
      for (let i = 0; i < currentElement.children.length; i++) {
        const child = currentElement.children[i];
        if (child.tagName === 'object' && child.getAttribute('name') === part) {
          currentElement = child;
          found = true;
          break;
        }
      }
      
      if (!found) return null;
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
      const obj = findObjectByPath(objectPath);
      if (!obj) return null;
      
      for (let i = 0; i < obj.children.length; i++) {
        const child = obj.children[i];
        if (child.tagName === 'attr' && child.getAttribute('name') === attributeName) {
          // Return value based on type
          const type = child.getAttribute('type');
          const content = child.textContent;
          
          if (type === 'boolean') return content.toLowerCase() === 'true';
          if (type === 'number') return parseFloat(content);
          return content; // String or other types
        }
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
