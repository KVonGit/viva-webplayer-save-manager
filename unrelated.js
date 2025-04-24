// Check if any saves from another game have a specific attribute value

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

function decodeSaveData(uint8array) {
  let decoder = new TextDecoder("utf-8");
  let xmlString = decoder.decode(uint8array);
  return xmlString; // Just a string, not parsed XML yet
}

function parseVivaSaveXML(xmlString) {
  // Parse the XML string into a DOM Document
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  // Find an object by path (e.g., "room.player.lamp")
  function findObjectByPath(path) {
    if (!path) return null;

    const parts = path.split(".");
    let currentElement = xmlDoc.documentElement; // <asl> root element

    // Special case for game properties and templates
    if (parts[0] === "game" || parts[0] === "template") {
      const elements = currentElement.getElementsByTagName(parts[0]);
      if (elements.length === 0) return null;

      // For templates, find by name attribute
      if (parts[0] === "template") {
        for (let elem of elements) {
          if (elem.getAttribute("name") === parts[1]) {
            return elem;
          }
        }
        return null;
      }

      // Handle game properties
      if (parts[0] === "game") {
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
      if (
        child.tagName === "object" &&
        child.getAttribute("name") === parts[0]
      ) {
        currentElement = child;
        found = true;
        break;
      }
    }

    // If not found as direct child, try searching all object elements
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

    // If looking for an attribute
    if (parts.length === 2) {
      // Search through attr elements
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
    // Get raw document
    getDocument: () => xmlDoc,

    // Get a specific object by path
    getObject: (path) => findObjectByPath(path),

    // Check if an object exists
    objectExists: (path) => findObjectByPath(path) !== null,

    // Get game info
    getGameInfo: function () {
      const gameElem = xmlDoc.getElementsByTagName("game")[0];
      if (!gameElem) return null;

      const result = {
        name: gameElem.getAttribute("name") || "",
      };

      // Add other game properties
      ["version", "author"].forEach((prop) => {
        const elements = gameElem.getElementsByTagName(prop);
        if (elements.length > 0) {
          result[prop] = elements[0].textContent;
        }
      });

      return result;
    },

    // Get an attribute value for a specific object
    getObjectAttribute: function (objectPath, attributeName) {
      // Handle template elements specially
      if (objectPath === "template") {
        const templates = xmlDoc.getElementsByTagName("template");
        for (let template of templates) {
          if (template.getAttribute("name") === attributeName) {
            return template.textContent;
          }
        }
        return null;
      }

      // For regular objects
      const obj = findObjectByPath(objectPath);
      if (!obj) return null;

      // First check if we're looking for the 'name' attribute of the object itself
      if (attributeName === "name") {
        return obj.getAttribute("name");
      }

      // Helper function to parse value based on type
      function parseValue(element) {
        const type = element.getAttribute("type");
        const content = element.textContent;

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

      // Check both formats: direct element and attr element
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

    // Get all attributes of an object
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
          else result[name] = content; // String or other types
        }
      }

      return result;
    },

    // Get direct child objects of an object
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

async function checkAttributeInGame(
  originalGameId,
  objectPath,
  attrName,
  valueToFind
) {
  try {
    // Get all saves from original game
    const saves = await allVivaSaves();
    const originalSaves = saves.filter(
      (save) => save.key[0] === originalGameId
    );

    // No saves found for this game
    if (originalSaves.length === 0) {
      return false;
    }

    // Check each save until we find a match
    for (const save of originalSaves) {
      const xmlString = decodeSaveData(save.value.data);
      const saveData = parseVivaSaveXML(xmlString);

      const value = saveData.getObjectAttribute(objectPath, attrName);
      if (value === valueToFind) {
        return true;
      }
    }

    // No matches found
    return false;
  } catch (error) {
    console.error("Error checking attribute:", error);
    return false;
  }
}

// Example usage:
// Check if any Quest-Man saves have game.foo = 69105
const hasOldValue = await checkAttributeInGame(
  "z2yqtt1as0qxprpe1f5xag", // Game ID
  "game", // Object name
  "foo", // Attribute name
  69105 // Value to match
);

if (hasOldValue) {
  console.log("Found a save with game.foo set to 69105");
  ASLEvent('UnlockSpecialBonus', '');
}
