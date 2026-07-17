require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching products to apply native Unsplash Focal Crops...');
    const { data: products, error } = await supabase.from('product_summary').select('id, name, primary_image');

    if (error || !products) {
        console.error('Fetch error:', error);
        process.exit(1);
    }

    // Clear existing product images
    console.log('Wiping CSS and Mockup galleries...');
    await supabase.from('product_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const inserts = [];

    for (const p of products) {
        // Determine the base image. If the image ends with query parameters, strip them off
        // so we can append our robust focal crop parameters without syntactical collision.
        let baseRaw = p.primary_image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff';
        if (baseRaw.includes('?')) {
            baseRaw = baseRaw.split('?')[0];
        }

        // Original Product Wide Angle
        inserts.push({
            product_id: p.id,
            url: `${baseRaw}?auto=format&fit=crop&q=80&w=800`,
            alt_text: `${p.name} - Front View`,
            is_primary: true,
            sort_order: 1
        });

        // We utilize Unsplash's native Crop (fit=crop) alongside Focal Point (fp-x, fp-y) and Zoom (fp-z)
        // to dynamically manipulate the actual server response, generating completely unique realistic "macro" details!
        const macroViews = [
            { suffix: '&fit=crop&crop=focalpoint&fp-x=0.2&fp-y=0.4&fp-z=2', label: 'Detail View 1' },
            { suffix: '&fit=crop&crop=focalpoint&fp-x=0.8&fp-y=0.7&fp-z=2', label: 'Detail View 2' },
            { suffix: '&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.5&fp-z=3', label: 'Macro Texture Shot' }
        ];

        macroViews.forEach((macro, idx) => {
            inserts.push({
                product_id: p.id,
                url: `${baseRaw}?auto=format&q=80&w=800${macro.suffix}`,
                alt_text: `${p.name} - ${macro.label}`,
                is_primary: false,
                sort_order: idx + 2
            });
        });
    }

    const { error: insertError } = await supabase.from('product_images').insert(inserts);

    if (insertError) {
        console.error('Error inserting Unsplash Focal Crops:', insertError);
    } else {
        console.log(`Successfully mapped ${inserts.length} beautiful Unsplash Macro Crops across all products!`);
    }
}

run();
