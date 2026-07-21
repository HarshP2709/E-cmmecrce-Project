/**
 * seed_products_csv.js
 * ─────────────────────────────────────────────────────────────────
 * Seeds the Supabase database from docs/data/products.csv
 *
 * CSV columns expected:
 *   id, title, brand, category, price, description,
 *   images (JSON array of URL strings),
 *   specifications (JSON object),
 *   reviews (JSON array of review objects)
 *
 * Usage:
 *   node backend/scripts/seed_products_csv.js
 *
 * Prerequisites:
 *   • SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env
 *   • docs/data/products.csv present
 * ─────────────────────────────────────────────────────────────────
 */

const path     = require('path');
const fs       = require('fs');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CSV_PATH = path.join(__dirname, '../../docs/data/products.csv');

// ── Supabase admin client (bypasses RLS) ────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── CSV helpers ─────────────────────────────────────────────────

/** Parse a double-quoted CSV file into an array of plain objects. */
async function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows  = [];
    let headers = null;
    const rl    = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      if (!line.trim()) return;
      const fields = splitCsvLine(line);
      if (!headers) { headers = fields.map(h => h.trim()); return; }
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (fields[i] || '').trim(); });
      rows.push(obj);
    });

    rl.on('close', () => resolve(rows));
    rl.on('error', reject);
  });
}

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

function tryJson(str, fallback = null) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/** Slugify a string for use as a URL slug or DB slug. */
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ── Category & Brand helpers ────────────────────────────────────

/**
 * Look up a category by name — create it if it doesn't exist.
 * Returns the UUID of the category.
 */
async function getOrCreateCategory(name) {
  const slug = slugify(name);

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('categories')
    .insert({ name, slug, is_active: true, sort_order: 99 })
    .select('id')
    .single();

  if (error) throw new Error(`Cannot create category "${name}": ${error.message}`);
  return created.id;
}

/**
 * Look up a brand by name — create it if it doesn't exist.
 * Returns the UUID of the brand.
 */
async function getOrCreateBrand(name) {
  const slug = slugify(name);

  const { data: existing } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('brands')
    .insert({ name, slug, is_active: true })
    .select('id')
    .single();

  if (error) throw new Error(`Cannot create brand "${name}": ${error.message}`);
  return created.id;
}

// ── Main seed logic ─────────────────────────────────────────────
async function seedProducts() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const rows = await parseCsv(CSV_PATH);
  console.log(`\n📦 Found ${rows.length} products in products.csv\n`);

  let inserted = 0;
  let updated  = 0;
  let skipped  = 0;

  for (const r of rows) {
    const title    = (r.title || r.name || '').trim();
    const brand    = (r.brand || '').trim();
    const category = (r.category || '').trim();
    const price    = parseFloat(r.price) || 0;

    if (!title) { console.warn('  ⚠ Skipping row with no title'); skipped++; continue; }

    // ── Resolve / create category & brand UUIDs ─────────────────
    let categoryId = null;
    let brandId    = null;

    try {
      if (category) categoryId = await getOrCreateCategory(category);
      if (brand)    brandId    = await getOrCreateBrand(brand);
    } catch (e) {
      console.warn(`  ⚠ ${title}: ${e.message}`);
      skipped++;
      continue;
    }

    // ── Parse JSON fields ───────────────────────────────────────
    const images         = tryJson(r.images, []);        // array of URL strings
    const specifications = tryJson(r.specifications, {}); // key-value object
    const reviewsData    = tryJson(r.reviews, []);        // array of review objects

    // ── Build product slug ──────────────────────────────────────
    const slug = slugify(`${brand} ${title}`.substring(0, 80));

    // ── Upsert product ──────────────────────────────────────────
    const productRecord = {
      name:           title,
      slug,
      description:    r.description || null,
      price,
      category_id:    categoryId,
      brand_id:       brandId,
      specifications: Object.keys(specifications).length ? specifications : null,
      is_active:      true,
      is_featured:    false,
      is_best_seller: false,
      is_new_arrival: true,
      condition:      'new',
    };

    const { data: product, error: prodErr } = await supabase
      .from('products')
      .upsert(productRecord, { onConflict: 'slug' })
      .select('id')
      .single();

    if (prodErr) {
      console.warn(`  ⚠ Could not upsert "${title}": ${prodErr.message}`);
      skipped++;
      continue;
    }

    const productId = product.id;
    const isNew     = !!(await supabase.from('inventory').select('id', { head: true, count: 'exact' }).eq('product_id', productId)).count === 0;

    // ── Upsert inventory (default 50 units) ─────────────────────
    await supabase.from('inventory').upsert(
      { product_id: productId, quantity: 50, reserved_qty: 0 },
      { onConflict: 'product_id' }
    );

    // ── Upsert product images (replace if first seed) ───────────
    if (images.length) {
      // Delete old placeholder images so we get fresh real ones
      await supabase.from('product_images').delete().eq('product_id', productId);

      const imgRows = images.map((url, i) => ({
        product_id: productId,
        url,
        alt_text:   i === 0 ? title : `${title} – view ${i + 1}`,
        is_primary: i === 0,
        sort_order: i,
      }));

      const { error: imgErr } = await supabase.from('product_images').insert(imgRows);
      if (imgErr) console.warn(`  ⚠ images for "${title}": ${imgErr.message}`);
    }

    // ── Seed reviews (only if no reviews exist yet) ─────────────
    if (reviewsData.length) {
      const { count: revCount } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (!revCount || revCount === 0) {
        // Reviews need a real user_id — we use a system/anonymous approach:
        // fetch the admin user, or skip if none exists
        const { data: adminUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (adminUser) {
          const reviewRows = reviewsData.map(rv => ({
            product_id:  productId,
            user_id:     adminUser.id,
            rating:      parseInt(rv.rating) || 5,
            title:       rv.review_title || rv.title || 'Great product',
            body:        rv.comment || rv.body || '',
            is_verified: true,
            is_approved: true,
          }));

          const { error: revErr } = await supabase.from('reviews').insert(reviewRows);
          if (revErr && revErr.code !== '23505') {
            console.warn(`  ⚠ reviews for "${title}": ${revErr.message}`);
          }
        }
      }
    }

    console.log(`  ✓ ${title}`);
    isNew ? inserted++ : updated++;
  }

  console.log(`\n✅ Done — ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
  console.log('   Visit http://localhost:3000/pages/products.html to see your products.\n');
}

// ── Guard ────────────────────────────────────────────────────────
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

seedProducts().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
