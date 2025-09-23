// lemmyLoginAndAuthExample.js
// Usage: node lemmyLoginAndAuthExample.js
// Loads credentials from .env.local

const fetch = require("node-fetch");
require("dotenv").config({ path: ".env.local" });

const INSTANCE_URL = "https://lemmy.world";
const USERNAME = process.env.LEMMY_USERNAME;
const PASSWORD = process.env.LEMMY_PASSWORD;

// 1. Login to get JWT
async function loginLemmy(username, password) {
  const res = await fetch(`${INSTANCE_URL}/api/v3/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username_or_email: username,
      password,
    }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.jwt;
}

// 2. Make an authenticated API call
async function getMyUserDetails(jwt) {
  const res = await fetch(`${INSTANCE_URL}/api/v3/user/view`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`User fetch failed: ${res.status}`);
  return res.json();
}

// Example usage
(async () => {
  try {
    const jwt = await loginLemmy(USERNAME, PASSWORD);
    console.log("JWT token:", jwt);
    const userDetails = await getMyUserDetails(jwt);
    console.log("User details:", userDetails);
  } catch (err) {
    console.error("Error:", err);
  }
})();
