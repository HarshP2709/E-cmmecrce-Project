/**
 * seed_from_csv.js
 * ─────────────────────────────────────────────────────────────────
 * Seeds the Supabase database with dummy data from CSV files.
 *
 * Usage:
 *   node backend/scripts/seed_from_csv.js
 *
 * Prerequisites:
 *   • SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env
 *   • All CSV files present in docs/data/
 *
 * What it does:
 *   1. Seeds categories from docs/data/categories.csv
 *   2. Seeds brands from docs/data/brands.csv
 *   3. Seeds products from each products_*.csv file
 *   4. Inserts inventory row for every product (quantity from CSV)
 *   5. Inserts 5 placeholder product images per product
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs   = require('fs');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ── Supabase client (service role — bypasses RLS) ──────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DATA_DIR = path.join(__dirname, '../../docs/data');

// ─────────────────────────────────────────────────────────────────
// CSV helpers
// ─────────────────────────────────────────────────────────────────

/** Parse a CSV file into an array of plain objects. */
async function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows    = [];
    let headers   = null;
    const rl      = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });

    rl.on('line', (line) => {
      if (!line.trim()) return;
      const fields = splitCsvLine(line);
      if (!headers) { headers = fields; return; }
      if (fields.length < headers.length) return;      // skip malformed
      const obj = {};
      headers.forEach((h, i) => { obj[h.trim()] = (fields[i] || '').trim(); });
      rows.push(obj);
    });

    rl.on('close',  () => resolve(rows));
    rl.on('error',  reject);
  });
}

/** Split a CSV line respecting double-quoted fields. */
function splitCsvLine(line) {
  const result  = [];
  let   current = '';
  let   inQ     = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { current += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function toBool(v)  { return String(v).toLowerCase() === 'true'; }
function toNum(v)   { const n = parseFloat(v); return isNaN(n) ? null : n; }
function toInt(v)   { const n = parseInt(v);   return isNaN(n) ? null : n; }

/** Parse JSON; return null on failure. */
function parseJson(v) {
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────
// Per-product placeholder image generator (5 images)
// Replaced with real Unsplash photos by update_images.js
// ─────────────────────────────────────────────────────────────────
function placeholderImages(slug, name) {
  const variants = ['', '-angle', '-side', '-detail', '-back'];
  return variants.map((sfx, i) => ({
    url:        `https://picsum.photos/seed/${encodeURIComponent(slug + sfx)}/800/800`,
    alt_text:   i === 0 ? name : `${name} – ${['angle view','side view','detail view','back view'][i-1]}`,
    is_primary: i === 0,
    sort_order: i,
  }));
}

// ─────────────────────────────────────────────────────────────────
// Step 1 — Seed all 22 categories
// Strategy: fetch what already exists, then INSERT only the missing ones.
// This avoids silent upsert failures caused by Supabase returning no
// error but also not inserting when the conflict resolution is ambiguous.
// ─────────────────────────────────────────────────────────────────
async function seedCategories() {
  console.log('\n📂 Seeding categories...');

  const csvRows = await parseCsv(path.join(DATA_DIR, 'categories.csv'));

  // ── Pass 1: root categories (no parent) ───────────────────────
  const rootCsvRows = csvRows.filter(r => !r.parent_id);

  // Fetch slugs already in DB
  const { data: existing, error: fetchErr } = await supabase
    .from('categories').select('id, slug, name');
  if (fetchErr) throw new Error('Cannot fetch categories: ' + fetchErr.message);

  const existingSlugs  = new Set((existing || []).map(c => c.slug));
  const slugToId       = {};
  (existing || []).forEach(c => { slugToId[c.slug] = c.id; });

  // INSERT missing root cats one-by-one so we get explicit errors
  let rootInserted = 0;
  for (const r of rootCsvRows) {
    if (existingSlugs.has(r.slug)) {
      // Already exists — update name/description in case they changed
      const { error } = await supabase
        .from('categories')
        .update({ name: r.name, description: r.description || null, icon: r.icon || null, sort_order: toInt(r.sort_order) || 0, is_active: true })
        .eq('slug', r.slug);
      if (error) console.warn(`  ⚠ update category "${r.slug}": ${error.message}`);
    } else {
      const { data: inserted, error } = await supabase
        .from('categories')
        .insert({ name: r.name, slug: r.slug, description: r.description || null, icon: r.icon || null, parent_id: null, is_active: true, sort_order: toInt(r.sort_order) || 0 })
        .select('id, slug')
        .single();
      if (error) {
        console.warn(`  ⚠ insert root category "${r.slug}": ${error.message}`);
      } else {
        slugToId[inserted.slug] = inserted.id;
        existingSlugs.add(inserted.slug);
        rootInserted++;
      }
    }
  }

  // Re-fetch after root pass to have fresh IDs
  const { data: afterRoot } = await supabase.from('categories').select('id, slug');
  (afterRoot || []).forEach(c => { slugToId[c.slug] = c.id; });

  // ── Build CSV short-id → slug map for resolving parent_id ─────
  const shortIdToSlug = {};
  csvRows.forEach(r => { shortIdToSlug[r.id] = r.slug; });

  // ── Pass 2: child categories ───────────────────────────────────
  const childCsvRows = csvRows.filter(r => r.parent_id);
  let childInserted  = 0;

  for (const r of childCsvRows) {
    const parentSlug = shortIdToSlug[r.parent_id];
    const parentId   = parentSlug ? slugToId[parentSlug] : null;

    if (existingSlugs.has(r.slug)) {
      const { error } = await supabase
        .from('categories')
        .update({ name: r.name, description: r.description || null, icon: r.icon || null, parent_id: parentId || null, sort_order: toInt(r.sort_order) || 0, is_active: true })
        .eq('slug', r.slug);
      if (error) console.warn(`  ⚠ update child category "${r.slug}": ${error.message}`);
    } else {
      const { data: inserted, error } = await supabase
        .from('categories')
        .insert({ name: r.name, slug: r.slug, description: r.description || null, icon: r.icon || null, parent_id: parentId || null, is_active: true, sort_order: toInt(r.sort_order) || 0 })
        .select('id, slug')
        .single();
      if (error) {
        console.warn(`  ⚠ insert child category "${r.slug}": ${error.message}`);
      } else {
        slugToId[inserted.slug] = inserted.id;
        existingSlugs.add(inserted.slug);
        childInserted++;
      }
    }
  }

  // Final count
  const { data: finalCats } = await supabase.from('categories').select('id, slug');
  console.log(`  ✓ Categories in DB: ${(finalCats || []).length} total (${rootInserted} root inserted, ${childInserted} children inserted)`);
}

// ─────────────────────────────────────────────────────────────────
// Step 2 — Seed brands
// ─────────────────────────────────────────────────────────────────
async function seedBrands() {
  console.log('\n🏷️  Seeding brands...');

  const csvRows = await parseCsv(path.join(DATA_DIR, 'brands.csv'));

  // Fetch existing brand slugs
  const { data: existing } = await supabase.from('brands').select('id, slug');
  const existingSlugs = new Set((existing || []).map(b => b.slug));

  let inserted = 0;
  let updated  = 0;

  for (const r of csvRows) {
    const record = {
      name:      r.name,
      slug:      r.slug,
      logo_url:  r.logo_url   || null,
      website:   r.website    || r.website_url || null,
      is_active: true,
    };

    if (existingSlugs.has(r.slug)) {
      const { error } = await supabase.from('brands').update(record).eq('slug', r.slug);
      if (error) console.warn(`  ⚠ update brand "${r.slug}": ${error.message}`);
      else updated++;
    } else {
      const { error } = await supabase.from('brands').insert(record);
      if (error) console.warn(`  ⚠ insert brand "${r.slug}": ${error.message}`);
      else inserted++;
    }
  }

  console.log(`  ✓ Brands: ${inserted} inserted, ${updated} updated`);
}

// ─────────────────────────────────────────────────────────────────
// Build slug→UUID lookup maps for categories and brands
// Maps CSV short-IDs (cat-01, br-10) → real Supabase UUIDs
// ─────────────────────────────────────────────────────────────────
async function buildMaps() {
  // CSV category short-id → slug (must match what's now in the DB after seedCategories)
  const CSV_CAT_SLUG_MAP = {
    'cat-01': 'tv-home-entertainment',
    'cat-02': 'computers-laptops',
    'cat-03': 'mobiles-tablets-wearables',
    'cat-04': 'personal-care-electronics',
    'cat-05': 'gaming-vr',
    'cat-06': 'kitchen-appliances',
    'cat-07': 'home-living',
    'cat-08': 'major-home-appliances',
    'cat-09': 'smart-home-security',
    'cat-10': 'cameras-photography',
    'cat-11': 'smartphones',
    'cat-12': 'electronics',
    'cat-13': 'laptops',
    'cat-14': 'fashion',
    'cat-15': 'audio',
    'cat-16': 'cameras',
    'cat-17': 'sports-fitness',
    'cat-18': 'beauty-personal-care',
    'cat-19': 'books-education',
    'cat-20': 'toys-games',
    'cat-21': 'groceries',
    'cat-22': 'watches-wearables',
  };

  // Fetch all categories and brands from DB
  const { data: cats,   error: cErr } = await supabase.from('categories').select('id, slug');
  const { data: brands, error: bErr } = await supabase.from('brands').select('id, slug');
  if (cErr) throw new Error('fetch categories: ' + cErr.message);
  if (bErr) throw new Error('fetch brands: '     + bErr.message);

  const catSlugToId   = {};
  const brandSlugToId = {};
  (cats   || []).forEach(c => { catSlugToId[c.slug]   = c.id; });
  (brands || []).forEach(b => { brandSlugToId[b.slug] = b.id; });

  // categoryMap: 'cat-01' → UUID
  const categoryMap = {};
  for (const [shortId, slug] of Object.entries(CSV_CAT_SLUG_MAP)) {
    if (catSlugToId[slug]) {
      categoryMap[shortId] = catSlugToId[slug];
    } else {
      console.warn(`  ⚠ Category slug not found in DB: "${slug}" (${shortId}) — products for this category will be skipped`);
    }
  }

  // brandMap: 'br-01' → UUID  (CSV uses br-XX IDs which match brands.csv)
  const brandCsvRows  = await parseCsv(path.join(DATA_DIR, 'brands.csv'));
  const brandMap      = {};
  for (const r of brandCsvRows) {
    if (brandSlugToId[r.slug]) {
      brandMap[r.id] = brandSlugToId[r.slug];
    }
  }

  return { categoryMap, brandMap };
}

// ─────────────────────────────────────────────────────────────────
// Step 3 — Seed products from a single CSV file
// ─────────────────────────────────────────────────────────────────
async function seedProductsFromFile(filePath, categoryMap, brandMap) {
  const rows     = await parseCsv(filePath);
  const fileName = path.basename(filePath);

  let inserted = 0;
  let skipped  = 0;
  const BATCH  = 20;   // process 20 at a time to stay well under Supabase limits

  for (let b = 0; b < rows.length; b += BATCH) {
    const batch = rows.slice(b, b + BATCH);

    for (const r of batch) {
      // ── Resolve IDs ─────────────────────────────────────────
      const catId   = categoryMap[r.category_id];
      const brandId = brandMap[r.brand_id];

      if (!catId) {
        skipped++;
        if (skipped <= 3) console.warn(`    ⚠ Unknown category_id "${r.category_id}" in ${fileName}`);
        if (skipped === 4) console.warn(`    ⚠ ... (further category warnings suppressed)`);
        continue;
      }
      if (!brandId) {
        skipped++;
        if (skipped <= 3) console.warn(`    ⚠ Unknown brand_id "${r.brand_id}" in ${fileName}`);
        continue;
      }

      // ── Parse tags & specifications ─────────────────────────
      let tags = [];
      if (r.tags) { try { tags = JSON.parse(r.tags); } catch { tags = r.tags.split(';').map(t => t.trim()).filter(Boolean); } }

      let specs = null;
      if (r.specifications) { try { specs = JSON.parse(r.specifications); } catch { specs = null; } }

      // ── Upsert product ──────────────────────────────────────
      const product = {
        sku:            r.sku            || null,
        name:           r.name,
        slug:           r.slug,
        category_id:    catId,
        brand_id:       brandId,
        price:          toNum(r.price),
        compare_price:  toNum(r.compare_price) || null,
        description:    r.description   || null,
        tags,
        specifications: specs,
        weight:         toNum(r.weight) || null,
        is_featured:    toBool(r.is_featured),
        is_best_seller: toBool(r.is_best_seller),
        is_new_arrival: toBool(r.is_new_arrival),
        is_flash_sale:  toBool(r.is_flash_sale),
        condition:      r.condition     || 'new',
        is_active:      true,
      };

      const { data: upserted, error: prodErr } = await supabase
        .from('products')
        .upsert(product, { onConflict: 'slug' })
        .select('id, slug')
        .single();

      if (prodErr) {
        skipped++;
        if (skipped <= 5) console.warn(`    ⚠ product upsert "${r.slug}": ${prodErr.message}`);
        continue;
      }

      const productId = upserted.id;

      // ── Upsert inventory ────────────────────────────────────
      const qty = toInt(r.stock) || 50;
      const { error: invErr } = await supabase
        .from('inventory')
        .upsert({ product_id: productId, quantity: qty, reserved_qty: 0 }, { onConflict: 'product_id' });
      if (invErr && invErr.code !== '23505') {
        console.warn(`    ⚠ inventory "${r.slug}": ${invErr.message}`);
      }

      // ── Insert 5 placeholder images (skip if already have images) ──
      const { count: imgCount } = await supabase
        .from('product_images')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (!imgCount || imgCount === 0) {
        const images = placeholderImages(r.slug, r.name).map(img => ({ ...img, product_id: productId }));
        const { error: imgErr } = await supabase.from('product_images').insert(images);
        if (imgErr) console.warn(`    ⚠ images "${r.slug}": ${imgErr.message}`);
      }

      inserted++;
    }

    // Progress indicator
    const done = Math.min(b + BATCH, rows.length);
    process.stdout.write(`  ↳ ${fileName}: ${done}/${rows.length}\r`);
  }

  process.stdout.write(`                                                                  \r`);
  console.log(`  ✓ ${fileName}: ${inserted} inserted/updated, ${skipped} skipped`);
}

// ─────────────────────────────────────────────────────────────────
// Step 4 — Seed all product CSV files
// ─────────────────────────────────────────────────────────────────
async function seedAllProducts(categoryMap, brandMap) {
  console.log('\n📦 Seeding products...');

  const productFiles = [
    'products_tv_home_entertainment.csv',
    'products_computers_laptops.csv',
    'products_mobiles_tablets_wearables.csv',
    'products_personal_care_electronics.csv',
    'products_gaming_vr.csv',
    'products_kitchen_appliances.csv',
    'products_home_living.csv',
    'products_major_home_appliances.csv',
    'products_smart_home_security.csv',
    'products_cameras_photography.csv',
    'products_smartphones.csv',
    'products_electronics.csv',
    'products_laptops.csv',
    'products_fashion.csv',
    'products_audio.csv',
    'products_sports_fitness.csv',
    'products_beauty_personal_care.csv',
    'products_books_education.csv',
    'products_toys_games.csv',
    'products_groceries.csv',
    'products_watches_wearables.csv',
  ];

  for (const fileName of productFiles) {
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ File not found, skipping: ${fileName}`);
      continue;
    }
    await seedProductsFromFile(filePath, categoryMap, brandMap);
  }
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 ShopVerse CSV Seed Script');
  console.log('════════════════════════════');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
    process.exit(1);
  }

  const t0 = Date.now();

  try {
    await seedCategories();
    await seedBrands();

    const { categoryMap, brandMap } = await buildMaps();

    const resolvedCats   = Object.keys(categoryMap).length;
    const resolvedBrands = Object.keys(brandMap).length;
    console.log(`\n  📋 ${resolvedCats}/22 category IDs resolved`);
    console.log(`  📋 ${resolvedBrands} brand IDs resolved`);

    if (resolvedCats < 22) {
      console.warn('\n  ⚠️  Some categories are still missing — their products will be skipped.');
      console.warn('     Check the warnings above for the failed category slugs.\n');
    }

    await seedAllProducts(categoryMap, brandMap);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n✅ Seed complete in ${elapsed}s`);
    console.log('   Run "node backend/scripts/update_images.js" next to attach real product photos.\n');
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  }
}

main();
