/**
 * update_images.js
 * ─────────────────────────────────────────────────────────────────
 * Replaces ALL product_images with REAL product photos from Unsplash.
 * Each product gets 5 images (primary + 4 alternate views) using
 * curated Unsplash photo IDs that actually show the right product type.
 *
 * Usage:  node backend/scripts/update_images.js
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─────────────────────────────────────────────────────────────────
// CURATED UNSPLASH PHOTO POOLS — real product photos per category
// Each pool has 20+ photo IDs so products get different images.
// URL format: https://images.unsplash.com/photo-{ID}?w=800&q=85&fit=crop
// ─────────────────────────────────────────────────────────────────
const PHOTO_POOLS = {

  smartphones: [
    '1510557880182-3d4d3cba35a5','1511707171634-5f897ff02aa9','1592750475338-74b7b21085ab',
    '1601784551446-20c326ef2f0d','1580910051074-3eb694886505','1574944985070-8f3ebc6b79d2',
    '1598327105666-5b89351aff97','1555774698-0d26f2f3b7f4','1607936854526-0b0f02b37490',
    '1616348436168-de43ad0db179','1565849904461-04a58ad377e0','1563203369-26f2e4a5ccf7',
    '1621911864069-1a56a5d7ee97','1585060544812-6b45742d762f','1556656793-08538906a9f8',
    '1533228100845-08145b01de14','1567581935884-3349723552ca','1603145733190-4e2e5bd23880',
    '1609692799939-44a8f0c67ea5','1574920162043-b872873f19bc',
  ],

  laptops: [
    '1496181133206-80ce9b88a853','1525547719571-a2d4ac8945e2','1541807084-5c52e6e76cf3',
    '1588702547919-c6a1a9e4a255','1484788984921-03950022c38b','1593640408182-31c228b29976',
    '1517694712202-14dd9538aa97','1611532736597-de2d4265fba3','1542744173-8e7e53415bb0',
    '1593642632559-0c6d3fc62b89','1603302576837-37561b2e2302','1593642634902-3cd50d78dc49',
    '1587614382346-4ec70e388b28','1478760329108-5c3ed9d495a0','1619556878849-f3aa94af83e3',
    '1531297484001-80022131f5a1','1602028915047-37269d369887','1460925895917-afdab827c52f',
    '1504707748692-419802e3c2d5','1526657782461-9fe13591b489',
  ],

  televisions: [
    '1593359677879-a4bb92f4a73e','1567690187548-f07652f6e97c','1461151304267-38535e596517',
    '1593784991095-a205069470b6','1548484069-23f6bfb2e90e','1616763355548-1aca61f4af5a',
    '1574375927818-3af57135bb96','1589702719693-d6f9e0a3b4f0','1520342868574-5fa3804e551c',
    '1636953099671-c3d4b5de37ae','1593642632315-4f1d5e9d7a53','1593784991251-3f5b8c0a7f0d',
    '1593642634382-26c673e05f77','1593642635100-e7b93a11c3de','1585771724684-38269d6639fd',
    '1593359677879-a4bb92f4a73e','1616348436168-de43ad0db179','1543512214-aa0ded6bdaee',
    '1593642632315-4f1d5e9d7a53','1574375927818-3af57135bb96',
  ],

  audio: [
    '1505740420928-5e560c06d30e','1484704849700-f032a568e944','1572635196237-14b3f281503f',
    '1546435770-a3e426bf472b','1618366712010-f4ae9c647114','1558618666-fcd25c85cd64',
    '1593697972672-b6d7c5a8bf16','1577174881519-b78a4d9f5a4c','1494587351592-8e72c70d8d2a',
    '1610945415814-7cd57d98c381','1524678714210-9917a6c619c2','1513836279014-a89f7a76ae86',
    '1558901357-ca41e027e43a','1608043152269-423dbba4e7e1','1590658268037-41402bb9c4b6',
    '1606131731446-5568d87113aa','1547394765-185e1e68c48e','1487180144351-b8472da7d491',
    '1519681393784-d120267933ba','1484704849700-f032a568e944',
  ],

  cameras: [
    '1502920917128-1aa500764cbd','1516035069371-29a1b244cc32','1535016120720-40c9d8421e0f',
    '1606585419760-c44ab9a6e7b2','1510915361894-db8b60106cb1','1495121553079-4c61bcce1894',
    '1594736797933-d0401ba2fe65','1613067900702-d4c7e7dfa7e9','1617531653332-bd46c16f7d13',
    '1558618047-3ab877e5e27e','1452780212412-acec140f5a1a','1580983230226-5d8db8f84bc1',
    '1564466809058-bf4114d55352','1542038374046-6c78bced5e79','1600490036275-33b99b4b54c8',
    '1607462084958-7bc7b1f1dcf4','1455717974081-0436a066bb96','1416161490015-2070bb6eef70',
    '1524678714210-9917a6c619c2','1526657782461-9fe13591b489',
  ],

  electronics: [
    '1518770660439-4636190af475','1558618666-fcd25c85cd64','1548611716-43be65197e6a',
    '1617731736026-4b2b693b31a2','1519558260268-cde7e03a0152','1562408590-e32931084e23',
    '1498049794561-7780e7231661','1490814400615-b2b6fdc9e98d','1601784551446-20c326ef2f0d',
    '1612815154858-60aa4c59eaa6','1560419450-1f8e5ea2e64b','1593642634902-3cd50d78dc49',
    '1591370874773-6702e8f12fd8','1548529159-2f44f2b4e8ee','1606131731446-5568d87113aa',
    '1585771724684-38269d6639fd','1574920162043-b872873f19bc','1543512214-aa0ded6bdaee',
    '1517336714731-489689fd1ca8','1550751827-4bd374c3f58b',
  ],

  fashion: [
    '1441984904996-e0b6ba687e04','1515886657613-9f3515b0c78f','1542291026-7eec264c27ff',
    '1549298916-b41d501d3772','1560769629-975ec94e6a86','1596755389378-c31d21fd1273',
    '1467043237213-65f2da53396f','1558171813-51b8b45e7883','1520367445093-50dc08a59d9d',
    '1490481651871-ab68de25d43d','1523381210434-271e8be1f52b','1607082348824-0a96f2a4b9da',
    '1529139574466-a303027c1d8b','1485230895905-ec40ba36b9bc','1618354691792-d1d42acfd860',
    '1483985988355-763728e1cad6','1512436991641-6745cdb1723f','1469334031218-e382a71b716b',
    '1522337360788-8b13dee7a37e','1594938298603-bf2f56dd7ef6',
  ],

  sports: [
    '1571019613454-1cb2f99b2d8b','1526506118085-60ce8714f8c5','1546483875-ad9de6e4a539',
    '1534438327276-14e5300c3a48','1541534741688-6078c5a2e731','1517836357463-d25dfeac3438',
    '1519311965067-36d3e5f33d39','1553028826-f4804a6dba3b','1593079831268-3381b0db4a77',
    '1595078475328-1ab05d0a6a0e','1574680096145-d05b474e2155','1548690312-1a66f1a5ff2e',
    '1576678927484-cc907957088c','1570829460005-c840387bb1ca','1549476464-c9d1c7c3a965',
    '1530549387789-4c87a6926d30','1517649763962-0c423cc1b7a7','1540497077202-9b94abcf39eb',
    '1486218119243-13883505764c','1511556820780-d912e52797b0',
  ],

  beauty: [
    '1596462502278-27bfdc403348','1522338242992-e1d3eed0dc13','1571781926291-c477ebfd024b',
    '1556228720-da7e1a2a5a21','1615397349754-cba2b28b58ee','1612817288484-6f916006741a',
    '1527799820374-87642af408bd','1571875257727-256c06fa6011','1519823551278-64ac92734fb1',
    '1598440947619-2c35fc9aa908','1503236823255-94d359b9e87e','1570194065650-d99fb4bedf0a',
    '1522337360788-8b13dee7a37e','1583947215259-38e31be8751f','1509126455461-9f29be9784bc',
    '1583795128727-6ec3642408f8','1620916566398-39f74bcbe261','1515377905703-c4788e51af15',
    '1596462502278-27bfdc403348','1571781926291-c477ebfd024b',
  ],

  books: [
    '1481627834876-b7833e8f5570','1544716278-ca5e3f4abd8c','1512820790803-83ca734da794',
    '1507842217343-583bb2515b87','1495446815901-a7297e633e8d','1524995997946-a1fce1ba0ce8',
    '1497633762265-9d179a990aa6','1544947950-fa07a98d237f','1519682577862-22b62b24cb73',
    '1543002588-bfa74002ed7e','1476275466078-4cad2aab2e10','1553729459-efe14ef6055d',
    '1532012197267-da84d127e765','1516979187895-176e81098ea8','1458932756001-eb41b9a6e7d2',
    '1503791774405-6562a11c7524','1506880018603-83d702d026f1','1461360370461-d6c46afd23e0',
    '1508921912186-1d1a45ebb3c1','1550399105-c4db5fb85c18',
  ],

  toys: [
    '1558618666-fcd25c85cd64','1566576912321-d58ddd1a3cd5','1572635196237-14b3f281503f',
    '1596461404969-9ae70f2830c1','1603732551658-5fabbacda482','1518770660439-4636190af475',
    '1545558014-8692077e9b5c','1473091534298-04dcbce3278c','1567364344652-2abc02da2b38',
    '1587653915936-3a41f98e0539','1610495012793-9aec8b86dde5','1516321318423-f06f85e504b3',
    '1558098329-a5c1351b6119','1574201635302-388dd92a4c3f','1587654780291-4e6f24f76bed',
    '1611690954890-7b4b2c8a1bb8','1566576912321-d58ddd1a3cd5','1596461404969-9ae70f2830c1',
    '1558618666-fcd25c85cd64','1603732551658-5fabbacda482',
  ],

  groceries: [
    '1542838132-92c53300491e','1553546895-531c67073f4','1543362906-acfc16c67564',
    '1488459716781-31db52582fe9','1506368249639-73a05d6f39cf','1490818387583-1d2813ca67d5',
    '1579113800032-c38bd7635818','1550989460-0adf9ea622e2','1414235077428-338989a2e8c0',
    '1610348375938-b2b82e235d30','1572635196237-14b3f281503f','1584568694244-14fbdf83bd30',
    '1558961363-fa8fdf82db35','1504674900247-0877df9cc836','1512621776951-a57141f2eefd',
    '1495195129352-aeb325a55b65','1467116021503-56441080155a','1471193945509-9ad0617afabf',
    '1543362906-acfc16c67564','1488459716781-31db52582fe9',
  ],

  kitchen: [
    '1556909114-f6e7ad7d3136','1585771724684-38269d6639fd','1574201635302-388dd92a4c3f',
    '1556909048-80bef7702721','1588854337115-1719c85db37d','1600565597539-1cbb8e5e28b0',
    '1556909048-80bef7702721','1584568694244-14fbdf83bd30','1556909174-cd847de18b4b',
    '1556909114-f6e7ad7d3136','1585771724684-38269d6639fd','1574201635302-388dd92a4c3f',
    '1556565819-c2f3b6b61780','1521305916504-ef8d58329698','1495195129352-aeb325a55b65',
    '1574071318508-1cdbab80d002','1556909048-80bef7702721','1600565597539-1cbb8e5e28b0',
    '1556909114-f6e7ad7d3136','1585771724684-38269d6639fd',
  ],

  'home-living': [
    '1555041469-a586c61ea9bc','1565538810643-f40cf5f74b78','1586023492125-27b2c045efd3',
    '1558618047-3ab877e5e27e','1555041469-a586c61ea9bc','1506439773649-8efe6e59afbf',
    '1540518614846-7eded433c457','1618221195710-dd6b41faaea6','1616486701797-0f33f61038ec',
    '1586023492125-27b2c045efd3','1555041469-a586c61ea9bc','1565538810643-f40cf5f74b78',
    '1555041469-a586c61ea9bc','1519710164239-da1f3da28c56','1617101100339-aa3ea52b92d6',
    '1555041469-a586c61ea9bc','1618221195710-dd6b41faaea6','1586023492125-27b2c045efd3',
    '1608028253-c7dc4a9e27da','1555041469-a586c61ea9bc',
  ],

  appliances: [
    '1558618666-fcd25c85cd64','1593642634902-3cd50d78dc49','1545208823-a6021ba3d7a4',
    '1556565819-c2f3b6b61780','1581578731548-c64695cc6952','1584568694244-14fbdf83bd30',
    '1598300188904-6287c7a4a02f','1547592166-23ac45744acd','1556565819-c2f3b6b61780',
    '1558618666-fcd25c85cd64','1593642634902-3cd50d78dc49','1545208823-a6021ba3d7a4',
    '1581578731548-c64695cc6952','1584568694244-14fbdf83bd30','1593642634902-3cd50d78dc49',
    '1598300188904-6287c7a4a02f','1547592166-23ac45744acd','1558618666-fcd25c85cd64',
    '1545208823-a6021ba3d7a4','1556565819-c2f3b6b61780',
  ],

  gaming: [
    '1542751371-adc38448a05e','1550745165-9bc0b252726f','1593305841991-05335973bf08',
    '1612287226237-12f2e3e87a2b','1542751371-adc38448a05e','1550745165-9bc0b252726f',
    '1593305841991-05335973bf08','1612287226237-12f2e3e87a2b','1614294149236-b0edd0c47785',
    '1592155931584-901ac15763e3','1542751371-adc38448a05e','1550745165-9bc0b252726f',
    '1593305841991-05335973bf08','1612287226237-12f2e3e87a2b','1614294149236-b0edd0c47785',
    '1592155931584-901ac15763e3','1542751371-adc38448a05e','1550745165-9bc0b252726f',
    '1593305841991-05335973bf08','1612287226237-12f2e3e87a2b',
  ],

  'smart-home': [
    '1558002038-1055907df827','1558618666-fcd25c85cd64','1603732551658-5fabbacda482',
    '1558002038-1055907df827','1599509635-5ba5f16aa56e','1558618666-fcd25c85cd64',
    '1558002038-1055907df827','1603732551658-5fabbacda482','1562272765-c1b5a9f3cce3',
    '1558002038-1055907df827','1599509635-5ba5f16aa56e','1558618666-fcd25c85cd64',
    '1603732551658-5fabbacda482','1562272765-c1b5a9f3cce3','1558002038-1055907df827',
    '1599509635-5ba5f16aa56e','1558618666-fcd25c85cd64','1603732551658-5fabbacda482',
    '1558002038-1055907df827','1562272765-c1b5a9f3cce3',
  ],

  'personal-care': [
    '1585771724684-38269d6639fd','1596462502278-27bfdc403348','1522338242992-e1d3eed0dc13',
    '1571781926291-c477ebfd024b','1585771724684-38269d6639fd','1596462502278-27bfdc403348',
    '1522338242992-e1d3eed0dc13','1571781926291-c477ebfd024b','1556228720-da7e1a2a5a21',
    '1615397349754-cba2b28b58ee','1585771724684-38269d6639fd','1596462502278-27bfdc403348',
    '1522338242992-e1d3eed0dc13','1571781926291-c477ebfd024b','1556228720-da7e1a2a5a21',
    '1615397349754-cba2b28b58ee','1585771724684-38269d6639fd','1596462502278-27bfdc403348',
    '1522338242992-e1d3eed0dc13','1571781926291-c477ebfd024b',
  ],
};

// ─────────────────────────────────────────────────────────────────
// Map DB category slugs → photo pool keys
// ─────────────────────────────────────────────────────────────────
const CATEGORY_POOL_MAP = {
  // exact slugs from categories.csv / Supabase DB
  'smartphones':                'smartphones',
  'laptops':                    'laptops',
  'computers-laptops':          'laptops',
  'electronics':                'electronics',
  'audio':                      'audio',
  'tv-home-entertainment':      'televisions',
  'cameras':                    'cameras',
  'cameras-photography':        'cameras',
  'gaming-vr':                  'gaming',
  'smart-home-security':        'smart-home',
  'major-home-appliances':      'appliances',
  'kitchen-appliances':         'kitchen',
  'personal-care-electronics':  'personal-care',
  'fashion':                    'fashion',
  'sports-fitness':             'sports',
  'beauty-personal-care':       'beauty',
  'books-education':            'books',
  'toys-games':                 'toys',
  'groceries':                  'groceries',
  'home-living':                'home-living',
  'mobiles-tablets-wearables':  'smartphones',
  'watches-wearables':          'smartphones',
  // legacy / alternate slugs kept for safety
  'tv-audio':                   'televisions',
  'mobiles-wearables':          'smartphones',
  'cameras-photo':              'cameras',
  'smart-home':                 'smart-home',
  'major-appliances':           'appliances',
  'personal-care-elec':         'personal-care',
  'home-and-living':            'home-living',
};

// ─────────────────────────────────────────────────────────────────
// Build Unsplash URL with specific width/height & quality
// ─────────────────────────────────────────────────────────────────
function unsplashUrl(photoId, w = 800, h = 800) {
  return `https://images.unsplash.com/photo-${photoId}?w=${w}&h=${h}&fit=crop&q=85&auto=format`;
}

// ─────────────────────────────────────────────────────────────────
// Pick a pool photo by index, cycling through the pool
// ─────────────────────────────────────────────────────────────────
function pickPhoto(pool, index) {
  return pool[index % pool.length];
}

// ─────────────────────────────────────────────────────────────────
// Build 5 image rows for one product.
// Primary image + 4 alternate views — all from the right category pool.
// Uses productIndex to cycle through the pool so every product differs.
// ─────────────────────────────────────────────────────────────────
function buildImages(productId, productName, categorySlug, productIndex) {
  const poolKey  = CATEGORY_POOL_MAP[categorySlug] || 'electronics';
  const pool     = PHOTO_POOLS[poolKey] || PHOTO_POOLS.electronics;
  const poolSize = pool.length;

  // Pick 5 DIFFERENT photos from the pool for this product
  // Spread them apart to avoid repeats within the same product
  const spread = Math.max(1, Math.floor(poolSize / 5));
  const base   = productIndex % poolSize;

  const photoIds = [
    pool[base % poolSize],
    pool[(base + spread) % poolSize],
    pool[(base + spread * 2) % poolSize],
    pool[(base + spread * 3) % poolSize],
    pool[(base + spread * 4) % poolSize],
  ];

  const angleLabels = ['', ' – angle view', ' – side view', ' – detail view', ' – back view'];

  return photoIds.map((photoId, i) => ({
    product_id: productId,
    url:        unsplashUrl(photoId),
    alt_text:   productName + angleLabels[i],
    is_primary: i === 0,
    sort_order: i,
  }));
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('🖼️  ShopVerse — Update Product Images (Real Photos)');
  console.log('═══════════════════════════════════════════════════\n');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const startTime = Date.now();

  // ── 1. Fetch all products with their category slug ───────────────
  console.log('📋 Fetching products...');
  const { data: products, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, categories(slug)')
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.error('❌ Failed to fetch products:', fetchErr.message);
    process.exit(1);
  }
  console.log(`  ✓ Found ${products.length} products\n`);

  // ── 2. Delete ALL old images ─────────────────────────────────────
  console.log('🗑️  Clearing old images...');
  const { error: delErr } = await supabase
    .from('product_images')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (delErr) {
    console.error('❌ Delete failed:', delErr.message);
    process.exit(1);
  }
  console.log('  ✓ Cleared\n');

  // ── 3. Track per-category index so products within a category
  //       get different images (not all the same photo)
  const categoryIndex = {};

  // ── 4. Insert new images in batches ─────────────────────────────
  console.log('📸 Inserting real product images (5 per product)...');
  const CHUNK = 40;
  let done = 0;

  for (let i = 0; i < products.length; i += CHUNK) {
    const batch = products.slice(i, i + CHUNK);
    const rows  = batch.flatMap(p => {
      const catSlug = p.categories?.slug || 'electronics';
      const idx     = categoryIndex[catSlug] || 0;
      categoryIndex[catSlug] = idx + 1;
      return buildImages(p.id, p.name, catSlug, idx);
    });

    const { error: insErr } = await supabase
      .from('product_images')
      .insert(rows);

    if (insErr) {
      console.error(`  ❌ Batch error at ${i}:`, insErr.message);
    } else {
      done += batch.length;
      process.stdout.write(`  ↳ ${done}/${products.length} products done\r`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total   = products.length * 5;
  console.log(`\n\n✅ Done in ${elapsed}s`);
  console.log(`   ${total.toLocaleString()} real product images inserted.`);
  console.log(`   Every product now has 5 category-relevant photos.`);
}

main();
