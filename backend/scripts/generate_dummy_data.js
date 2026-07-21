/**
 * generate_dummy_data.js
 * ─────────────────────────────────────────────────────────────────
 * Generates 100 realistic dummy products per category (22 categories)
 * and writes them as CSV files into docs/data/.
 *
 * Usage:  node backend/scripts/generate_dummy_data.js
 * ─────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../../docs/data');
const CSV_HEADER = 'id,name,slug,description,price,compare_price,category_id,brand_id,sku,stock,weight,is_featured,is_best_seller,is_flash_sale,is_new_arrival,tags,specifications';

// ─── helpers ──────────────────────────────────────────────────────
let globalId = 1;
function nextId() { return `prod-${String(globalId++).padStart(5,'0')}`; }

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function csvRow(obj) {
  return [
    obj.id, csvField(obj.name), obj.slug, csvField(obj.description),
    obj.price, obj.compare_price, obj.category_id, obj.brand_id,
    obj.sku, obj.stock, obj.weight,
    obj.is_featured, obj.is_best_seller, obj.is_flash_sale, obj.is_new_arrival,
    csvField(obj.tags), csvField(obj.specifications),
  ].join(',');
}

function csvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function makePrice(min, max) {
  const price = rand(min, max) * 100 / 100;
  const comparePrice = Math.random() < 0.6
    ? Math.round(price * (1 + rand(10, 40) / 100))
    : price;
  return { price, compare_price: comparePrice };
}

function flags(index, total) {
  return {
    is_featured:    index < Math.ceil(total * 0.15),
    is_best_seller: index >= 5  && index < 5  + Math.ceil(total * 0.20),
    is_flash_sale:  index >= 25 && index < 25 + Math.ceil(total * 0.10),
    is_new_arrival: index >= total - Math.ceil(total * 0.20),
  };
}

// ─── category definitions ─────────────────────────────────────────
const CATEGORIES = {

  // ── 1. TV & Home Entertainment ───────────────────────────────────
  'tv-home-entertainment': {
    catId: 'cat-01',
    file:  'products_tv_home_entertainment.csv',
    brands: ['br-02','br-17','br-03','br-19','br-20'],
    products: [
      { n:'4K OLED Smart TV',       base:800,  max:3000, w:18 },
      { n:'QLED Smart TV',          base:600,  max:2500, w:16 },
      { n:'Full HD Smart TV',       base:250,  max:800,  w:12 },
      { n:'8K Ultra HD TV',         base:2000, max:6000, w:25 },
      { n:'Curved Smart TV',        base:500,  max:1800, w:14 },
      { n:'Portable Mini TV',       base:80,   max:300,  w:3  },
      { n:'HD LED TV',              base:150,  max:600,  w:10 },
      { n:'Smart Android TV',       base:300,  max:1200, w:13 },
      { n:'Fire TV Edition',        base:200,  max:900,  w:11 },
      { n:'Home Theatre System',    base:300,  max:1500, w:8  },
      { n:'Soundbar',               base:100,  max:800,  w:4  },
      { n:'Projector',              base:400,  max:2000, w:5  },
      { n:'4K Blu-ray Player',      base:80,   max:400,  w:2  },
      { n:'Streaming Media Player', base:30,   max:150,  w:0.5},
      { n:'HD Receiver',            base:50,   max:200,  w:1  },
    ],
    specs: (p) => `{"resolution":"${pickRandom(['1080p','4K','8K'])}","screen_size":"${pickRandom([32,40,43,50,55,65,75,85])}-inch","smart_tv":true,"refresh_rate":"${pickRandom([60,120,144])}Hz"}`,
    tags: () => `["television","smart tv","4k","oled","entertainment"]`,
  },

  // ── 2. Computers & Laptops ───────────────────────────────────────
  'computers-laptops': {
    catId: 'cat-02',
    file:  'products_computers_laptops.csv',
    brands: ['br-06','br-07','br-08','br-09'],
    products: [
      { n:'Gaming Desktop PC',      base:800,  max:3500, w:9  },
      { n:'All-in-One Desktop',     base:600,  max:2500, w:7  },
      { n:'Mini Desktop PC',        base:300,  max:1000, w:2  },
      { n:'Workstation Tower',      base:1200, max:5000, w:12 },
      { n:'Wireless Keyboard',      base:30,   max:200,  w:0.8},
      { n:'Mechanical Keyboard',    base:50,   max:300,  w:1  },
      { n:'Gaming Mouse',           base:20,   max:150,  w:0.3},
      { n:'Wireless Mouse',         base:15,   max:80,   w:0.2},
      { n:'USB-C Hub',              base:20,   max:100,  w:0.2},
      { n:'27-inch Monitor',        base:200,  max:1000, w:5  },
      { n:'32-inch 4K Monitor',     base:350,  max:1500, w:7  },
      { n:'Gaming Monitor',         base:250,  max:1200, w:6  },
      { n:'External SSD',           base:60,   max:300,  w:0.1},
      { n:'External HDD',           base:50,   max:200,  w:0.4},
      { n:'RAM Module 16GB',        base:40,   max:200,  w:0.05},
    ],
    specs: (p) => `{"processor":"${pickRandom(['Intel i5','Intel i7','Intel i9','AMD Ryzen 5','AMD Ryzen 7'])}","ram":"${pickRandom([8,16,32,64])}GB","storage":"${pickRandom([256,512,1000,2000])}GB SSD","os":"${pickRandom(['Windows 11','macOS','Linux'])}"}`,
    tags: () => `["computer","desktop","pc","workstation","monitor"]`,
  },

  // ── 3. Mobiles, Tablets & Wearables ──────────────────────────────
  'mobiles-tablets-wearables': {
    catId: 'cat-03',
    file:  'products_mobiles_tablets_wearables.csv',
    brands: ['br-10','br-11','br-12','br-13'],
    products: [
      { n:'Android Flagship Phone',    base:500,  max:1200, w:0.2},
      { n:'Budget Smartphone',         base:100,  max:400,  w:0.2},
      { n:'Rugged Outdoor Phone',      base:200,  max:700,  w:0.3},
      { n:'Foldable Smartphone',       base:900,  max:2500, w:0.3},
      { n:'5G Tablet',                 base:300,  max:1000, w:0.5},
      { n:'Android Tablet',            base:150,  max:600,  w:0.4},
      { n:'Kids Tablet',               base:80,   max:250,  w:0.3},
      { n:'E-Reader Tablet',           base:100,  max:350,  w:0.2},
      { n:'Drawing Tablet',            base:100,  max:500,  w:0.7},
      { n:'Smartwatch',                base:150,  max:800,  w:0.05},
      { n:'Fitness Band',              base:30,   max:200,  w:0.03},
      { n:'TWS Earbuds',               base:20,   max:300,  w:0.05},
      { n:'Bluetooth Earphones',       base:15,   max:150,  w:0.1},
      { n:'Phone Case Premium',        base:10,   max:60,   w:0.05},
      { n:'Screen Protector',          base:5,    max:30,   w:0.02},
    ],
    specs: (p) => `{"display":"${pickRandom(['6.1-inch','6.4-inch','6.7-inch','10.1-inch','8-inch'])}","battery":"${pickRandom([4000,4500,5000,6000])}mAh","camera":"${pickRandom([12,48,64,108,200])}MP","connectivity":"${pickRandom(['5G','4G LTE','WiFi 6'])}"}`,
    tags: () => `["mobile","tablet","wearable","smartphone","gadget"]`,
  },

  // ── 4. Personal Care Electronics ─────────────────────────────────
  'personal-care-electronics': {
    catId: 'cat-04',
    file:  'products_personal_care_electronics.csv',
    brands: ['br-14','br-15','br-16'],
    products: [
      { n:'Electric Shaver',           base:30,  max:300,  w:0.3},
      { n:'Hair Dryer',                base:20,  max:200,  w:0.5},
      { n:'Hair Straightener',         base:25,  max:250,  w:0.4},
      { n:'Curling Iron',              base:20,  max:180,  w:0.3},
      { n:'Epilator',                  base:30,  max:200,  w:0.3},
      { n:'Electric Toothbrush',       base:20,  max:200,  w:0.2},
      { n:'Water Flosser',             base:25,  max:150,  w:0.4},
      { n:'Face Cleansing Brush',      base:20,  max:180,  w:0.2},
      { n:'LED Face Mask',             base:50,  max:400,  w:0.5},
      { n:'Massage Gun',               base:40,  max:400,  w:1  },
      { n:'Foot Massager',             base:30,  max:250,  w:2  },
      { n:'Scalp Massager',            base:10,  max:80,   w:0.2},
      { n:'Blood Pressure Monitor',    base:25,  max:200,  w:0.5},
      { n:'Digital Thermometer',       base:10,  max:80,   w:0.1},
      { n:'Pulse Oximeter',            base:10,  max:100,  w:0.1},
    ],
    specs: (p) => `{"power":"${pickRandom([10,20,30,40,50,100])}W","battery":"${pickRandom(['rechargeable','AA batteries','built-in'])}","material":"${pickRandom(['ABS plastic','stainless steel','silicone'])}","waterproof":"${pickRandom([true,false])}"}`,
    tags: () => `["personal care","grooming","beauty","health","electric"]`,
  },

  // ── 5. Gaming & VR ───────────────────────────────────────────────
  'gaming-vr': {
    catId: 'cat-05',
    file:  'products_gaming_vr.csv',
    brands: ['br-17','br-18','br-19'],
    products: [
      { n:'Gaming Console',            base:300,  max:600,  w:3  },
      { n:'VR Headset',                base:200,  max:1000, w:0.5},
      { n:'Gaming Controller',         base:40,   max:200,  w:0.3},
      { n:'Gaming Headset',            base:30,   max:300,  w:0.4},
      { n:'Gaming Chair',              base:150,  max:700,  w:20 },
      { n:'Racing Wheel Controller',   base:80,   max:500,  w:3  },
      { n:'Fight Stick',               base:60,   max:250,  w:1  },
      { n:'Gaming Keyboard RGB',       base:50,   max:300,  w:1  },
      { n:'Gaming Mouse Pad XL',       base:15,   max:80,   w:0.5},
      { n:'Game Title Card',           base:30,   max:80,   w:0.1},
      { n:'Capture Card',              base:80,   max:400,  w:0.5},
      { n:'Gaming Router',             base:100,  max:500,  w:1  },
      { n:'Console Storage Expansion', base:60,   max:300,  w:0.1},
      { n:'Charging Dock',             base:20,   max:100,  w:0.3},
      { n:'Mini Retro Console',        base:40,   max:150,  w:0.5},
    ],
    specs: (p) => `{"platform":"${pickRandom(['PlayStation 5','Xbox Series X','Nintendo Switch','PC','Multi-platform'])}","storage":"${pickRandom([256,512,1000])}GB","resolution":"${pickRandom(['1080p','4K','8K'])}","fps":"${pickRandom([30,60,120])}"}`,
    tags: () => `["gaming","console","vr","esports","playstation","xbox"]`,
  },

  // ── 6. Kitchen Appliances ────────────────────────────────────────
  'kitchen-appliances': {
    catId: 'cat-06',
    file:  'products_kitchen_appliances.csv',
    brands: ['br-20','br-21','br-22'],
    products: [
      { n:'Air Fryer',                 base:40,  max:300,  w:4  },
      { n:'Microwave Oven',            base:60,  max:400,  w:12 },
      { n:'Electric Kettle',           base:15,  max:100,  w:1  },
      { n:'Mixer Grinder',             base:30,  max:200,  w:3  },
      { n:'Food Processor',            base:50,  max:400,  w:4  },
      { n:'Juicer',                    base:25,  max:200,  w:2  },
      { n:'Hand Blender',              base:20,  max:150,  w:0.8},
      { n:'Stand Mixer',               base:100, max:600,  w:8  },
      { n:'Rice Cooker',               base:20,  max:200,  w:3  },
      { n:'Coffee Maker',              base:30,  max:400,  w:3  },
      { n:'Espresso Machine',          base:100, max:1000, w:5  },
      { n:'Sandwich Maker',            base:15,  max:100,  w:1  },
      { n:'Toaster',                   base:15,  max:80,   w:1  },
      { n:'Induction Cooktop',         base:30,  max:250,  w:3  },
      { n:'Electric Pressure Cooker',  base:50,  max:300,  w:5  },
    ],
    specs: (p) => `{"capacity":"${pickRandom([1,1.5,2,3,4,5,6])} L","wattage":"${pickRandom([600,750,900,1000,1200,1500,2000])}W","material":"${pickRandom(['stainless steel','ABS plastic','anodized aluminum'])}","warranty":"${pickRandom([1,2,3])} year"}`,
    tags: () => `["kitchen","appliance","cooking","home","electric"]`,
  },

  // ── 7. Home & Living ─────────────────────────────────────────────
  'home-living': {
    catId: 'cat-07',
    file:  'products_home_living.csv',
    brands: ['br-23','br-24','br-25'],
    products: [
      { n:'Sofa Set',                  base:300,  max:2000, w:80 },
      { n:'Dining Table',              base:200,  max:1500, w:40 },
      { n:'Bookshelf',                 base:80,   max:600,  w:20 },
      { n:'Wardrobe',                  base:200,  max:1200, w:60 },
      { n:'Bedside Table',             base:50,   max:300,  w:10 },
      { n:'Coffee Table',              base:80,   max:500,  w:15 },
      { n:'Floor Lamp',                base:30,   max:200,  w:3  },
      { n:'Wall Clock',                base:15,   max:150,  w:0.5},
      { n:'Photo Frame Set',           base:10,   max:60,   w:0.5},
      { n:'Bed Sheet Set',             base:20,   max:120,  w:1  },
      { n:'Pillow Set',                base:15,   max:80,   w:1  },
      { n:'Curtains Pair',             base:20,   max:150,  w:1.5},
      { n:'Area Rug',                  base:40,   max:400,  w:5  },
      { n:'Storage Ottoman',           base:60,   max:350,  w:8  },
      { n:'Decorative Vase',           base:15,   max:120,  w:0.5},
    ],
    specs: (p) => `{"material":"${pickRandom(['wood','metal','fabric','glass','plastic'])}","color":"${pickRandom(['white','black','brown','grey','beige'])}","dimensions":"${pickRandom(['100x50x75cm','120x60x80cm','80x40x70cm'])}","assembly":"${pickRandom(['required','not required'])}"}`,
    tags: () => `["home","living","furniture","decor","interior"]`,
  },

  // ── 8. Major Home Appliances ──────────────────────────────────────
  'major-home-appliances': {
    catId: 'cat-08',
    file:  'products_major_home_appliances.csv',
    brands: ['br-26','br-27','br-28'],
    products: [
      { n:'Double Door Refrigerator',  base:400,  max:2000, w:75 },
      { n:'Single Door Refrigerator',  base:200,  max:800,  w:40 },
      { n:'Side-by-Side Refrigerator', base:700,  max:3000, w:100},
      { n:'Front Load Washing Machine',base:350,  max:1500, w:60 },
      { n:'Top Load Washing Machine',  base:200,  max:900,  w:45 },
      { n:'Semi-Automatic Washer',     base:150,  max:500,  w:30 },
      { n:'Washer Dryer Combo',        base:500,  max:2000, w:70 },
      { n:'Inverter AC 1.5 Ton',       base:400,  max:1500, w:12 },
      { n:'Window AC 1 Ton',           base:250,  max:800,  w:30 },
      { n:'Split AC 2 Ton',            base:500,  max:2000, w:15 },
      { n:'Air Purifier',              base:80,   max:600,  w:5  },
      { n:'Dehumidifier',              base:100,  max:500,  w:8  },
      { n:'Air Cooler',                base:50,   max:300,  w:8  },
      { n:'Vacuum Cleaner',            base:50,   max:500,  w:4  },
      { n:'Robot Vacuum',              base:150,  max:1000, w:3  },
    ],
    specs: (p) => `{"capacity":"${pickRandom([7,8,10,12,15,18,21,24])} cu.ft","energy_rating":"${pickRandom([1,2,3,4,5])}-star","voltage":"${pickRandom([110,220])}V","warranty":"${pickRandom([1,2,3,5])} year"}`,
    tags: () => `["appliance","home","refrigerator","washing machine","ac"]`,
  },

  // ── 9. Smart Home & Security ──────────────────────────────────────
  'smart-home-security': {
    catId: 'cat-09',
    file:  'products_smart_home_security.csv',
    brands: ['br-29','br-30','br-31'],
    products: [
      { n:'Smart Speaker',             base:30,  max:300,  w:0.8},
      { n:'Smart Display',             base:80,  max:400,  w:1  },
      { n:'Smart Doorbell',            base:50,  max:300,  w:0.3},
      { n:'Security Camera Indoor',    base:20,  max:150,  w:0.2},
      { n:'Security Camera Outdoor',   base:40,  max:250,  w:0.4},
      { n:'Smart Lock',                base:80,  max:400,  w:0.8},
      { n:'Smart Thermostat',          base:60,  max:300,  w:0.2},
      { n:'Smart Light Bulb',          base:8,   max:50,   w:0.1},
      { n:'Smart Light Strip',         base:15,  max:100,  w:0.3},
      { n:'Smart Plug',                base:10,  max:50,   w:0.1},
      { n:'Smart Switch',              base:15,  max:80,   w:0.1},
      { n:'Motion Sensor',             base:15,  max:80,   w:0.1},
      { n:'Smart Smoke Detector',      base:25,  max:150,  w:0.2},
      { n:'Smart Hub',                 base:40,  max:200,  w:0.3},
      { n:'NVR Security System',       base:150, max:800,  w:2  },
    ],
    specs: (p) => `{"connectivity":"${pickRandom(['WiFi','Zigbee','Z-Wave','Bluetooth','Thread'])}","voice_assistant":"${pickRandom(['Alexa','Google Assistant','Apple HomeKit','Multiple'])}","app_control":true,"power":"${pickRandom(['battery','wired','USB-C'])}"}`,
    tags: () => `["smart home","security","automation","iot","alexa"]`,
  },

  // ── 10. Cameras & Photography ─────────────────────────────────────
  'cameras-photography': {
    catId: 'cat-10',
    file:  'products_cameras_photography.csv',
    brands: ['br-32','br-33','br-34'],
    products: [
      { n:'DSLR Camera',               base:500,  max:3000, w:0.8},
      { n:'Mirrorless Camera',         base:700,  max:4000, w:0.5},
      { n:'Action Camera',             base:150,  max:500,  w:0.1},
      { n:'Instant Camera',            base:60,   max:250,  w:0.4},
      { n:'Camera Drone',              base:200,  max:1500, w:0.5},
      { n:'Telephoto Lens',            base:200,  max:2000, w:0.8},
      { n:'Wide Angle Lens',           base:150,  max:1500, w:0.5},
      { n:'Camera Tripod',             base:20,   max:200,  w:1.5},
      { n:'Camera Bag',                base:25,   max:200,  w:0.6},
      { n:'Camera Flash Speedlite',    base:60,   max:400,  w:0.4},
      { n:'Memory Card 128GB',         base:15,   max:80,   w:0.01},
      { n:'Camera Stabilizer Gimbal',  base:80,   max:500,  w:0.5},
      { n:'Photo Printer',             base:80,   max:400,  w:2  },
      { n:'Light Ring',                base:20,   max:150,  w:0.5},
      { n:'Background Stand Kit',      base:30,   max:200,  w:2  },
    ],
    specs: (p) => `{"megapixels":"${pickRandom([12,16,24,33,45,61,100])}MP","sensor":"${pickRandom(['Full Frame','APS-C','Micro 4/3','1-inch'])}","video":"${pickRandom(['4K 30fps','4K 60fps','8K 30fps','1080p 120fps'])}","iso_range":"${pickRandom(['100-6400','100-12800','100-25600','100-102400'])}"}`,
    tags: () => `["camera","photography","dslr","mirrorless","lens"]`,
  },

  // ── 11. Smartphones ───────────────────────────────────────────────
  'smartphones': {
    catId: 'cat-11',
    file:  'products_smartphones.csv',
    brands: ['br-10','br-11','br-12','br-13'],
    products: [
      { n:'Pro Flagship Smartphone',   base:800,  max:1500, w:0.2},
      { n:'Ultra Flagship Smartphone', base:1000, max:2000, w:0.2},
      { n:'Mid-Range Smartphone',      base:250,  max:600,  w:0.2},
      { n:'Budget 5G Smartphone',      base:150,  max:400,  w:0.2},
      { n:'Slim Compact Smartphone',   base:300,  max:700,  w:0.15},
      { n:'Gaming Smartphone',         base:400,  max:1000, w:0.3},
      { n:'Photography Smartphone',    base:600,  max:1400, w:0.2},
      { n:'Dual Screen Phone',         base:500,  max:1200, w:0.3},
      { n:'Long Battery Smartphone',   base:200,  max:500,  w:0.25},
      { n:'Senior Friendly Phone',     base:80,   max:250,  w:0.2},
      { n:'Android One Phone',         base:100,  max:350,  w:0.2},
      { n:'Refurbished Flagship',      base:200,  max:600,  w:0.2},
      { n:'5G Smartphone',             base:350,  max:900,  w:0.2},
      { n:'Phablet Smartphone',        base:300,  max:800,  w:0.25},
      { n:'Mini Smartphone',           base:400,  max:900,  w:0.15},
    ],
    specs: (p) => `{"display":"${pickRandom(['6.1-inch AMOLED','6.4-inch OLED','6.7-inch Super AMOLED','6.8-inch Dynamic AMOLED'])}","processor":"${pickRandom(['Snapdragon 8 Gen 3','Dimensity 9300','Apple A17 Pro','Exynos 2400'])}","camera":"${pickRandom([50,64,108,200])}MP triple camera","battery":"${pickRandom([4000,4500,5000,6000])}mAh","ram":"${pickRandom([6,8,12,16])}GB"}`,
    tags: () => `["smartphone","5g","mobile","android","ios"]`,
  },

  // ── 12. Electronics ───────────────────────────────────────────────
  'electronics': {
    catId: 'cat-12',
    file:  'products_electronics.csv',
    brands: ['br-35','br-36','br-37'],
    products: [
      { n:'Power Bank 20000mAh',       base:20,  max:100,  w:0.4},
      { n:'USB-C Charger 65W',         base:15,  max:60,   w:0.1},
      { n:'Wireless Charger',          base:10,  max:60,   w:0.1},
      { n:'USB Hub 7-Port',            base:15,  max:80,   w:0.2},
      { n:'HDMI Cable 4K',             base:8,   max:40,   w:0.1},
      { n:'Ethernet Cable Cat8',       base:10,  max:50,   w:0.2},
      { n:'Smart LED Bulb',            base:5,   max:30,   w:0.1},
      { n:'Extension Board Surge',     base:15,  max:80,   w:0.5},
      { n:'Digital Multimeter',        base:10,  max:100,  w:0.3},
      { n:'Soldering Kit',             base:15,  max:80,   w:0.3},
      { n:'Oscilloscope',              base:50,  max:500,  w:1.5},
      { n:'Raspberry Pi Kit',          base:40,  max:150,  w:0.2},
      { n:'Arduino Starter Kit',       base:20,  max:100,  w:0.3},
      { n:'Electronic Components Kit', base:10,  max:50,   w:0.5},
      { n:'Portable UPS',              base:30,  max:200,  w:2  },
    ],
    specs: (p) => `{"voltage":"${pickRandom(['5V','9V','12V','19V','20V'])}","amperage":"${pickRandom(['1A','2A','3A','5A'])}","compatibility":"${pickRandom(['universal','USB-C devices','laptops','smartphones'])}","certifications":"${pickRandom(['CE','FCC','RoHS','UL'])}"}`,
    tags: () => `["electronics","gadget","charging","cable","accessories"]`,
  },

  // ── 13. Laptops ───────────────────────────────────────────────────
  'laptops': {
    catId: 'cat-13',
    file:  'products_laptops.csv',
    brands: ['br-06','br-07','br-08','br-09'],
    products: [
      { n:'Ultrabook Laptop',          base:700,  max:2000, w:1.2},
      { n:'Gaming Laptop',             base:900,  max:3500, w:2.5},
      { n:'Business Laptop',           base:600,  max:2500, w:1.5},
      { n:'Chromebook',                base:200,  max:600,  w:1.3},
      { n:'2-in-1 Convertible Laptop', base:500,  max:2000, w:1.4},
      { n:'Budget Laptop',             base:300,  max:700,  w:1.8},
      { n:'Student Laptop',            base:400,  max:1000, w:1.6},
      { n:'Creator Laptop',            base:1000, max:4000, w:2  },
      { n:'Rugged Laptop',             base:800,  max:3000, w:3  },
      { n:'Thin & Light Laptop',       base:600,  max:1800, w:1.1},
      { n:'Workstation Laptop',        base:1200, max:5000, w:2.5},
      { n:'Laptop Backpack',           base:30,   max:150,  w:0.8},
      { n:'Laptop Stand',              base:15,   max:80,   w:0.5},
      { n:'Laptop Cooling Pad',        base:20,   max:100,  w:0.6},
      { n:'Laptop Sleeve',             base:10,   max:50,   w:0.2},
    ],
    specs: (p) => `{"processor":"${pickRandom(['Intel Core i5-13th Gen','Intel Core i7-13th Gen','Intel Core i9-13th Gen','AMD Ryzen 5 7000','AMD Ryzen 7 7000','Apple M3'])}","ram":"${pickRandom([8,16,32,64])}GB","storage":"${pickRandom([256,512,1000,2000])}GB NVMe SSD","display":"${pickRandom([13.3,14,15.6,16,17.3])}-inch ${pickRandom(['FHD','QHD','4K'])}","battery":"${pickRandom([40,54,72,86,99])}Wh"}`,
    tags: () => `["laptop","notebook","ultrabook","gaming laptop","portable"]`,
  },

  // ── 14. Fashion ───────────────────────────────────────────────────
  'fashion': {
    catId: 'cat-14',
    file:  'products_fashion.csv',
    brands: ['br-38','br-39','br-40'],
    products: [
      { n:'Men\'s Slim Fit Shirt',     base:15,  max:80,   w:0.3},
      { n:'Men\'s Chino Pants',        base:20,  max:100,  w:0.5},
      { n:'Men\'s Polo T-Shirt',       base:10,  max:50,   w:0.2},
      { n:'Men\'s Hooded Sweatshirt',  base:25,  max:120,  w:0.6},
      { n:'Men\'s Leather Belt',       base:15,  max:80,   w:0.2},
      { n:'Women\'s Floral Dress',     base:20,  max:120,  w:0.4},
      { n:'Women\'s Blazer',           base:40,  max:200,  w:0.6},
      { n:'Women\'s Jeans',            base:25,  max:120,  w:0.5},
      { n:'Women\'s Silk Scarf',       base:15,  max:80,   w:0.1},
      { n:'Women\'s Handbag',          base:30,  max:300,  w:0.6},
      { n:'Sneakers Unisex',           base:40,  max:200,  w:0.8},
      { n:'Formal Shoes',              base:50,  max:300,  w:0.9},
      { n:'Sports Shoes',              base:40,  max:200,  w:0.7},
      { n:'Sandals',                   base:15,  max:100,  w:0.5},
      { n:'Sunglasses',                base:15,  max:200,  w:0.1},
    ],
    specs: (p) => `{"material":"${pickRandom(['cotton','polyester','linen','silk','denim','leather','wool'])}","fit":"${pickRandom(['slim fit','regular fit','relaxed fit','oversized'])}","care":"${pickRandom(['machine wash','hand wash','dry clean'])}","season":"${pickRandom(['all season','summer','winter','spring/fall'])}"}`,
    tags: () => `["fashion","clothing","apparel","style","trendy"]`,
  },

  // ── 15. Audio ─────────────────────────────────────────────────────
  'audio': {
    catId: 'cat-15',
    file:  'products_audio.csv',
    brands: ['br-41','br-42','br-43'],
    products: [
      { n:'Over-Ear Headphones ANC',   base:50,  max:500,  w:0.3},
      { n:'On-Ear Headphones',         base:30,  max:250,  w:0.25},
      { n:'In-Ear Monitors',           base:20,  max:400,  w:0.05},
      { n:'True Wireless Earbuds ANC', base:30,  max:350,  w:0.06},
      { n:'Sport Wireless Earphones',  base:20,  max:150,  w:0.08},
      { n:'Bluetooth Speaker',         base:20,  max:400,  w:0.5},
      { n:'Party Speaker',             base:50,  max:400,  w:5  },
      { n:'Portable Speaker Rugged',   base:30,  max:200,  w:0.6},
      { n:'Bookshelf Speakers Pair',   base:80,  max:600,  w:4  },
      { n:'Subwoofer',                 base:100, max:600,  w:8  },
      { n:'Soundbar 2.1',              base:80,  max:500,  w:4  },
      { n:'HiFi Amplifier',            base:100, max:1000, w:5  },
      { n:'Turntable Vinyl Player',    base:80,  max:500,  w:4  },
      { n:'USB Microphone',            base:30,  max:200,  w:0.3},
      { n:'Studio Monitor Headphones', base:60,  max:400,  w:0.3},
    ],
    specs: (p) => `{"driver":"${pickRandom([6,10,40,50])}mm","frequency_response":"${pickRandom(['20Hz-20kHz','5Hz-40kHz','10Hz-30kHz'])}","impedance":"${pickRandom([16,32,64,150,250])} ohm","battery":"${pickRandom([6,8,10,20,30,40])} hours","connectivity":"${pickRandom(['Bluetooth 5.3','Wired 3.5mm','USB-C','Wireless 2.4GHz'])}"}`,
    tags: () => `["audio","headphones","earbuds","speaker","sound"]`,
  },

  // ── 16. Cameras ───────────────────────────────────────────────────
  'cameras': {
    catId: 'cat-16',
    file:  'products_cameras_photography.csv',  // reuse same file, will merge
    brands: ['br-32','br-33','br-34'],
    products: [
      { n:'Compact Point & Shoot',     base:150, max:600,  w:0.2},
      { n:'Bridge Camera',             base:200, max:800,  w:0.7},
      { n:'360 Camera',                base:200, max:800,  w:0.1},
      { n:'Underwater Camera',         base:100, max:500,  w:0.3},
      { n:'Film Camera',               base:50,  max:300,  w:0.3},
      { n:'Camera Lens Macro',         base:100, max:800,  w:0.3},
      { n:'ND Filter Set',             base:20,  max:100,  w:0.1},
      { n:'Camera Remote Shutter',     base:10,  max:50,   w:0.05},
      { n:'Camera Battery Grip',       base:30,  max:150,  w:0.3},
      { n:'Camera Rain Cover',         base:10,  max:50,   w:0.1},
      { n:'Photo Editing Software Key',base:30,  max:150,  w:0.01},
      { n:'Camera Sling Strap',        base:10,  max:60,   w:0.1},
      { n:'Portable LED Light Panel',  base:20,  max:150,  w:0.3},
      { n:'Reflector Diffuser Set',    base:15,  max:80,   w:0.5},
      { n:'Photography Backdrop',      base:20,  max:100,  w:0.5},
    ],
    specs: (p) => `{"megapixels":"${pickRandom([12,16,20,24])}MP","zoom":"${pickRandom([3,5,10,30,50])}x ${pickRandom(['optical','digital'])} zoom","video":"${pickRandom(['4K','1080p','720p'])}","waterproof":"${pickRandom([true,false])}"}`,
    tags: () => `["camera","photography","lens","accessories","photo"]`,
  },

  // ── 17. Sports & Fitness ──────────────────────────────────────────
  'sports-fitness': {
    catId: 'cat-17',
    file:  'products_sports_fitness.csv',
    brands: ['br-44','br-45','br-46'],
    products: [
      { n:'Yoga Mat',                  base:15,  max:100,  w:1.5},
      { n:'Dumbbell Set',              base:30,  max:300,  w:20 },
      { n:'Resistance Bands Set',      base:10,  max:60,   w:0.3},
      { n:'Jump Rope',                 base:8,   max:50,   w:0.2},
      { n:'Exercise Bike',             base:150, max:1000, w:30 },
      { n:'Treadmill',                 base:300, max:2000, w:80 },
      { n:'Pull-Up Bar',               base:15,  max:80,   w:1  },
      { n:'Kettlebell',                base:15,  max:100,  w:16 },
      { n:'Ab Roller',                 base:10,  max:50,   w:0.5},
      { n:'Foam Roller',               base:10,  max:60,   w:0.6},
      { n:'Sports Water Bottle',       base:8,   max:50,   w:0.3},
      { n:'Running Shoes',             base:50,  max:250,  w:0.8},
      { n:'Sports Shorts',             base:15,  max:80,   w:0.2},
      { n:'Gym Gloves',                base:10,  max:60,   w:0.15},
      { n:'Protein Shaker Bottle',     base:8,   max:40,   w:0.3},
    ],
    specs: (p) => `{"material":"${pickRandom(['NBR foam','rubber','stainless steel','neoprene','polyester'])}","weight":"${pickRandom([1,2,5,8,10,15,20])}kg","dimensions":"${pickRandom(['183x61cm','100x40cm','50x30cm'])}","color":"${pickRandom(['black','blue','red','grey','purple'])}"}`,
    tags: () => `["sports","fitness","gym","exercise","workout"]`,
  },

  // ── 18. Beauty & Personal Care ────────────────────────────────────
  'beauty-personal-care': {
    catId: 'cat-18',
    file:  'products_beauty_personal_care.csv',
    brands: ['br-47','br-48','br-49'],
    products: [
      { n:'Anti-Aging Face Cream',     base:15,  max:120,  w:0.1},
      { n:'Hyaluronic Acid Serum',     base:10,  max:80,   w:0.05},
      { n:'SPF 50 Sunscreen',          base:8,   max:50,   w:0.15},
      { n:'Vitamin C Brightening Mask',base:10,  max:60,   w:0.1},
      { n:'Lipstick Collection',       base:8,   max:40,   w:0.05},
      { n:'Foundation Full Coverage',  base:15,  max:80,   w:0.03},
      { n:'Mascara Volumizing',        base:8,   max:40,   w:0.03},
      { n:'Eyeshadow Palette',         base:10,  max:80,   w:0.1},
      { n:'Perfume Eau de Parfum',     base:20,  max:200,  w:0.15},
      { n:'Body Lotion',               base:8,   max:40,   w:0.4},
      { n:'Shampoo & Conditioner Set', base:10,  max:60,   w:0.6},
      { n:'Hair Mask',                 base:8,   max:50,   w:0.2},
      { n:'Nail Polish Set',           base:8,   max:40,   w:0.1},
      { n:'Essential Oil Set',         base:15,  max:80,   w:0.1},
      { n:'Bath Bomb Set',             base:10,  max:60,   w:0.5},
    ],
    specs: (p) => `{"skin_type":"${pickRandom(['all skin types','oily','dry','combination','sensitive'])}","volume":"${pickRandom([30,50,100,150,200,250])}ml","key_ingredients":"${pickRandom(['retinol','hyaluronic acid','vitamin C','niacinamide','collagen'])}","cruelty_free":${pickRandom([true,false])}}`,
    tags: () => `["beauty","skincare","makeup","cosmetics","personal care"]`,
  },

  // ── 19. Books & Education ─────────────────────────────────────────
  'books-education': {
    catId: 'cat-19',
    file:  'products_books_education.csv',
    brands: ['br-50','br-51','br-52'],
    products: [
      { n:'Programming Python Book',   base:20,  max:60,   w:0.5},
      { n:'Machine Learning Textbook', base:30,  max:80,   w:0.7},
      { n:'Business Strategy Book',    base:15,  max:50,   w:0.4},
      { n:'Self-Help Best Seller',     base:10,  max:40,   w:0.3},
      { n:'Fiction Novel',             base:8,   max:25,   w:0.3},
      { n:'Children\'s Picture Book',  base:8,   max:30,   w:0.4},
      { n:'Comic Book Collection',     base:10,  max:50,   w:0.2},
      { n:'Cookbook',                  base:15,  max:50,   w:0.6},
      { n:'Art Sketchbook A4',         base:5,   max:30,   w:0.3},
      { n:'Colored Pencils 72pc Set',  base:10,  max:50,   w:0.4},
      { n:'Watercolor Paint Set',      base:10,  max:60,   w:0.3},
      { n:'Stationery Bundle',         base:8,   max:40,   w:0.5},
      { n:'Scientific Calculator',     base:10,  max:80,   w:0.2},
      { n:'Globe Educational',         base:20,  max:100,  w:1  },
      { n:'Online Course Voucher',     base:10,  max:200,  w:0.01},
    ],
    specs: (p) => `{"pages":"${pickRandom([100,200,300,400,500,600])}","language":"${pickRandom(['English','Hindi','Spanish','French'])}","format":"${pickRandom(['hardcover','paperback','ebook','audiobook'])}","publisher":"${pickRandom(['Pearson','O\'Reilly','Penguin','HarperCollins'])}"}`,
    tags: () => `["books","education","learning","stationery","textbooks"]`,
  },

  // ── 20. Toys & Games ──────────────────────────────────────────────
  'toys-games': {
    catId: 'cat-20',
    file:  'products_toys_games.csv',
    brands: ['br-53','br-54','br-55'],
    products: [
      { n:'LEGO City Building Set',    base:20,  max:200,  w:0.5},
      { n:'Remote Control Car',        base:20,  max:150,  w:0.8},
      { n:'Barbie Doll Playset',       base:15,  max:100,  w:0.5},
      { n:'Action Figure Set',         base:10,  max:80,   w:0.3},
      { n:'Board Game Strategy',       base:20,  max:80,   w:0.8},
      { n:'Jigsaw Puzzle 1000pc',      base:10,  max:50,   w:0.6},
      { n:'Card Game UNO',             base:5,   max:25,   w:0.1},
      { n:'Chess Set Wooden',          base:20,  max:150,  w:1  },
      { n:'Monopoly Deluxe',           base:20,  max:60,   w:1  },
      { n:'Stuffed Animal Plush',      base:10,  max:60,   w:0.3},
      { n:'Model Kit Assembly',        base:15,  max:100,  w:0.5},
      { n:'Slime Making Kit',          base:8,   max:40,   w:0.4},
      { n:'Science Experiment Kit',    base:15,  max:80,   w:0.6},
      { n:'Musical Toy',               base:15,  max:80,   w:0.5},
      { n:'Kids Painting Set',         base:10,  max:50,   w:0.5},
    ],
    specs: (p) => `{"age_range":"${pickRandom(['3+','5+','8+','12+','14+','18+'])}","material":"${pickRandom(['ABS plastic','wood','fabric','cardboard','metal'])}","pieces":"${pickRandom([1,10,50,100,250,500,1000])}","battery_required":${pickRandom([true,false])}}`,
    tags: () => `["toys","games","kids","play","educational"]`,
  },

  // ── 21. Groceries ─────────────────────────────────────────────────
  'groceries': {
    catId: 'cat-21',
    file:  'products_groceries.csv',
    brands: ['br-56','br-57','br-58'],
    products: [
      { n:'Organic Brown Rice',        base:2,   max:15,   w:1  },
      { n:'Whole Wheat Pasta',         base:2,   max:10,   w:0.5},
      { n:'Extra Virgin Olive Oil',    base:5,   max:30,   w:0.75},
      { n:'Raw Honey',                 base:5,   max:30,   w:0.5},
      { n:'Almond Milk',               base:3,   max:10,   w:1  },
      { n:'Protein Granola',           base:5,   max:20,   w:0.5},
      { n:'Quinoa',                    base:4,   max:20,   w:0.5},
      { n:'Greek Yogurt',              base:2,   max:8,    w:0.45},
      { n:'Green Tea 50 bags',         base:3,   max:15,   w:0.1},
      { n:'Instant Coffee',            base:5,   max:25,   w:0.2},
      { n:'Dark Chocolate Bar',        base:2,   max:10,   w:0.1},
      { n:'Mixed Nuts Pack',           base:5,   max:25,   w:0.5},
      { n:'Whey Protein Powder',       base:20,  max:80,   w:1  },
      { n:'Apple Cider Vinegar',       base:3,   max:15,   w:0.5},
      { n:'Organic Turmeric Powder',   base:2,   max:12,   w:0.1},
    ],
    specs: (p) => `{"weight":"${pickRandom([100,200,250,400,500,1000])}g","organic":${pickRandom([true,false])},"shelf_life":"${pickRandom([6,12,18,24,36])} months","allergens":"${pickRandom(['none','contains nuts','contains gluten','may contain dairy'])}"}`,
    tags: () => `["groceries","food","organic","healthy","pantry"]`,
  },

  // ── 22. Watches & Wearables ───────────────────────────────────────
  'watches-wearables': {
    catId: 'cat-22',
    file:  'products_watches_wearables.csv',
    brands: ['br-10','br-11','br-59'],
    products: [
      { n:'Luxury Smartwatch',         base:200, max:800,  w:0.05},
      { n:'Sports Smartwatch GPS',     base:150, max:600,  w:0.05},
      { n:'Kids Smartwatch',           base:30,  max:150,  w:0.04},
      { n:'Classic Analog Watch',      base:30,  max:500,  w:0.08},
      { n:'Chronograph Watch',         base:50,  max:600,  w:0.1},
      { n:'Smart Ring',                base:150, max:500,  w:0.01},
      { n:'Health Tracking Band',      base:20,  max:150,  w:0.03},
      { n:'Smart Glasses',             base:100, max:600,  w:0.04},
      { n:'AR Smart Glasses',          base:300, max:1500, w:0.06},
      { n:'Fitness Tracker Slim',      base:25,  max:120,  w:0.03},
      { n:'Smart Bracelet',            base:20,  max:100,  w:0.03},
      { n:'Watch Band Leather',        base:8,   max:50,   w:0.05},
      { n:'Watch Band Silicone',       base:5,   max:25,   w:0.04},
      { n:'Watch Charging Dock',       base:10,  max:40,   w:0.1},
      { n:'Watch Screen Protector',    base:5,   max:20,   w:0.01},
    ],
    specs: (p) => `{"display":"${pickRandom(['AMOLED','LCD','e-ink','TFT'])}","battery":"${pickRandom([1,2,5,7,14,18,21])} days","water_resistance":"${pickRandom(['IP67','IP68','5ATM','10ATM','not rated'])}","health_sensors":"${pickRandom(['heart rate + SpO2','ECG + heart rate','GPS + heart rate','basic pedometer'])}"}`,
    tags: () => `["watch","wearable","smartwatch","fitness","tracker"]`,
  },
};

// ─── brand name lookup (IDs match brands.csv exactly) ────────────
const BRAND_NAMES = {
  'br-01':'Apple',          'br-02':'Samsung',      'br-03':'Sony',
  'br-04':'OnePlus',        'br-05':'Xiaomi',        'br-06':'Realme',
  'br-07':'Oppo',           'br-08':'Vivo',          'br-09':'Google',
  'br-10':'Motorola',       'br-11':'Dell',          'br-12':'HP',
  'br-13':'Lenovo',         'br-14':'Asus',          'br-15':'Acer',
  'br-16':'MSI',            'br-17':'LG',            'br-18':'Panasonic',
  'br-19':'TCL',            'br-20':'Hisense',       'br-21':'Philips',
  'br-22':'Bosch',          'br-23':'Whirlpool',     'br-24':'Haier',
  'br-25':'Godrej',         'br-26':'IFB',           'br-27':'Voltas',
  'br-28':'Blue Star',      'br-29':'Daikin',        'br-30':'Carrier',
  'br-31':'Bose',           'br-32':'Boat',          'br-33':'JBL',
  'br-34':'Sennheiser',     'br-35':'Audio-Technica','br-36':'Canon',
  'br-37':'Nikon',          'br-38':'Fujifilm',      'br-39':'GoPro',
  'br-40':'DJI',            'br-41':'Nike',          'br-42':'Adidas',
  'br-43':'Puma',           'br-44':'Reebok',        'br-45':'Under Armour',
  'br-46':'Lakme',          'br-47':'Mamaearth',     'br-48':'WOW Skin Science',
  'br-49':'Himalaya',       'br-50':'Biotique',      'br-51':'LEGO',
  'br-52':'Hasbro',         'br-53':'Mattel',        'br-54':'Prestige',
  'br-55':'Bajaj',          'br-56':'Havells',       'br-57':'Xiaomi (Mi)',
  'br-58':'Amazon',         'br-59':'Microsoft',     'br-60':'Noise',
  'br-61':'boAt Rockerz',   'br-62':'realme TechLife','br-63':'Fitbit',
  'br-64':'Garmin',         'br-65':'Fossil',        'br-68':'Eureka Forbes',
  'br-69':'Kent',           'br-70':'Dyson',
};

// ─── generate products for one category ───────────────────────────
function generateCategory(catSlug, def) {
  const rows = [];
  const productTemplates = def.products;
  const totalProducts = 100;

  for (let i = 0; i < totalProducts; i++) {
    const tpl      = productTemplates[i % productTemplates.length];
    const brandId  = pickRandom(def.brands);
    const brandName = BRAND_NAMES[brandId] || 'Generic';
    const suffix   = i < productTemplates.length ? '' : ` ${Math.ceil((i - productTemplates.length) / productTemplates.length) + 1}`;
    const variant  = pickRandom(['Pro','Plus','Max','Ultra','Lite','SE','Premium','Basic','Elite','Standard','Advanced','Select','Signature']);
    const name     = `${brandName} ${tpl.n}${suffix ? '' : ''} ${i >= productTemplates.length ? variant : ''}`.trim();
    const { price, compare_price } = makePrice(tpl.base, tpl.max);
    const f        = flags(i, totalProducts);
    const id       = nextId();
    const productSlug = slug(`${name}-${id}`);
    const sku      = `SKU-${catSlug.toUpperCase().replace(/-/g,'').slice(0,6)}-${String(i+1).padStart(4,'0')}`;
    const stock    = rand(10, 500);
    const weight   = tpl.w;

    rows.push(csvRow({
      id,
      name,
      slug:         productSlug,
      description:  `${name} — ${tpl.n.toLowerCase()} from ${brandName}. High quality ${tpl.n.toLowerCase()} designed for everyday use. In stock and ready to ship.`,
      price,
      compare_price,
      category_id:  def.catId,
      brand_id:     brandId,
      sku,
      stock,
      weight,
      is_featured:    f.is_featured,
      is_best_seller: f.is_best_seller,
      is_flash_sale:  f.is_flash_sale,
      is_new_arrival: f.is_new_arrival,
      tags:         def.tags(),
      specifications: def.specs(tpl),
    }));
  }
  return rows;
}

// ─── main ─────────────────────────────────────────────────────────
function main() {
  console.log('🛍️  ShopVerse — Generating 100 products per category\n');

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // cameras & cameras-photography share a file — skip duplicate
  const seen = new Set();

  for (const [catSlug, def] of Object.entries(CATEGORIES)) {
    if (seen.has(def.file)) {
      console.log(`  ↷ Skipping ${catSlug} (file already written: ${def.file})`);
      continue;
    }
    seen.add(def.file);

    const rows    = generateCategory(catSlug, def);
    const outPath = path.join(OUT_DIR, def.file);
    const content = [CSV_HEADER, ...rows].join('\n');
    fs.writeFileSync(outPath, content, 'utf8');
    console.log(`  ✓ ${def.file} — ${rows.length} products`);
  }

  console.log(`\n✅ Done! All CSV files written to: docs/data/\n`);
}

main();
