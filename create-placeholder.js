/**
 * ShopVerse - Placeholder WebP Image
 * 
 * To create a real placeholder, run this script from the backend folder:
 * 
 * const sharp = require('sharp');
 * sharp({
 *   create: {
 *     width: 400, height: 400,
 *     channels: 4,
 *     background: { r: 248, g: 250, b: 255, alpha: 1 }
 *   }
 * })
 * .composite([{
 *   input: Buffer.from('<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#f8faff"/><text x="200" y="200" text-anchor="middle" dy=".3em" font-size="60" fill="#94a3b8">🛍️</text></svg>'),
 *   top: 0, left: 0
 * }])
 * .webp({ quality: 80 })
 * .toFile('../frontend/assets/images/placeholder.webp');
 */
