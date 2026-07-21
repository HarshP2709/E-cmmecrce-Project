const { asyncHandler, AppError } = require('../middleware/error.middleware');
const localCsvService = require('../services/localCsv.service');

// GET /api/v1/products
const getProducts = asyncHandler(async (req, res) => {
  const { data, count } = localCsvService.getProducts(req.query);
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  res.json({
    success: true,
    data: data || [],
    pagination: {
      page: page,
      limit: limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  });
});

// GET /api/v1/products/:slug
const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const product = localCsvService.getProductBySlug(slug);

  if (!product) throw new AppError('Product not found.', 404);

  // Send product with empty relations to fulfill frontend expectations
  res.json({
    success: true,
    data: {
      ...product,
      product_images: [{ url: product.primary_image, is_primary: true }],
      variants: [],
      reviews: [],
      related: []
    },
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
