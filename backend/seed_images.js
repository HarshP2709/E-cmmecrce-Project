require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching all products...');
    const { data: products, error } = await supabaseAdmin.from('products').select('id, name');
    if (error || !products) {
        console.error('Error fetching products:', error);
        process.exit(1);
    }

    console.log(`Found ${products.length} products. Proceeding to inject mock gallery photos...`);
    const inserts = [];

    for (const p of products) {
        // Generate 3 stable but distinct photos via Picsum using the product ID as a seed
        for (let i = 2; i <= 4; i++) {
            inserts.push({
                product_id: p.id,
                url: `https://picsum.photos/seed/${p.id.slice(0, 8)}${i}/800/800`,
                alt_text: `${p.name} Alternate View ${i}`,
                is_primary: false,
                sort_order: i
            });
        }
    }

    const { error: insertError } = await supabaseAdmin.from('product_images').insert(inserts);

    if (insertError) {
        console.error('Error inserting mock photos:', insertError);
    } else {
        console.log(`Successfully injected ${inserts.length} image variations! Thumbnails should now populate on the frontend.`);
    }
}

run();
