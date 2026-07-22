const fs = require('fs');
const path = require('path');

class LocalCsvService {
    constructor() {
        this.products = [];
        this.categories = [];
        this.init();
    }

    init() {
        // Point to the repo root dataset
        const csvPath = path.join(__dirname, '../../../amazon_mongodb_ready.csv');
        let csvData = '';
        try {
            csvData = fs.readFileSync(csvPath, 'utf8');
        } catch (err) {
            console.error('Failed to read CSV:', err);
            return;
        }

        const parseCsv = (text) => {
            let result = [];
            let currentRow = [];
            let currentCell = '';
            let inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                let char = text[i];
                if (inQuotes) {
                    if (char === '"' && text[i + 1] === '"') {
                        currentCell += '"';
                        i++;
                    } else if (char === '"') {
                        inQuotes = false;
                    } else {
                        currentCell += char;
                    }
                } else {
                    if (char === '"') {
                        inQuotes = true;
                    } else if (char === ',') {
                        currentRow.push(currentCell.trim());
                        currentCell = '';
                    } else if (char === '\n' || char === '\r') {
                        currentRow.push(currentCell.trim());
                        if (currentRow.length > 1 || currentRow[0] !== '') {
                            result.push(currentRow);
                        }
                        currentRow = [];
                        currentCell = '';
                        if (char === '\r' && text[i + 1] === '\n') i++;
                    } else {
                        currentCell += char;
                    }
                }
            }
            if (currentRow.length > 0) {
                currentRow.push(currentCell.trim());
                result.push(currentRow);
            }
            return result;
        };

        const parsedLines = parseCsv(csvData);
        if (parsedLines.length < 2) return;

        const headers = parsedLines[0].map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        const categorySet = new Set();

        const dataRows = parsedLines.slice(1).map((values, idx) => {
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = values[i] || '';
            });

            // Map to frontend expected format
            const priceStr = (obj.price || '0').replace(/[^0-9.]/g, '');
            const originalPriceStr = (obj.original_price || '0').replace(/[^0-9.]/g, '');
            const ratingStr = (obj.rating || '0').replace(/[^0-9.]/g, '');

            const price = parseFloat(priceStr) || 0;
            const comparePrice = parseFloat(originalPriceStr) || 0;
            const rating = parseFloat(ratingStr) || 0;
            const stock = parseInt(obj.stock) || 10;
            const reviewCount = parseInt(obj.review_count) || 0;

            let rawCategory = obj.category || 'General';
            let primaryCategory = rawCategory.split('|')[0].trim();
            // Optional: space out ampersands for aesthetics
            primaryCategory = primaryCategory.replace(/&/g, ' & ').replace(/\s+/g, ' ').trim();

            const catSlug = primaryCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            categorySet.add(primaryCategory);

            const isFeatured = rating >= 4.5 && reviewCount > 50;
            const isBestSeller = reviewCount >= 500;
            const isFlashSale = obj.discount_percent && parseInt(obj.discount_percent) >= 30;
            const isNewArrival = false;

            // Handing image URLs that might be piped or comma separated. Extract HTTP paths.
            let rawImage = obj.image_url || '';
            let primaryImg = '';
            const imgMatch = rawImage.match(/(https?:\/\/[^\s|]+)/);
            if (imgMatch) {
                primaryImg = imgMatch[1].replace(/,$/, '').replace(/\/W\/WEBP_[^\/]+\/images/g, '');
            } else {
                primaryImg = '';
            }

            return {
                id: obj.product_id || String(idx),
                slug: (obj.product_name || `product-${idx}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
                name: obj.product_name || 'Unnamed Product',
                brand_name: obj.brand || 'Generic',
                price: price,
                compare_price: comparePrice > price ? comparePrice : price,
                primary_image: primaryImg,
                available_quantity: stock,
                stock_quantity: stock,
                is_new_arrival: isNewArrival,
                is_best_seller: isBestSeller,
                is_flash_sale: isFlashSale,
                is_featured: isFeatured,
                avg_rating: rating,
                review_count: reviewCount,
                category_slug: catSlug,
                category_name: primaryCategory,
                is_active: true,
                description: obj.description || '',
                specifications: obj.specifications || '',
            };
        });

        this.products = dataRows;
        this.categories = Array.from(categorySet).map(name => ({
            id: name.toLowerCase().replace(/[^a-z]+/g, '-'),
            name: name,
            slug: name.toLowerCase().replace(/[^a-z]+/g, '-'),
            icon: '📦',
            is_active: true
        }));
    }

    getProducts({ page = 1, limit = 20, category, brand, min_price, max_price, rating, sort, featured, best_seller, flash_sale, new_arrival, search }) {
        let filtered = [...this.products];

        if (category) filtered = filtered.filter(p => p.category_slug === category);
        if (brand) filtered = filtered.filter(p => p.brand_name.toLowerCase() === brand.toLowerCase());
        if (min_price) filtered = filtered.filter(p => p.price >= parseFloat(min_price));
        if (max_price) filtered = filtered.filter(p => p.price <= parseFloat(max_price));
        if (featured === 'true') filtered = filtered.filter(p => p.is_featured);
        if (best_seller === 'true') filtered = filtered.filter(p => p.is_best_seller);
        if (flash_sale === 'true') filtered = filtered.filter(p => p.is_flash_sale);
        if (new_arrival === 'true') filtered = filtered.filter(p => p.is_new_arrival);
        if (rating) filtered = filtered.filter(p => p.avg_rating >= parseFloat(rating));
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || p.brand_name.toLowerCase().includes(s));
        }

        if (sort) {
            if (sort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
            else if (sort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
            else if (sort === 'rating') filtered.sort((a, b) => b.avg_rating - a.avg_rating);
            else if (sort === 'newest') filtered.sort((a, b) => (b.is_new_arrival ? 1 : 0) - (a.is_new_arrival ? 1 : 0));
            else if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
        }

        const total = filtered.length;
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const paginated = filtered.slice(startIndex, startIndex + parseInt(limit));

        return {
            data: paginated,
            count: total
        };
    }

    getProductBySlug(slug) {
        return this.products.find(p => p.slug === slug);
    }

    getProductById(id) {
        return this.products.find(p => p.id === String(id));
    }

    getCategories() {
        return this.categories;
    }
}

const localCsvService = new LocalCsvService();
module.exports = localCsvService;
