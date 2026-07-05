// src/data/studentsCache.js
// In-memory cache — survives navigation, resets on page refresh

let cache = null;

export function getCached() {
  return cache;
}

export function setCached(data) {
  cache = data;
}