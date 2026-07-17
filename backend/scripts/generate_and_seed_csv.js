// generate_and_seed_csv.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL || 'http://localhost:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

const DEMO_CATEGORIES = [
    { name: 'Electronics', slug: 'electronics', icon: '💻', brands: ['Sony', 'Apple', 'Samsung', 'Dell'] },
    { name: 'Fashion', slug: 'fashion', icon: '👗', brands: ['Nike', 'Adidas', 'Puma', 'Zara'] },
    { name: 'Home & Living', slug: 'home-and-living', icon: '🛋️', brands: 'IKEA,Philips,Dyson,Bosch'.split(',') },
    { name: 'Sports & Fitness', slug: 'sports-fitness', icon: '⚽', brands: 'Under Armour,Wilson,Reebok,Yonex'.split(',') },
    { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', icon: '💄', brands: 'L\'Oréal,MAC,Nivea,Gillette'.split(',') },
    { name: 'Books & Education', slug: 'books-education', icon: '📚', brands: 'Penguin,Oxford,Pearson,Scholastic'.split(',') },
    { name: 'Toys & Games', slug: 'toys-games', icon: '🎮', brands: 'Lego,Mattel,Hasbro,Nintendo'.split(',') },
    { name: 'Groceries', slug: 'groceries', icon: '🛒', brands: 'Nestle,Unilever,Kraft,P&G'.split(',') }
];

const IMAGES = [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90',
    'https://images.unsplash.com/photo-1627384113743-6bd5a479fffd'
];

async function run() {
    console.log('--- Phase 1: Ensure Categories and Brands ---');
    let catMap = {}, brandMap = {};

    for (const c of DEMO_CATEGORIES) {
        const { data: cat } = await supabase.from('categories').upsert({
            name: c.name, slug: c.slug, icon: c.icon, is_active: true
        }, { onConflict: 'slug' }).select().single();
        if (cat) catMap[c.slug] = cat.id;

        for (const b of c.brands) {
            const bslug = b.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const { data: brand } = await supabase.from('brands').upsert({
                name: b, slug: bslug, is_active: true
            }, { onConflict: 'slug' }).select().single();
            if (brand) brandMap[b] = brand.id;
        }
    }

    console.log('--- Phase 2: Generating Dummy Product Data ---');
    const products = [];
    const adjs = ['Premium', 'Advanced', 'Ultra', 'Essential', 'Smart', 'Classic', 'Pro'];
    const nouns = ['Bundle', 'Pack', 'Kit', 'Edition', 'Set', 'Unit'];

    for (const c of DEMO_CATEGORIES) {
        for (let i = 0; i < 9; i++) { // ~72 products total (8 * 9)
            const brand = c.brands[i % c.brands.length];
            const adj = adjs[Math.floor(Math.random() * adjs.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            const name = `${brand} ${adj} ${c.name.split(' ')[0]} ${noun} ${i + 1}`;
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + crypto.randomBytes(2).toString('hex');
            const price = Math.floor(Math.random() * 9000) + 199;

            products.push({
                name, slug, category_slug: c.slug, brand_name: brand,
                description: `This is dummy data for ${name}. Includes premium features and excellent build quality out of the box.`,
                price, compare_price: Math.floor(price * 1.2),
                sku: 'SKU-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
                image: IMAGES[Math.floor(Math.random() * IMAGES.length)]
            });
        }
    }

    // Generate CSV File
    const csvHeaders = 'Name,Slug,Category,Brand,Description,Price,Compare_Price,SKU,Image\n';
    const csvRows = products.map(p => `"${p.name}","${p.slug}","${p.category_slug}","${p.brand_name}","${p.description}",${p.price},${p.compare_price},"${p.sku}","${p.image}"`).join('\n');
    const csvPath = path.join(__dirname, 'dummy_products.csv');
    fs.writeFileSync(csvPath, csvHeaders + csvRows);
    console.log('✅ Generated dummy_products.csv with 72 products!');

    console.log('--- Phase 3: Seeding Database from CSV (Simulated parser) ---');
    let inserted = 0;
    for (const p of products) {
        const { data: prod, error } = await supabase.from('products').insert({
            name: p.name, slug: p.slug, description: p.description, short_desc: 'Limited stock.',
            sku: p.sku, price: p.price, compare_price: p.compare_price,
            category_id: catMap[p.category_slug],
            brand_id: brandMap[p.brand_name],
            is_active: true, is_featured: Math.random() > 0.8
        }).select().single();

        if (error) {
            console.error('Error inserting', p.name, error.message);
            continue;
        }

        // Insert Image
        await supabase.from('product_images').insert({ product_id: prod.id, url: `${p.image}?auto=format&fit=crop&q=80&w=800`, is_primary: true, sort_order: 1 });

        // Default angles
        await supabase.from('product_images').insert({ product_id: prod.id, url: `${p.image}?auto=format&fit=crop&q=80&w=800&crop=focalpoint&fp-x=0.2&fp-z=2`, is_primary: false, sort_order: 2 });

        // Inventory
        await supabase.from('inventory').insert({ product_id: prod.id, quantity: 150 });

        inserted++;
    }

    console.log(`✅ Successfully parsed CSV and seeded ${inserted} products!`);
}

run().catch(console.error);
