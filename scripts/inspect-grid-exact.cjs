const fs = require('fs');
const { decode, encode } = require('./png.cjs');

const img = decode(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png'));

// Let's accurately find the grid by detecting the purple grid lines:
// The background grid is purple: rgb(215, 213, 237) or similar.
// Inside the character, the grid line overlay is drawn on top of the pixels!
// Notice that the grid lines in the editor are 1px semi-transparent lines!
// Let's find all vertical grid line x coordinates and horizontal grid line y coordinates.

console.log('--- FINDING GRID LINES IN USER CROP ---');
// Grid lines have a periodic pattern.
// Let's find the grid line positions:
// Let's look at the body outline at the bottom:
// The body outline is drawn by the user on the 32x32 canvas.
// The feet are at the bottom.
// In the 32x32 character:
// Standard body feet are at row 30 or 31.
// Let's inspect the entire canvas grid.
