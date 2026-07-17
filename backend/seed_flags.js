import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: products } = await supabase.from('products').select('id');
    if (!products || !products.length) return console.log('No products');

    for (let i = 0; i < products.length; i++) {
        const is_featured = Math.random() > 0.4;
        const is_new_arrival = Math.random() > 0.4;
        const is_best_seller = Math.random() > 0.4;
        const is_flash_sale = Math.random() > 0.7;

        await supabase.from('products').update({
            is_featured, is_new_arrival, is_best_seller, is_flash_sale
        }).eq('id', products[i].id);
    }
    console.log('Successfully assigned flags to', products.length, 'products');
}
run();
