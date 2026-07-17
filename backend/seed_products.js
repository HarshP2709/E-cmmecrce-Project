const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
    try {
        console.log('Fetching dependencies...');

        // Get categories and brands
        const { data: categories } = await supabase.from('categories').select('id, slug');
        const { data: brands } = await supabase.from('brands').select('id, slug');

        const electronics = categories.find(c => c.slug === 'electronics') || categories[0];
        const fashion = categories.find(c => c.slug === 'fashion') || categories[0];
        const apple = brands.find(b => b.slug === 'apple') || brands[0];
        const nike = brands.find(b => b.slug === 'nike') || brands[0];

        console.log('Seeding products...');

        const products = [
            {
                name: 'iPhone 15 Pro Max',
                slug: 'iphone-15-pro-max',
                description: 'The ultimate iPhone featuring titanium design, A17 Pro chip, and a pro camera system.',
                short_desc: 'Titanium design and A17 Pro chip.',
                sku: 'IP15PM-256-NAT',
                price: 159900,
                compare_price: 169900,
                category_id: electronics.id,
                brand_id: apple.id,
                is_featured: true,
                is_active: true,
                tags: ['smartphone', 'apple', 'flagship']
            },
            {
                name: 'Nike Air Max 270',
                slug: 'nike-air-max-270',
                description: 'Legendary Air meets exceptional comfort in the Nike Air Max 270.',
                short_desc: 'Exceptional comfort lifestyle shoe.',
                sku: 'NK-AM270-BLK',
                price: 12995,
                compare_price: 14995,
                category_id: fashion.id,
                brand_id: nike.id,
                is_featured: true,
                is_active: true,
                tags: ['shoes', 'sneakers', 'nike']
            },
            {
                name: 'MacBook Pro 16" M3 Max',
                slug: 'macbook-pro-16-m3-max',
                description: 'Mind-blowing performance meets incredible battery life.',
                short_desc: 'M3 Max chip, 16-inch Retina display.',
                sku: 'MBP16-M3M-1TB',
                price: 349900,
                compare_price: 359900,
                category_id: electronics.id,
                brand_id: apple.id,
                is_featured: true,
                is_active: true,
                tags: ['laptop', 'apple', 'pro']
            }
        ];

        const images = [
            'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop'
        ];

        for (let i = 0; i < products.length; i++) {
            const prod = products[i];
            // Check if exists
            const { data: existing } = await supabase.from('products').select('id').eq('slug', prod.slug).maybeSingle();
            let productId;

            if (!existing) {
                const { data, error } = await supabase.from('products').insert(prod).select('id').single();
                if (error) throw error;
                productId = data.id;

                // Seed inventory
                await supabase.from('inventory').insert({ product_id: productId, quantity: 50 });

                // Seed primary image
                await supabase.from('product_images').insert({
                    product_id: productId,
                    url: images[i],
                    is_primary: true
                });

                console.log(`Inserted: ${prod.name}`);
            } else {
                console.log(`Skipped existing: ${prod.name}`);
            }
        }

        // Also fix the profile 403 error for cart/wishlist gracefully if it happens
        // Actually the 403 for cart/wishlist in network tab: 
        // They returned 500 when requested! I will check the logs!

        console.log('Seeding complete.');
    } catch (error) {
        console.error('Error during seeding:', error);
    }
}

seed();
