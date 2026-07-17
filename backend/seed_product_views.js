require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching products to apply exact duplicate imagery with CSS angle triggers...');
    const { data: products, error } = await supabase.from('product_summary').select('id, name, primary_image');

    if (error || !products) {
        console.error('Fetch error:', error);
        process.exit(1);
    }

    // Clear existing product images
    console.log('Wiping old category mockups...');
    await supabase.from('product_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const inserts = [];

    for (const p of products) {
        // 1st Image: The actual genuine product image
        const baseImageUrl = p.primary_image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff';

        // Some unsplash urls already have query parameters (e.g. ?auto=format)
        // We use a helper utility to securely append the visual trigger flags
        const appendFlag = (url, flag) => url.includes('?') ? `${url}&${flag}` : `${url}?${flag}`;

        inserts.push({
            product_id: p.id,
            url: baseImageUrl,
            alt_text: `${p.name} - Front View`,
            is_primary: true,
            sort_order: 1
        });

        inserts.push({
            product_id: p.id,
            url: appendFlag(baseImageUrl, 'view=left'),
            alt_text: `${p.name} - Opposite Side View`,
            is_primary: false,
            sort_order: 2
        });

        inserts.push({
            product_id: p.id,
            url: appendFlag(baseImageUrl, 'view=rotate'),
            alt_text: `${p.name} - Dynamic Angle`,
            is_primary: false,
            sort_order: 3
        });

        inserts.push({
            product_id: p.id,
            url: appendFlag(baseImageUrl, 'view=zoom'),
            alt_text: `${p.name} - Texture Close-up`,
            is_primary: false,
            sort_order: 4
        });
    }

    const { error: insertError } = await supabase.from('product_images').insert(inserts);

    if (insertError) {
        console.error('Error inserting identical view images:', insertError);
    } else {
        console.log(`Successfully mapped ${inserts.length} CSS-triggered genuine product thumbnails!`);
    }
}

run();
