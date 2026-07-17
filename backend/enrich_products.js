require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching all products to enrich descriptions and specs...');
    const { data: products, error } = await supabase.from('products').select('id, name, slug, category_id, categories(name)');

    if (error || !products) {
        console.error('Fetch error:', error);
        process.exit(1);
    }

    const updates = [];

    for (const product of products) {
        const catName = product.categories?.name?.toLowerCase() || '';
        let enrichedDesc = `${product.name} is meticulously crafted to deliver an uncompromised experience. Whether you're looking for performance, durability, or stunning aesthetics, this product sets a new standard.\n\nDesigned with premium materials and cutting-edge technology, it seamlessly integrates into your daily lifestyle. Every detail has been optimized for maximum efficiency, ensuring that you get the best value without sacrificing quality.\n\nKey Highlights:\n- Engineered for long-lasting reliability.\n- Premium finish with attention to detail.\n- Backed by our comprehensive warranty program.`;

        let specs = {
            "Model Name": product.name,
            "Condition": "Brand New",
            "Warranty": "1 Year Manufacturer Warranty",
            "Box Contents": "Main Product, User Manual, Warranty Card"
        };

        if (catName.includes('electronic') || catName.includes('tech') || catName.includes('audio')) {
            enrichedDesc += `\n\nEquipped with state-of-the-art processors and next-generation connectivity, this device is built to handle everything from intense workloads to seamless entertainment.`;
            specs["Power Supply"] = "AC 100-240V, 50/60Hz";
            specs["Connectivity"] = "Bluetooth 5.0, Wi-Fi 6";
            specs["Material"] = "Aerospace-grade Aluminum / Recycled Polycarbonate";
        } else if (catName.includes('fashion') || catName.includes('cloth') || catName.includes('shoes')) {
            enrichedDesc += `\n\nExperience all-day comfort with breathable fabrics and an ergonomic fit. Tailored to perfection, it effortlessly blends modern fashion trends with timeless utility.`;
            specs["Material"] = "100% Premium Cotton / Sustainable Synthetics";
            specs["Care Instructions"] = "Machine wash cold, tumble dry low";
            specs["Fit"] = "Regular / True to size";
            specs["Origin"] = "Imported";
        }

        // Prepare update payload
        const { error: updateError } = await supabase
            .from('products')
            .update({
                description: enrichedDesc,
                specifications: specs
            })
            .eq('id', product.id);

        if (updateError) {
            console.error(`Failed to update ${product.name}:`, updateError);
        } else {
            console.log(`Enriched: ${product.name}`);
        }
    }

    console.log(`Successfully enriched ${products.length} products!`);
}

run();
