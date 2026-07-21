const localData = require('../services/localData.service.js');
const localCsv = require('../services/localCsv.service.js');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const { data, error } = localData.getWishlist(req.user.id);
  if (error) throw new AppError(error.message, 400);

  const items = data.items || [];
  const populated = items.map(id => ({
    id: id,
    product: localCsv.getProductById(id) || null
  }));

  res.json({ success: true, data: populated });
});

// POST /api/v1/wishlist 
// Assuming it toggles a single product_id
const toggleWishlist = asyncHandler(async (req, res) => {
  const productId = req.body.product_id || req.body.productId;
  const wishlist = localData.getWishlist(req.user.id).data;
  wishlist.items = (wishlist.items || []).filter(item => item !== null);

  let in_wishlist = true;
  if (wishlist.items.includes(productId)) {
    wishlist.items = wishlist.items.filter(id => id !== productId);
    in_wishlist = false;
  } else {
    wishlist.items.push(productId);
  }

  const { data } = localData.updateWishlistItems(req.user.id, wishlist.items);
  res.json({ success: true, wishlist: data, in_wishlist });
});

// DELETE /api/v1/wishlist/:productId
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const wishlist = localData.getWishlist(req.user.id).data;
  wishlist.items = (wishlist.items || []).filter(id => id !== productId);

  const { data } = localData.updateWishlistItems(req.user.id, wishlist.items);
  res.json({ success: true, wishlist: data });
});

// POST /api/v1/wishlist/move-to-cart
const moveToCart = asyncHandler(async (req, res) => {
  // Mock move to cart response
  res.json({ success: true, message: 'Moved to cart mock' });
});

// DELETE /api/v1/wishlist/clear
const clearWishlist = asyncHandler(async (req, res) => {
  const { data } = localData.updateWishlistItems(req.user.id, []);
  res.json({ success: true, message: 'Wishlist cleared locally' });
});

module.exports = { getWishlist, toggleWishlist, removeFromWishlist, moveToCart, clearWishlist };
