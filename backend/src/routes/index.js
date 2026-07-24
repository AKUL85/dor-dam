const express = require('express');
const axios = require('axios');
const scraperRoutes = require('./scraperRoutes');
const catalogRoutes = require('./catalogRoutes');
const { getPrisma, isAvailable } = require('../db/prisma');

const router = express.Router();

// Health/readiness probe.
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: isAvailable() ? 'connected' : 'disabled',
    timestamp: new Date().toISOString(),
  });
});

// Proxy function to forward POST requests to python FastAPI (port 8000)
async function proxyToFastAPI(req, res, path) {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:8000${path}`,
      data: req.body,
      params: req.query,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'FastAPI proxy error', message: error.message });
    }
  }
}

// --- Prisma database-backed routes ---

// GET /catalog/meta
router.get('/catalog/meta', async (_req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const totalPhones = await prisma.phone.count();
    const brands = await prisma.phoneModel.findMany({
      select: { brand: true },
      distinct: ['brand']
    });
    res.json({
      meta: {
        source: "GSMArena & Local Stores",
        generatedAt: new Date().toISOString(),
        totalBrands: brands.length,
        totalPhones
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /brands
router.get('/brands', async (_req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const brandsData = await prisma.phoneModel.findMany({
      select: { brand: true },
      distinct: ['brand']
    });
    const brands = await Promise.all(brandsData.map(async (b) => {
      const phoneCount = await prisma.phone.count({
        where: {
          model: {
            brand: b.brand
          }
        }
      });
      return {
        name: b.brand,
        slug: b.brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        phoneCount
      };
    }));
    res.json({ brands });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /phones
router.get('/phones', async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = 40;
    const search = req.query.search || '';
    const brandSlug = req.query.brand || '';

    const where = {};
    if (search) {
      where.OR = [
        { model: { brand: { contains: search, mode: 'insensitive' } } },
        { model: { model_name: { contains: search, mode: 'insensitive' } } },
        { variant_key: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (brandSlug) {
      const targetBrandSlug = brandSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const allBrands = await prisma.phoneModel.findMany({
        select: { brand: true },
        distinct: ['brand']
      });
      const matchedBrands = allBrands
        .map(b => b.brand)
        .filter(b => b.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === targetBrandSlug);
      
      if (matchedBrands.length > 0) {
        where.model = { brand: { in: matchedBrands } };
      } else {
        where.model = { brand: '__NON_EXISTENT__' };
      }
    }

    const total = await prisma.phone.count({ where });
    const phones = await prisma.phone.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        model: true,
        listings: true,
      },
      orderBy: {
        variant_key: 'asc'
      }
    });

    const items = phones.map(variant => {
      const model = variant.model;
      let priceHint = null;
      if (variant.listings && variant.listings.length > 0) {
        const prices = variant.listings.map(l => l.price).filter(p => p > 0);
        if (prices.length > 0) {
          priceHint = `${Math.min(...prices).toLocaleString()} BDT`;
        }
      }
      return {
        slug: variant.variant_key,
        brand: model.brand,
        name: `${model.brand} ${model.model_name} (${variant.ram}GB/${variant.storage}GB)`,
        image: model.image_url,
        releaseYear: model.release_year,
        releaseDate: null,
        status: variant.listings.some(l => l.in_stock) ? "In Stock" : "Out of Stock",
        popularity: null,
        priceHint: priceHint || "TBD",
        keySpecs: {
          ram: variant.ram ? `${variant.ram} GB` : null,
          storage: variant.storage ? `${variant.storage} GB` : null,
          chipset: variant.chipset || null,
          battery: variant.battery || null,
          camera: variant.camera || null,
          display: null,
          os: null,
          network: null
        }
      };
    });

    res.json({
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      sort: "popularity",
      items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /phones/:slug
router.get('/phones/:slug', async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const { slug } = req.params;
    const variant = await prisma.phone.findFirst({
      where: { variant_key: slug },
      include: {
        model: true,
        listings: {
          include: {
            store: true
          }
        }
      }
    });
    if (!variant) {
      return res.status(404).json({ error: 'Phone not found' });
    }
    const model = variant.model;
    let priceHint = null;
    if (variant.listings && variant.listings.length > 0) {
      const prices = variant.listings.map(l => l.price).filter(p => p > 0);
      if (prices.length > 0) {
        priceHint = `${Math.min(...prices).toLocaleString()} BDT`;
      }
    }

    const phoneDetail = {
      slug: variant.variant_key,
      brand: model.brand,
      modelName: `${model.brand} ${model.model_name} (${variant.ram}GB/${variant.storage}GB)`,
      imageUrl: model.image_url,
      thumb: model.image_url,
      releaseYear: model.release_year,
      releaseDate: null,
      status: variant.listings.some(l => l.in_stock) ? "In Stock" : "Out of Stock",
      popularity: null,
      priceHint: priceHint || "TBD",
      keySpecs: {
        ram: variant.ram ? `${variant.ram} GB` : null,
        storage: variant.storage ? `${variant.storage} GB` : null,
        chipset: variant.chipset || null,
        battery: variant.battery || null,
        camera: variant.camera || null,
        display: null,
        os: null,
        network: null
      },
      quickSpecs: {
        released: model.release_year ? String(model.release_year) : null,
        body: "—",
        os: "—",
        storage: variant.storage ? `${variant.storage} GB` : null,
      },
      specs: {
        "Network": {
          "Technology": "5G / 4G / 3G / 2G"
        },
        "Launch": {
          "Announced": model.release_year ? String(model.release_year) : "—",
          "Status": variant.listings.some(l => l.in_stock) ? "Available" : "Out of Stock"
        },
        "Platform": {
          "Chipset": variant.chipset || "—",
        },
        "Memory": {
          "Internal": `${variant.storage || '—'} GB, ${variant.ram || '—'} GB RAM`
        },
        "Camera": {
          "Primary": variant.camera || "—"
        },
        "Battery": {
          "Capacity": variant.battery || "—"
        },
        "Listings": {}
      }
    };

    variant.listings.forEach(l => {
      phoneDetail.specs["Listings"][l.store.name] = `${l.price.toLocaleString()} BDT (${l.in_stock ? 'In Stock' : 'Out of Stock'}) - [View Product](${l.product_url})`;
    });

    res.json({ phone: phoneDetail });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /compare
router.get('/compare', async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const slugs = req.query.slugs ? req.query.slugs.split(',') : [];
    const phones = await Promise.all(slugs.map(async (slug) => {
      const variant = await prisma.phone.findFirst({
        where: { variant_key: slug },
        include: {
          model: true,
          listings: {
            include: {
              store: true
            }
          }
        }
      });
      if (!variant) return null;
      const model = variant.model;
      let priceHint = null;
      if (variant.listings && variant.listings.length > 0) {
        const prices = variant.listings.map(l => l.price).filter(p => p > 0);
        if (prices.length > 0) {
          priceHint = `${Math.min(...prices).toLocaleString()} BDT`;
        }
      }
      const phoneDetail = {
        slug: variant.variant_key,
        brand: model.brand,
        modelName: `${model.brand} ${model.model_name} (${variant.ram}GB/${variant.storage}GB)`,
        imageUrl: model.image_url,
        thumb: model.image_url,
        releaseYear: model.release_year,
        releaseDate: null,
        status: variant.listings.some(l => l.in_stock) ? "In Stock" : "Out of Stock",
        popularity: null,
        priceHint: priceHint || "TBD",
        keySpecs: {
          ram: variant.ram ? `${variant.ram} GB` : null,
          storage: variant.storage ? `${variant.storage} GB` : null,
          chipset: variant.chipset || null,
          battery: variant.battery || null,
          camera: variant.camera || null,
          display: null,
          os: null,
          network: null
        },
        quickSpecs: {
          released: model.release_year ? String(model.release_year) : null,
          body: "—",
          os: "—",
          storage: variant.storage ? `${variant.storage} GB` : null,
        },
        specs: {
          "Network": {
            "Technology": "5G / 4G / 3G / 2G"
          },
          "Launch": {
            "Announced": model.release_year ? String(model.release_year) : "—",
            "Status": variant.listings.some(l => l.in_stock) ? "Available" : "Out of Stock"
          },
          "Platform": {
            "Chipset": variant.chipset || "—",
          },
          "Memory": {
            "Internal": `${variant.storage || '—'} GB, ${variant.ram || '—'} GB RAM`
          },
          "Camera": {
            "Primary": variant.camera || "—"
          },
          "Battery": {
            "Capacity": variant.battery || "—"
          },
          "Listings": {}
        }
      };
      variant.listings.forEach(l => {
        phoneDetail.specs["Listings"][l.store.name] = `${l.price.toLocaleString()} BDT (${l.in_stock ? 'In Stock' : 'Out of Stock'}) - [View Product](${l.product_url})`;
      });
      return phoneDetail;
    }));

    res.json({ phones: phones.filter(p => p !== null) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /search
router.get('/search', async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const q = req.query.q || '';
    const limit = parseInt(req.query.limit) || 8;
    const models = await prisma.phoneModel.findMany({
      where: {
        OR: [
          { brand: { contains: q, mode: 'insensitive' } },
          { model_name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        variants: {
          include: {
            listings: true,
          },
        },
      },
    });
    const results = [];
    for (const model of models) {
      for (const variant of model.variants) {
        let priceHint = null;
        if (variant.listings && variant.listings.length > 0) {
          const prices = variant.listings.map(l => l.price).filter(p => p > 0);
          if (prices.length > 0) {
            priceHint = `${Math.min(...prices).toLocaleString()} BDT`;
          }
        }
        results.push({
          slug: variant.variant_key,
          brand: model.brand,
          name: `${model.brand} ${model.model_name} (${variant.ram}GB/${variant.storage}GB)`,
          image: model.image_url,
          releaseYear: model.release_year,
          releaseDate: null,
          status: variant.listings.some(l => l.in_stock) ? "In Stock" : "Out of Stock",
          popularity: null,
          priceHint: priceHint || "TBD",
          keySpecs: {
            ram: variant.ram ? `${variant.ram} GB` : null,
            storage: variant.storage ? `${variant.storage} GB` : null,
            chipset: variant.chipset || null,
            battery: variant.battery || null,
            camera: variant.camera || null,
            display: null,
            os: null,
            network: null,
          },
        });
      }
    }
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Proxy/FastAPI forward routes ---
router.post('/chat', (req, res) => proxyToFastAPI(req, res, '/chat'));
router.post('/recommend', (req, res) => proxyToFastAPI(req, res, '/recommend'));
router.post('/price', (req, res) => proxyToFastAPI(req, res, '/price'));
router.post('/update', (req, res) => proxyToFastAPI(req, res, '/update'));

router.use('/scrapers', scraperRoutes);
// GSMArena-style catalog API (brands, phones, search, compare).
router.use('/', catalogRoutes);

module.exports = router;
