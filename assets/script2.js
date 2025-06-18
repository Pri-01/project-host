// Global resource storage
let allResources = [];
const locationCoords = {}; // Geocode cache

// Tweets to send to the backend
const tweets = [
  "Urgent: Need clean drinking water and ORS packets in Guwahati, Assam. #FloodRelief",
  "We have 50 blankets available at our relief center in Cuttack, Odisha. DM for coordination.",
  "Need baby food and diapers in Silchar. Many families with infants are stranded. #AssamFloods",
  "Medical team available with basic first aid kits and antibiotics in Patna, Bihar. Can travel.",
  "Any help with sanitary pads and hygiene kits in Howrah, West Bengal? Supplies running low.",
  "We’ve stocked rice, dal, and salt in our community kitchen in Ranchi. Please spread the word.",
  "Badly need glucose packets and energy bars for stranded people in Malda district.",
  "Free cooked meals available from 12–3 PM near Bhubaneswar Railway Station.",
  "Urgent need for volunteers and stretchers in Darbhanga to help elderly flood victims.",
  "We’ve arranged 200 bottles of drinking water and ORS in Dibrugarh. Please come to collect.",
  "Need power banks and torches in flooded areas of Barpeta. No electricity for 2 days.",
  "NGO in Dhanbad has stock of antiseptics, bandages, and basic meds. Contact if needed.",
  "Desperately looking for mosquito nets and repellent in Jalpaiguri. Kids getting sick.",
  "We’re distributing raincoats and plastic sheets in Purnia. Come by Shastri Nagar school.",
  "Need insulin and blood pressure medicines urgently in Muzaffarpur. Patient stranded.",
  "Offering shelter space for 20 people in Balasore. Basic food and water available.",
  "Is anyone supplying pet food in Gaya? Strays and rescued pets need help too.",
  "Available: Baby formula, sanitary napkins, and water at shelter near Nalbari town hall.",
  "Please send life jackets and ropes to flood-hit areas of Goalpara. Emergency!",
  "We are offering free phone charging and warm meals in Midnapore. Just walk in."
];

/******************************************************************
 * 0. SESSION STORAGE MANAGEMENT                                  *
 ******************************************************************/

/**
 * Save the current state to sessionStorage.
 */
function saveStateToSessionStorage(analysisData, transformedData) {
  sessionStorage.setItem("analysisData", JSON.stringify(analysisData));
  sessionStorage.setItem("transformedData", JSON.stringify(transformedData));
  sessionStorage.setItem("locationCoords", JSON.stringify(locationCoords));
  sessionStorage.setItem("lastUpdated", new Date().toISOString());
}

/**
 * Load the state from sessionStorage.
 * Returns { analysisData, transformedData } if data exists, otherwise null.
 */
function loadStateFromSessionStorage() {
  const analysisData = sessionStorage.getItem("analysisData");
  const transformedData = sessionStorage.getItem("transformedData");
  const savedLocationCoords = sessionStorage.getItem("locationCoords");

  if (analysisData && transformedData) {
    // Restore locationCoords
    const parsedLocationCoords = JSON.parse(savedLocationCoords || "{}");
    Object.assign(locationCoords, parsedLocationCoords);

    return {
      analysisData: JSON.parse(analysisData),
      transformedData: JSON.parse(transformedData)
    };
  }
  return null;
}

/**
 * Clear the state and reset the UI to its initial state.
 */
function clearState() {
  // Clear sessionStorage
  sessionStorage.removeItem("analysisData");
  sessionStorage.removeItem("transformedData");
  sessionStorage.removeItem("locationCoords");
  sessionStorage.removeItem("lastUpdated");

  // Reset global variables
  allResources = [];
  Object.keys(locationCoords).forEach(key => delete locationCoords[key]);

  // Reset UI
  renderTweetList([]); // Clear tweet list
  renderResources([]); // Clear resource lists
  if (typeof window.clearMap === "function") {
    window.clearMap(); // Explicitly clear and reset the map
  } else {
    console.error("clearMap function not found. Ensure map.js is loaded correctly.");
  }

  Swal.fire({
    title: "Cleared!",
    text: "The page has been reset to its initial state.",
    icon: "info",
    timer: 1500,
    showConfirmButton: false
  });
}

/**
 * Initialize the page by loading state from sessionStorage.
 */
function initializePage() {
  const state = loadStateFromSessionStorage();
  if (state) {
    allResources = state.transformedData; // Restore global resources
    renderTweetList(state.analysisData); // Restore tweet list
    renderResources(state.transformedData); // Restore resource lists
    updateMapWithResources(state.transformedData); // Restore map
    console.log("State restored from sessionStorage:", state);
  }
}

// Run initialization on page load
document.addEventListener("DOMContentLoaded", initializePage);

// Add event listener for the clear button
document.addEventListener("DOMContentLoaded", () => {
  const clearButton = document.getElementById("clear-btn");
  if (clearButton) {
    clearButton.addEventListener("click", clearState);
  }
});

/******************************************************************
 * 1. TRANSFORMATION LAYER                                         *
 ******************************************************************/

/**
 * Converts raw tweet JSON into a uniform resource list.
 * We only rely on `nerInformation.entities`.
 */
function transformTweetData(tweetData) {
  const resources = [];

  tweetData.forEach(entry => {
    const meta = entry.predictions;
    const type = meta.type; // "need" | "available"
    const location = meta.nerInformation.locations?.[0];
    const entitiesRaw = meta.nerInformation.entities || "";

    if (!location || !entitiesRaw.trim() || type === "NA") return;

    resources.push({
      location,
      entities: entitiesRaw,
      type,
      tweet: entry.tweet
    });
  });

  return resources;
}

/******************************************************************
 * 2. FETCH TWEETS AND ANALYZE                                     *
 ******************************************************************/

/**
 * Fetch the analyzed tweets from the Flask backend and update UI.
 */
async function fetchTweetsAndAnalyze() {
  const fetchButton = document.getElementById("fetch-tweets-btn");
  const defaultLoader = document.getElementById("default-loader");
  const fetchLoader = document.getElementById("fetch-loader");

  // Hide default loader, show fetch loader
  defaultLoader.style.display = "none";
  fetchLoader.style.display = "block";

  // Start fetch-time animation
  const fetchAnimation = lottie.loadAnimation({
    container: fetchLoader,
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: "/Frontend/assets/mobile.json",
  });

  fetchButton.disabled = true;
  fetchButton.textContent = "Fetching...";

  try {
    const flaskResponse = await axios.post('http://localhost:5000/predict', { tweets });

    if (flaskResponse.data.error) {
      throw new Error(flaskResponse.data.error);
    }

    const analysisData = flaskResponse.data;
    console.log('Analysis Data:', analysisData);

    const transformedData = transformTweetData(analysisData);
    allResources = transformedData;
    renderTweetList(analysisData);
    renderResources(transformedData);
    updateMapWithResources(transformedData);
    saveStateToSessionStorage(analysisData, transformedData);

    Swal.fire({
      title: "Success!",
      text: "Tweets fetched and analyzed.",
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });

  } catch (err) {
    console.error("Error fetching or analyzing tweets:", err);
    Swal.fire({
      title: "Error",
      text: `Failed to fetch tweets: ${err.message}`,
      icon: "error"
    });
  } finally {
    fetchButton.disabled = false;
    fetchButton.textContent = "Fetch Latest Tweets";

    // Hide fetch animation and show default again
    fetchAnimation.destroy();
    fetchLoader.style.display = "none";
    defaultLoader.style.display = "block";
  }
}



// Add event listener for the fetch button
document.getElementById("fetch-tweets-btn").addEventListener("click", fetchTweetsAndAnalyze);

/******************************************************************
 * 3. HELPER UTILITIES                                            *
 ******************************************************************/

// Geocode via Nominatim (cached)
async function getLatLng(location) {
  if (locationCoords[location]) return locationCoords[location];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    );
    const data = await res.json();
    if (data.length) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      locationCoords[location] = coords;
      return coords;
    }
  } catch (err) {
    console.error("Geocode failed:", err);
  }
  return null;
}

// Haversine distance in km
function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Extract name & quantity from a raw entity chunk like
 * "of ORS packets", "of rice 50 kg", "of clean drinking water"
 */
function extractItemDetails(entity) {
  const quantityMatch = entity.match(/(\d+(?:\.\d+)?\s*\w*)/);
  if (quantityMatch) {
    const quantity = quantityMatch[0].trim();
    const name = entity
      .replace(quantity, "")
      .replace(/^of\s+/i, "")
      .trim();
    return { name, quantity };
  }
  return {
    name: entity.trim().replace(/^of\s+/i, ""),
    quantity: "Quantity not mentioned"
  };
}

/**
 * Helper to get individual cleaned entity names from the combined string.
 */
function splitEntityNames(entitiesString) {
  return entitiesString
    .split(",")
    .map(e => extractItemDetails(e).name.toLowerCase())
    .filter(Boolean);
}

/**
 * Flexible name-match:
 * - exact substring check (A in B or B in A)
 * - ignores plurals like "packet(s)", "kit(s)", generic words (stopwords)
 */
const GENERIC_WORDS = [
  "kg",
  "pack",
  "packs",
  "packet",
  "packets",
  "bottle",
  "bottles",
  "unit",
  "units",
  "piece",
  "pieces",
  "kit",
  "kits",
  "bag",
  "bags"
];

function cleanNameForMatch(name) {
  return name
    .split(/[^a-z0-9]+/i)
    .filter(w => w && !GENERIC_WORDS.includes(w))
    .join(" ");
}

function namesMatch(nameA, nameB) {
  const a = cleanNameForMatch(nameA.toLowerCase());
  const b = cleanNameForMatch(nameB.toLowerCase());

  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

/******************************************************************
 * 4. RENDERING                                                   *
 ******************************************************************/

function createResourceGroup(location, entities, type, tweet = "") {
  const group = document.createElement("div");
  group.className = "resource-group";

  group.innerHTML = `
    <div class="resource-header"><span class="location">${location}</span></div>
    <div class="tweet-inline">Tweet: ${tweet}</div>
    <div class="resource-items"></div>
  `;

  const itemList = group.querySelector(".resource-items");

  if (entities.trim()) {
    const items = entities.split(",").map(e => e.trim()).filter(Boolean);
    items.forEach((raw) => {
      const { name, quantity } = extractItemDetails(raw);
      itemList.insertAdjacentHTML(
        "beforeend",
        `
        <div class="resource-item">
          <span>${name}</span>
          <span>${quantity}</span>
          <button class="match-btn" data-type="${type}" data-location="${location}" data-resource="${name}">See nearest match</button>
        </div>`
      );
    });
  } else {
    itemList.innerHTML = '<div class="no-items">No items listed</div>';
  }

  return group;
}

function renderResources(data) {
  const needList = document.getElementById("need-list");
  const availList = document.getElementById("available-list");
  needList.innerHTML = availList.innerHTML = "";

  let needed = false,
    available = false;

  data.forEach(entry => {
    const block = createResourceGroup(
      entry.location,
      entry.entities,
      entry.type,
      entry.tweet
    );

    if (entry.type === "need") {
      needList.appendChild(block);
      needed = true;
    } else {
      availList.appendChild(block);
      available = true;
    }
  });

  if (!needed)
    needList.innerHTML = '<div class="no-items">No needed resources</div>';
  if (!available)
    availList.innerHTML = '<div class="no-items">No available resources</div>';
}

function renderTweetList(tweetData) {
  const tweetList = document.querySelector(".tweet-list");
  tweetList.innerHTML = "";
  tweetData.forEach(t => {
    tweetList.insertAdjacentHTML(
      "beforeend",
      `<div class="tweet-card"><p class="tweet-text">${t.tweet}</p></div>`
    );
  });
}

/******************************************************************
 * 5. MATCH-FINDING WITH BETTER NAME LOGIC                        *
 ******************************************************************/

document.addEventListener("click", async e => {
  if (!e.target.classList.contains("match-btn")) return;

  const btn = e.target;
  const originType = btn.dataset.type; // need | available (clicked)
  const originLoc = btn.dataset.location;
  const originResource = btn.dataset.resource.toLowerCase();

  const originCoords = await getLatLng(originLoc);
  if (!originCoords) {
    Swal.fire("Location Error", `Couldn't get coordinates for ${originLoc}`, "error");
    return;
  }

  const targetType = originType === "need" ? "available" : "need";
  let nearest = null,
    minDist = Infinity;

  for (const entry of allResources) {
    if (entry.type !== targetType) continue;

    const candidateNames = splitEntityNames(entry.entities);
    const isMatch = candidateNames.some(n => namesMatch(originResource, n));
    if (!isMatch) continue;

    const destCoords = await getLatLng(entry.location);
    if (!destCoords) continue;

    const dist = haversineDistance(originCoords, destCoords);
    if (dist < minDist) {
      minDist = dist;
      nearest = entry;
    }
  }

  if (nearest) {
    Swal.fire({
      title: "Match Found!",
      html: `<b>From:</b> ${originLoc}<br>
             <b>Nearest ${targetType} location:</b> ${nearest.location}<br>
             <b>Distance:</b> ${minDist.toFixed(2)} km<br>
             <b>Resources:</b> ${nearest.entities}`,
      icon: "success"
    });
  } else {
    Swal.fire(
      "No Match",
      `No nearby ${targetType} found for ${originResource}`,
      "info"
    );
  }
});

/******************************************************************
 * 6. MAP UPDATE (Depends on map.js)                              *
 ******************************************************************/

/**
 * Update the map with the latest resources.
 * Calls the global updateMap function defined in map.js.
 */
function updateMapWithResources(resources) {
  console.log("Calling updateMap with resources:", resources);
  if (typeof window.updateMap === "function") {
    window.updateMap(resources);
  } else {
    console.error("updateMap function not found. Ensure map.js is loaded correctly.");
  }
}


// ---------------------------------------------------------------------------------------------------------------------------------------

// Twitter API call button and function with changed function name 



// // Global resource storage
// let allResources = [];
// const locationCoords = {}; // Geocode cache

// /******************************************************************
//  * 0. SESSION STORAGE MANAGEMENT                                  *
//  ******************************************************************/

// /**
//  * Save the current state to sessionStorage.
//  */
// function saveStateToSessionStorage(analysisData, transformedData) {
//   sessionStorage.setItem("analysisData", JSON.stringify(analysisData));
//   sessionStorage.setItem("transformedData", JSON.stringify(transformedData));
//   sessionStorage.setItem("locationCoords", JSON.stringify(locationCoords));
//   sessionStorage.setItem("lastUpdated", new Date().toISOString());
// }

// /**
//  * Load the state from sessionStorage.
//  * Returns { analysisData, transformedData } if data exists, otherwise null.
//  */
// function loadStateFromSessionStorage() {
//   const analysisData = sessionStorage.getItem("analysisData");
//   const transformedData = sessionStorage.getItem("transformedData");
//   const savedLocationCoords = sessionStorage.getItem("locationCoords");

//   if (analysisData && transformedData) {
//     // Restore locationCoords
//     const parsedLocationCoords = JSON.parse(savedLocationCoords || "{}");
//     Object.assign(locationCoords, parsedLocationCoords);

//     return {
//       analysisData: JSON.parse(analysisData),
//       transformedData: JSON.parse(transformedData)
//     };
//   }
//   return null;
// }

// /**
//  * Clear the state and reset the UI to its initial state.
//  */
// function clearState() {
//   // Clear sessionStorage
//   sessionStorage.removeItem("analysisData");
//   sessionStorage.removeItem("transformedData");
//   sessionStorage.removeItem("locationCoords");
//   sessionStorage.removeItem("lastUpdated");

//   // Reset global variables
//   allResources = [];
//   Object.keys(locationCoords).forEach(key => delete locationCoords[key]);

//   // Reset UI
//   renderTweetList([]); // Clear tweet list
//   renderResources([]); // Clear resource lists
//   if (typeof window.clearMap === "function") {
//     window.clearMap(); // Explicitly clear and reset the map
//   } else {
//     console.error("clearMap function not found. Ensure map.js is loaded correctly.");
//   }

//   Swal.fire({
//     title: "Cleared!",
//     text: "The page has been reset to its initial state.",
//     icon: "info",
//     timer: 1500,
//     showConfirmButton: false
//   });
// }

// /**
//  * Initialize the page by loading state from sessionStorage.
//  */
// function initializePage() {
//   const state = loadStateFromSessionStorage();
//   if (state) {
//     allResources = state.transformedData; // Restore global resources
//     renderTweetList(state.analysisData); // Restore tweet list
//     renderResources(state.transformedData); // Restore resource lists
//     updateMapWithResources(state.transformedData); // Restore map
//     console.log("State restored from sessionStorage:", state);
//   } else {
//     // Load initial data from test2.json if no sessionStorage data
//     fetch("/assets/test2.json")
//       .then(res => res.json())
//       .then(data => {
//         const transformed = transformTweetData(data);
//         allResources = transformed;
//         renderResources(transformed);
//         renderTweetList(data);
//         updateMapWithResources(transformed); // Initial map render
//         saveStateToSessionStorage(data, transformed); // Save state after initial load
//       })
//       .catch(err => console.error("Failed to load JSON:", err));
//   }
// }

// // Run initialization on page load
// document.addEventListener("DOMContentLoaded", initializePage);

// // Add event listener for the clear button
// document.addEventListener("DOMContentLoaded", () => {
//   const clearButton = document.getElementById("clear-btn");
//   if (clearButton) {
//     clearButton.addEventListener("click", clearState);
//   }
// });

// /******************************************************************
//  * 1. TRANSFORMATION LAYER                                         *
//  ******************************************************************/

// /**
//  * Converts raw tweet JSON into a uniform resource list.
//  * We only rely on `nerInformation.entities`.
//  */
// function transformTweetData(tweetData) {
//   const resources = [];

//   tweetData.forEach(entry => {
//     const meta = entry.predictions;
//     const type = meta.type; // "need" | "available"
//     const location = meta.nerInformation.locations?.[0];
//     const entitiesRaw = meta.nerInformation.entities || "";

//     if (!location || !entitiesRaw.trim() || type === "NA") return;

//     resources.push({
//       location,
//       entities: entitiesRaw,
//       type,
//       tweet: entry.tweet
//     });
//   });

//   return resources;
// }

// /******************************************************************
//  * 2. FETCH TWEETS AND ANALYZE                                     *
//  ******************************************************************/

// /**
//  * Fetch the latest tweets from NDRF via Flask backend and update UI.
//  */
// async function fetchTweetsAndAnalyze() {
//   console.log("Fetching tweets...");
//   const fetchButton = document.getElementById("fetch-tweets-btn");
//   const defaultLoader = document.getElementById("default-loader");
//   const fetchLoader = document.getElementById("fetch-loader");

//   // Hide default loader, show fetch loader
//   if (defaultLoader) defaultLoader.style.display = "none";
//   if (fetchLoader) fetchLoader.style.display = "block";
//   else console.warn("fetchLoader element not found in DOM");

//   // Start fetch-time animation
//   let fetchAnimation;
//   if (fetchLoader) {
//     fetchAnimation = lottie.loadAnimation({
//       container: fetchLoader,
//       renderer: "svg",
//       loop: true,
//       autoplay: true,
//       path: "/Frontend/assets/mobile.json", // Ensure this path matches your project structure
//     });
//   }

//   fetchButton.disabled = true;
//   fetchButton.textContent = "Fetching...";

//   try {
//     console.log("Making API call to http://localhost:5000/fetch-ndrf-tweets");
//     const flaskResponse = await axios.get('http://localhost:5000/fetch-ndrf-tweets');
//     console.log("API Response:", flaskResponse);
//     if (flaskResponse.data.error) {
//       throw new Error(flaskResponse.data.error);
//     }
//     const analysisData = flaskResponse.data;
//     console.log('Analysis Data:', analysisData);

//     // Transform and update UI
//     const transformedData = transformTweetData(analysisData);
//     allResources = transformedData; // Update global resources
//     renderTweetList(analysisData); // Update tweet list
//     renderResources(transformedData); // Update resource lists
//     updateMapWithResources(transformedData); // Update map
//     saveStateToSessionStorage(analysisData, transformedData); // Save state

//     Swal.fire({
//       title: "Success!",
//       text: "Latest NDRF tweets fetched and analyzed.",
//       icon: "success",
//       timer: 2000,
//       showConfirmButton: false
//     });
//   } catch (err) {
//     console.error("Error fetching or analyzing tweets:", err);
//     Swal.fire({
//       title: "Error",
//       text: `Failed to fetch NDRF tweets: ${err.message}`,
//       icon: "error"
//     });
//   } finally {
//     fetchButton.disabled = false;
//     fetchButton.textContent = "Fetch Latest NDRF Tweets";
//     if (fetchAnimation) fetchAnimation.destroy(); // Clean up animation
//     if (fetchLoader) fetchLoader.style.display = "none";
//     if (defaultLoader) defaultLoader.style.display = "block";
//   }
// }

// // Add event listener for the fetch button
// document.getElementById("fetch-tweets-btn").addEventListener("click", fetchTweetsAndAnalyze);

// /******************************************************************
//  * 3. HELPER UTILITIES                                            *
//  ******************************************************************/

// /**
//  * Geocode via Nominatim (cached)
//  */
// async function getLatLng(location) {
//   if (locationCoords[location]) return locationCoords[location];
//   try {
//     const res = await fetch(
//       `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
//     );
//     const data = await res.json();
//     if (data.length) {
//       const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
//       locationCoords[location] = coords;
//       return coords;
//     }
//   } catch (err) {
//     console.error("Geocode failed:", err);
//   }
//   return null;
// }

// // Haversine distance in km
// function haversineDistance([lat1, lon1], [lat2, lon2]) {
//   const R = 6371;
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos((lat1 * Math.PI) / 180) *
//       Math.cos((lat2 * Math.PI) / 180) *
//       Math.sin(dLon / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// /**
//  * Extract name & quantity from a raw entity chunk like
//  * "of ORS packets", "of rice 50 kg", "of clean drinking water"
//  */
// function extractItemDetails(entity) {
//   const quantityMatch = entity.match(/(\d+(?:\.\d+)?\s*\w*)/);
//   if (quantityMatch) {
//     const quantity = quantityMatch[0].trim();
//     const name = entity
//       .replace(quantity, "")
//       .replace(/^of\s+/i, "")
//       .trim();
//     return { name, quantity };
//   }
//   return {
//     name: entity.trim().replace(/^of\s+/i, ""),
//     quantity: "Quantity not mentioned"
//   };
// }

// /**
//  * Helper to get individual cleaned entity names from the combined string.
//  */
// function splitEntityNames(entitiesString) {
//   return entitiesString
//     .split(",")
//     .map(e => extractItemDetails(e).name.toLowerCase())
//     .filter(Boolean);
// }

// /**
//  * Flexible name-match:
//  * - exact substring check (A in B or B in A)
//  * - ignores plurals like "packet(s)", "kit(s)", generic words (stopwords)
//  */
// const GENERIC_WORDS = [
//   "kg",
//   "pack",
//   "packs",
//   "packet",
//   "packets",
//   "bottle",
//   "bottles",
//   "unit",
//   "units",
//   "piece",
//   "pieces",
//   "kit",
//   "kits",
//   "bag",
//   "bags"
// ];

// function cleanNameForMatch(name) {
//   return name
//     .split(/[^a-z0-9]+/i)
//     .filter(w => w && !GENERIC_WORDS.includes(w))
//     .join(" ");
// }

// function namesMatch(nameA, nameB) {
//   const a = cleanNameForMatch(nameA.toLowerCase());
//   const b = cleanNameForMatch(nameB.toLowerCase());

//   if (!a || !b) return false;
//   return a.includes(b) || b.includes(a);
// }

// /******************************************************************
//  * 4. RENDERING                                                   *
//  ******************************************************************/

// function createResourceGroup(location, entities, type, tweet = "") {
//   const group = document.createElement("div");
//   group.className = "resource-group";

//   group.innerHTML = `
//     <div class="resource-header"><span class="location">${location}</span></div>
//     <div class="tweet-inline">Tweet: ${tweet}</div>
//     <div class="resource-items"></div>
//   `;

//   const itemList = group.querySelector(".resource-items");

//   if (entities.trim()) {
//     const items = entities.split(",").map(e => e.trim()).filter(Boolean);
//     items.forEach((raw) => {
//       const { name, quantity } = extractItemDetails(raw);
//       itemList.insertAdjacentHTML(
//         "beforeend",
//         `
//         <div class="resource-item">
//           <span>${name}</span>
//           <span>${quantity}</span>
//           <button class="match-btn" data-type="${type}" data-location="${location}" data-resource="${name}">See nearest match</button>
//         </div>`
//       );
//     });
//   } else {
//     itemList.innerHTML = '<div class="no-items">No items listed</div>';
//   }

//   return group;
// }

// function renderResources(data) {
//   const needList = document.getElementById("need-list");
//   const availList = document.getElementById("available-list");
//   needList.innerHTML = availList.innerHTML = "";

//   let needed = false,
//     available = false;

//   data.forEach(entry => {
//     const block = createResourceGroup(
//       entry.location,
//       entry.entities,
//       entry.type,
//       entry.tweet
//     );

//     if (entry.type === "need") {
//       needList.appendChild(block);
//       needed = true;
//     } else {
//       availList.appendChild(block);
//       available = true;
//     }
//   });

//   if (!needed)
//     needList.innerHTML = '<div class="no-items">No needed resources</div>';
//   if (!available)
//     availList.innerHTML = '<div class="no-items">No available resources</div>';
// }

// function renderTweetList(tweetData) {
//   const tweetList = document.querySelector(".tweet-list");
//   tweetList.innerHTML = "";
//   tweetData.forEach(t => {
//     tweetList.insertAdjacentHTML(
//       "beforeend",
//       `<div class="tweet-card"><p class="tweet-text">${t.tweet}</p></div>`
//     );
//   });
// }

// /******************************************************************
//  * 5. MATCH-FINDING WITH BETTER NAME LOGIC                        *
//  ******************************************************************/

// document.addEventListener("click", async e => {
//   if (!e.target.classList.contains("match-btn")) return;

//   const btn = e.target;
//   const originType = btn.dataset.type; // need | available (clicked)
//   const originLoc = btn.dataset.location;
//   const originResource = btn.dataset.resource.toLowerCase();

//   const originCoords = await getLatLng(originLoc);
//   if (!originCoords) {
//     Swal.fire("Location Error", `Couldn't get coordinates for ${originLoc}`, "error");
//     return;
//   }

//   const targetType = originType === "need" ? "available" : "need";
//   let nearest = null,
//     minDist = Infinity;

//   for (const entry of allResources) {
//     if (entry.type !== targetType) continue;

//     // Does this entry offer/request a matching resource?
//     const candidateNames = splitEntityNames(entry.entities);
//     const isMatch = candidateNames.some(n => namesMatch(originResource, n));
//     if (!isMatch) continue;

//     const destCoords = await getLatLng(entry.location);
//     if (!destCoords) continue;

//     const dist = haversineDistance(originCoords, destCoords);
//     if (dist < minDist) {
//       minDist = dist;
//       nearest = entry;
//     }
//   }

//   if (nearest) {
//     Swal.fire({
//       title: "Match Found!",
//       html: `<b>From:</b> ${originLoc}<br>
//              <b>Nearest ${targetType} location:</b> ${nearest.location}<br>
//              <b>Distance:</b> ${minDist.toFixed(2)} km<br>
//              <b>Resources:</b> ${nearest.entities}`,
//       icon: "success"
//     });
//   } else {
//     Swal.fire(
//       "No Match",
//       `No nearby ${targetType} found for ${originResource}`,
//       "info"
//     );
//   }
// });

// /******************************************************************
//  * 6. MAP UPDATE (Depends on map.js)                              *
//  ******************************************************************/

// /**
//  * Update the map with the latest resources.
//  * Calls the global updateMap function defined in map.js.
//  */
// function updateMapWithResources(resources) {
//   if (typeof window.updateMap === "function") {
//     window.updateMap(resources);
//   } else {
//     console.error("updateMap function not found. Ensure map.js is loaded correctly.");
//   }
// }