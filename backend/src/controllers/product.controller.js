const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/products
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20, category, brand, min_price, max_price,
    rating, sort = 'created_at', order = 'desc', featured, best_seller,
    flash_sale, new_arrival, search,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin
    .from('product_summary')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (category) query = query.eq('category_slug', category);
  if (brand) query = query.eq('brand_id', brand);
  if (min_price) query = query.gte('price', parseFloat(min_price));
  if (max_price) query = query.lte('price', parseFloat(max_price));
  if (featured === 'true') query = query.eq('is_featured', true);
  if (best_seller === 'true') query = query.eq('is_best_seller', true);
  if (flash_sale === 'true') query = query.eq('is_flash_sale', true);
  if (new_arrival === 'true') query = query.eq('is_new_arrival', true);
  if (rating) query = query.gte('avg_rating', parseFloat(rating));
  if (search) query = query.ilike('name', `%${search}%`);

  const sortMap = {
    price_asc: ['price', { ascending: true }],
    price_desc: ['price', { ascending: false }],
    rating: ['avg_rating', { ascending: false }],
    newest: ['created_at', { ascending: false }],
    name: ['name', { ascending: true }],
  };

  if (sortMap[sort]) {
    query = query.order(sortMap[sort][0], sortMap[sort][1]);
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + parseInt(limit) - 1);

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500);

  res.json({
    success: true,
    data: data || [],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count || 0,
      pages: Math.ceil((count || 0) / parseInt(limit)),
    },
  });
});

// GET /api/v1/products/:slug
const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const { data: product, error } = await supabaseAdmin
    .from('product_summary')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !product) throw new AppError('Product not found.', 404);

  // Get all images
  const { data: images } = await supabaseAdmin
    .from('product_images')
    .select('*')
    .eq('product_id', product.id)
    .order('sort_order');

  // Get variants
  const { data: variants } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_active', true);

  // Get reviews (limited)
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('product_id', product.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(10);

  // Related products
  const { data: related } = await supabaseAdmin
    .from('product_summary')
    .select('*')
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(8);

  res.json({
    success: true,
    data: { ...product, product_images: images || [], variants: variants || [], reviews: reviews || [], related: related || [] },
  });
});

// POST /api/v1/products (Admin)
const createProduct = asyncHandler(async (req, res) => {
  const productData = req.body;
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({ ...productData, created_by: req.user.id })
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);

  // Create inventory record
  if (productData.stock !== undefined) {
    await supabaseAdmin.from('inventory').insert({
      product_id: data.id,
      quantity: parseInt(productData.stock) || 0,
    });
  }

  res.status(201).json({ success: true, message: 'Product created', data });
});

// PUT /api/v1/products/:id (Admin)
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stock, ...productData } = req.body;

  const { data, error } = await supabaseAdmin
    .from('products').update(productData).eq('id', id).select().single();

  if (error) throw new AppError(error.message, 400);
  if (!data) throw new AppError('Product not found.', 404);

  if (stock !== undefined) {
    await supabaseAdmin.from('inventory')
      .upsert({ product_id: id, quantity: parseInt(stock) }, { onConflict: 'product_id' });
  }

  res.json({ success: true, message: 'Product updated', data });
});

// DELETE /api/v1/products/:id (Admin)
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
  if (error) throw new AppError(error.message, 400);
  res.json({ success: true, message: 'Product deleted' });
});

// POST /api/v1/products/:id/images (Admin)
const uploadProductImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files;
  if (!files?.length) throw new AppError('No images provided.', 400);

  const sharp = require('sharp');
  const uploaded = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filename = `${id}/${Date.now()}-${i}.webp`;
    const optimized = await sharp(file.buffer).resize(800, 800, { fit: 'inside' }).webp({ quality: 85 }).toBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from('products').upload(filename, optimized, { contentType: 'image/webp', upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('products').getPublicUrl(filename);
      const { data: imgRecord } = await supabaseAdmin.from('product_images').insert({
        product_id: id, url: urlData.publicUrl, is_primary: i === 0, sort_order: i,
      }).select().single();
      uploaded.push(imgRecord);
    }
  }

  res.json({ success: true, message: `${uploaded.length} image(s) uploaded`, data: uploaded });
});

module.exports = { getProducts, getProductBySlug, createProduct, updateProduct, deleteProduct, uploadProductImages };
