const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL || 'http://localhost:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

const TAXONOMY = [
    {
        name: 'Mobiles, Tablets & Wearables', slug: 'mobiles-wearables', icon: '📱',
        items: ['Smartphone', 'Pro Tablet', 'Smartwatch', 'Fitness Tracker', 'Power Bank', 'Wireless Charger'],
        brands: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Garmin']
    },
    {
        name: 'Computers & Laptops', slug: 'computers-laptops', icon: '💻',
        items: ['Gaming Laptop', 'Ultrabook', 'Desktop PC', 'Mechanical Keyboard', 'Wireless Mouse', 'Curved Monitor'],
        brands: ['Dell', 'HP', 'Asus', 'Lenovo', 'Logitech', 'Corsair']
    },
    {
        name: 'TV & Home Entertainment', slug: 'tv-audio', icon: '📺',
        items: ['4K OLED TV', 'Soundbar System', 'Smart Speaker', 'Noise-Canceling Headphones', 'TWS Earbuds', 'Streaming Stick'],
        brands: ['Sony', 'LG', 'Bose', 'Sennheiser', 'JBL']
    },
    {
        name: 'Cameras & Photography', slug: 'cameras-photo', icon: '📸',
        items: ['Mirrorless Camera', 'DSLR Camera', 'Action Camera', 'Camera Drone', 'Zoom Lens', 'Ring Light Tripod'],
        brands: ['Canon', 'Nikon', 'GoPro', 'DJI', 'Sigma']
    },
    {
        name: 'Smart Home & Security', slug: 'smart-home', icon: '🏠',
        items: ['Security Camera', 'Video Doorbell', 'Smart Plug', 'Smart LED Bulb', 'Motion Sensor', 'Smart Lock'],
        brands: ['Ring', 'Nest', 'Philips Hue', 'Wyze', 'Arlo']
    },
    {
        name: 'Major Home Appliances', slug: 'major-appliances', icon: '❄️',
        items: ['Double-door Refrigerator', 'Front Load Washing Machine', 'Split Air Conditioner', 'Dishwasher', 'Microwave Oven'],
        brands: ['Whirlpool', 'LG', 'Samsung', 'Bosch', 'Haier']
    },
    {
        name: 'Kitchen Appliances', slug: 'kitchen-appliances', icon: '🍳',
        items: ['Air Fryer', 'Electric Kettle', 'Coffee Maker', 'Food Processor', 'Sandwich Maker', 'Induction Cooktop'],
        brands: ['Philips', 'Prestige', 'Morphy Richards', ' बजाज', 'Ninja']
    },
    {
        name: 'Personal Care Electronics', slug: 'personal-care-elec', icon: '💈',
        items: ['Hair Dryer', 'Beard Trimmer', 'Electric Toothbrush', 'Digital Weighing Scale', 'Hair Straightener'],
        brands: ['Braun', 'Philips', 'Oral-B', 'Wahl', 'Panasonic']
    },
    {
        name: 'Gaming & VR', slug: 'gaming-vr', icon: '🎮',
        items: ['PlayStation 5 Console', 'Xbox Series X', 'Nintendo Switch OLED', 'VR Headset', 'Gaming Steering Wheel', 'Console Charging Dock'],
        brands: ['Sony', 'Microsoft', 'Nintendo', 'Meta', 'Thrustmaster']
    }
];

const IMAGES = [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90',
    'https://images.unsplash.com/photo-1627384113743-6bd5a479fffd',
    'https://images.unsplash.com/photo-1491472253230-a044054ca35f'
];

async function run() {
    console.log('--- Phase 1: Establishing Parent "Electronics" Category ---');
    let { data: rootCat } = await supabase.from('categories').select('id').eq('slug', 'electronics').single();

    if (!rootCat) {
        const { data: newRoot } = await supabase.from('categories').insert({
            name: 'Electronics', slug: 'electronics', icon: '💻', is_active: true
        }).select().single();
        rootCat = newRoot;
    }

    let catMap = {}, brandMap = {};

    console.log('--- Phase 2: Seeding 9-Tier Sub-Categories & Brands ---');
    for (const t of TAXONOMY) {
        const { data: subCat } = await supabase.from('categories').upsert({
            name: t.name, slug: t.slug, icon: t.icon, parent_id: rootCat.id, is_active: true
        }, { onConflict: 'slug' }).select().single();
        if (subCat) catMap[t.slug] = subCat.id;

        for (const b of t.brands) {
            const bslug = b.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const { data: brand } = await supabase.from('brands').upsert({
                name: b, slug: bslug, is_active: true
            }, { onConflict: 'slug' }).select().single();
            if (brand) brandMap[b] = brand.id;
        }
    }

    console.log('--- Phase 3: Generating Product Data Matrix ---');
    const products = [];
    const prefixes = ['Premium', 'Advanced', 'Ultra', 'Smart', 'Next-Gen', 'Elite'];

    for (const t of TAXONOMY) {
        // Generate ~10 products per sub-category
        for (let i = 0; i < 10; i++) {
            const brand = t.brands[Math.floor(Math.random() * t.brands.length)];
            const itemProfile = t.items[Math.floor(Math.random() * t.items.length)];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];

            const name = `${brand} ${prefix} ${itemProfile} V${i + 1}`;
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + crypto.randomBytes(2).toString('hex');
            const price = Math.floor(Math.random() * 80000) + 999;

            products.push({
                name, slug, category_slug: t.slug, brand_name: brand,
                description: `Experience the pinnacle of electronic engineering with the ${name}. Fully equipped with industry-leading technology, seamless integration, and unparalleled performance. Ships immediately.`,
                price, compare_price: Math.floor(price * 1.15),
                sku: 'ELEC-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
                image: IMAGES[Math.floor(Math.random() * IMAGES.length)]
            });
        }
    }

    // Dump to CSV
    const csvHeaders = 'Name,Slug,Category,Brand,Description,Price,Compare_Price,SKU,Image\n';
    const csvRows = products.map(p => `"${p.name}","${p.slug}","${p.category_slug}","${p.brand_name}","${p.description}",${p.price},${p.compare_price},"${p.sku}","${p.image}"`).join('\n');
    const csvPath = path.join(__dirname, 'electronics_taxonomy.csv');
    fs.writeFileSync(csvPath, csvHeaders + csvRows);
    console.log(`✅ Dynamically compiled ${products.length} structured electronic products to electronics_taxonomy.csv`);

    console.log('--- Phase 4: Executing Batch Supabase Seeding ---');
    let inserted = 0;
    for (const p of products) {
        const { data: prod, error } = await supabase.from('products').insert({
            name: p.name, slug: p.slug, description: p.description, short_desc: 'Available In Stock. Ships globally.',
            sku: p.sku, price: p.price, compare_price: p.compare_price,
            category_id: catMap[p.category_slug], brand_id: brandMap[p.brand_name],
            is_active: true, is_featured: Math.random() > 0.8
        }).select().single();

        if (error) {
            console.error('Error inserting', p.name, error.message);
            continue;
        }

        // Insert Image variations
        await supabase.from('product_images').insert({ product_id: prod.id, url: `${p.image}?auto=format&fit=crop&q=80&w=800`, is_primary: true, sort_order: 1 });
        await supabase.from('product_images').insert({ product_id: prod.id, url: `${p.image}?auto=format&fit=crop&q=80&w=800&crop=focalpoint&fp-x=0.5&fp-y=0.1&fp-z=2`, is_primary: false, sort_order: 2 });

        // Inventory - Guarantees "not out of stock" per user prompt
        await supabase.from('inventory').insert({ product_id: prod.id, quantity: 300 });

        inserted++;
    }

    console.log(`✅ Architecture execution complete! Seeded ${inserted} multi-tiered electronic products successfully!`);
}

run().catch(console.error);
