require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching products to apply text-only detailed HTML...');
  const { data: products, error } = await supabase.from('products').select('id, name, slug, category_id, categories(name)');

  if (error || !products) {
    console.error('Fetch error:', error);
    process.exit(1);
  }

  const updates = [];

  for (const product of products) {
    const catName = (product.categories?.name || '').toLowerCase();

    // Generate beautiful text-only detailed HTML.
    let enrichedHtml = `
      <div style="font-family: inherit; color: var(--text-secondary); line-height: 1.8;">
        <!-- Intro / Basic Info -->
        <div style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1rem;">Product Overview</h2>
          <p style="font-size: 1.05rem;">
            The <strong>${product.name}</strong> is meticulously crafted to deliver an uncompromised experience. Designed with premium materials and engineered for everyday excellence, it effortlessly bridges the gap between sophisticated aesthetics and unparalleled utility. Whether you are upgrading your lifestyle or seeking reliable performance, this product caters to all baseline requirements out-of-the-box.
          </p>
        </div>

        <!-- Advanced Features -->
        <div style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1rem;">Advanced Capabilities</h2>
          <p style="margin-bottom: 1.2rem;">Beyond the surface, the ${product.name} harnesses advanced manufacturing processes that elevate it above standard tier offerings. We rely on industry-standard testing pipelines and sustainable engineering strategies to produce a flagship offering that strictly conforms to modern luxury and technological standards.</p>
          <ul style="list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem;">
             <li><strong>Precision Engineering:</strong> Every structural curve is optimized for aerodynamic efficiency and tactile satisfaction.</li>
             <li><strong>Intelligent Sourcing:</strong> Constructed from hand-picked, conflict-free raw materials that guarantee longevity.</li>
             <li><strong>Seamless Integration:</strong> Pairs flawlessly with your existing workflows, offering comprehensive metrics and ultra-responsive manipulation.</li>
             <li><strong>Thermal & Stress Resilience:</strong> rigorously stress-tested in extreme environments to ensure peak stability under heavy loads.</li>
          </ul>
        </div>

        <!-- Additional Specifications & Warranty -->
        <div style="margin-bottom: 1rem;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1rem;">Comprehensive Information</h2>
          <p style="margin-bottom: 1.5rem;">To guarantee peace of mind, all retail units ship with our comprehensive international coverage program. Out of the factory line, each unit is individually calibrated, sanitized, and meticulously packed by our specialists.</p>
          <p><em>Please note: Continuous usage guidelines and care instructions are provided intimately within the physical documentation included in the packaging.</em></p>
        </div>
      </div>
    `.trim();

    // Fire the update request for each product
    const { error: updateError } = await supabase
      .from('products')
      .update({ description: enrichedHtml })
      .eq('id', product.id);

    if (updateError) {
      console.error(`Failed to update ${product.name}:`, updateError);
    } else {
      console.log(`Enriched text (no images) for: ${product.name}`);
    }
  }

  console.log(`Successfully mapped advanced text formatting to ${products.length} products!`);
}

run();
