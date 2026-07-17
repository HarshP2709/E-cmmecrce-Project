require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching products to apply curated realistic multi-view galleries...');
    const { data: products, error } = await supabase.from('product_summary').select('id, name, slug, primary_image, categories(name)');

    if (error || !products) {
        console.error('Fetch error:', error);
        process.exit(1);
    }

    console.log('Clearing old mockups...');
    await supabase.from('product_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Hardcoded sets of highly realistic unspash IDs representing "alternate views" based on common categories.
    // We use direct Unsplash source links so they look ultra-premium and match the item.
    const gallerySets = {
        'shoes': [
            'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1605348532760-6753d2c43329?auto=format&fit=crop&q=80&w=800'
        ],
        'electronics': [
            'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=800'
        ],
        'fashion': [
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1434389673569-373cb7332000?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=800'
        ],
        'watches': [
            'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800'
        ],
        'audio': [
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&q=80&w=800'
        ],
        'default': [
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1505739998589-00ef19e489a8?auto=format&fit=crop&q=80&w=800'
        ]
    };

    const inserts = [];

    for (const p of products) {
        // 1st Image: The actual primary product image ensures the main view is EXACTLY what the user expects.
        inserts.push({
            product_id: p.id,
            url: p.primary_image || gallerySets['default'][0],
            alt_text: `${p.name} - Front View`,
            is_primary: true,
            sort_order: 1
        });

        const cat = (p.categories?.name || '').toLowerCase();
        const name = p.name.toLowerCase();

        let setKey = 'default';
        if (cat.includes('shoe') || cat.includes('sneaker') || name.includes('nike') || name.includes('shoe')) setKey = 'shoes';
        else if (cat.includes('watch') || name.includes('watch')) setKey = 'watches';
        else if (cat.includes('audio') || name.includes('headphone') || name.includes('airpods')) setKey = 'audio';
        else if (cat.includes('electronic') || name.includes('macbook') || name.includes('phone') || name.includes('laptop')) setKey = 'electronics';
        else if (cat.includes('fashion') || cat.includes('cloth') || name.includes('jacket') || name.includes('shirt')) setKey = 'fashion';

        const selectedSet = gallerySets[setKey];

        // Seed the alternate distinct views
        for (let i = 0; i < 4; i++) {
            // Ensure the alternate views aren't exactly copying the primary image back to back excessively
            // We use the curated set for the remaining slots.
            inserts.push({
                product_id: p.id,
                url: selectedSet[i],
                alt_text: `${p.name} - Alternate View ${i + 1}`,
                is_primary: false,
                sort_order: i + 2
            });
        }
    }

    const { error: insertError } = await supabase.from('product_images').insert(inserts);

    if (insertError) {
        console.error('Error inserting realistic galleries:', insertError);
    } else {
        console.log(`Successfully mapped ${inserts.length} hyper-realistic alternate product views across the database!`);
    }
}

run();
