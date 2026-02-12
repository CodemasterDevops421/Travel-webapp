require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const {
  searchPlaces,
  searchRates,
  getHotelDetails,
  prebookRate,
  bookRate
} = require('./lib/liteapi');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const LITEAPI_KEY = process.env.LITEAPI_API_KEY || process.env.LITEAPI_KEY;

if (!LITEAPI_KEY) {
  throw new Error('Missing LiteAPI key environment variable. Set LITEAPI_API_KEY (preferred) or LITEAPI_KEY.');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.set('trust proxy', 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me-now',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: IS_PROD, sameSite: 'lax' }
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

function parseGuests(input) {
  const value = Number(input);
  if (!Number.isInteger(value) || value < 1 || value > 8) {
    return 2;
  }
  return value;
}

function validateDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function mapRateSummary(rate) {
  const total = rate.retailRate?.total?.[0];
  const taxesIncluded = (rate.retailRate?.taxesAndFees || []).some((t) => t.included);
  return {
    amount: total?.amount ?? null,
    currency: total?.currency ?? 'USD',
    taxesIncluded,
    refundableTag: rate.cancellationPolicies?.refundableTag || 'N/A',
    boardName: rate.boardName || 'N/A'
  };
}

function mergeAiHotelCards(hotels, ratesData) {
  const byHotelId = new Map((ratesData || []).map((item) => [item.hotelId, item]));
  return (hotels || []).map((hotel) => {
    const rate = byHotelId.get(hotel.id);
    const firstRate = rate?.roomTypes?.[0]?.rates?.[0];
    return {
      hotelId: hotel.id,
      name: hotel.name,
      address: hotel.address,
      image: hotel.main_photo,
      rating: hotel.rating,
      tags: hotel.tags || [],
      persona: hotel.persona,
      style: hotel.style,
      story: hotel.story,
      offer: rate?.roomTypes?.[0]
        ? {
            offerId: rate.roomTypes[0].offerId,
            ...mapRateSummary(firstRate),
            roomName: firstRate?.name || 'Room'
          }
        : null
    };
  });
}

function mergePlaceHotelCards(data) {
  return (data || []).map((hotelRate) => {
    const firstRate = hotelRate?.roomTypes?.[0]?.rates?.[0];
    const hotel = hotelRate.hotel || hotelRate.hotelData || {};
    return {
      hotelId: hotelRate.hotelId,
      name: hotel.name || `Hotel ${hotelRate.hotelId}`,
      address: hotel.address || '',
      image: hotel.main_photo || hotel.defaultImage || '',
      rating: hotel.starRating || null,
      tags: [],
      offer: hotelRate?.roomTypes?.[0]
        ? {
            offerId: hotelRate.roomTypes[0].offerId,
            ...mapRateSummary(firstRate),
            roomName: firstRate?.name || 'Room'
          }
        : null
    };
  });
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'travel-webapp' });
});

app.get('/', (_req, res) => {
  res.render('index', {
    apiEnv: LITEAPI_KEY.startsWith('prod_') ? 'live' : 'sandbox'
  });
});

app.get('/api/places', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ data: [] });
    }
    const results = await searchPlaces(LITEAPI_KEY, q);
    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/search', async (req, res, next) => {
  try {
    const { mode, placeId, aiSearch, checkin, checkout } = req.body;
    const adults = parseGuests(req.body.guests);
    if (!validateDate(checkin) || !validateDate(checkout)) {
      return res.status(400).json({ error: 'Invalid checkin/checkout date format.' });
    }

    const basePayload = {
      occupancies: [{ adults }],
      currency: 'USD',
      guestNationality: 'US',
      checkin,
      checkout,
      roomMapping: true,
      maxRatesPerHotel: 1,
      includeHotelData: true
    };

    if (mode === 'destination') {
      if (!placeId) {
        return res.status(400).json({ error: 'placeId is required for destination mode.' });
      }
      const data = await searchRates(LITEAPI_KEY, { ...basePayload, placeId });
      const hotels = mergePlaceHotelCards(data.data);
      return res.json({ hotels, raw: data });
    }

    if (mode === 'vibe') {
      if (!aiSearch || String(aiSearch).trim().length < 3) {
        return res.status(400).json({ error: 'aiSearch text is required for vibe mode.' });
      }
      const data = await searchRates(LITEAPI_KEY, { ...basePayload, aiSearch: String(aiSearch).trim() });
      const hotels = mergeAiHotelCards(data.hotels, data.data);
      return res.json({ hotels, raw: data });
    }

    return res.status(400).json({ error: 'Invalid search mode.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/hotel/:hotelId', async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { checkin, checkout } = req.query;
    const adults = parseGuests(req.query.guests);

    if (!validateDate(checkin) || !validateDate(checkout)) {
      return res.status(400).send('Invalid dates provided.');
    }

    const [hotelDetails, rates] = await Promise.all([
      getHotelDetails(LITEAPI_KEY, hotelId),
      searchRates(LITEAPI_KEY, {
        hotelIds: [hotelId],
        occupancies: [{ adults }],
        currency: 'USD',
        guestNationality: 'US',
        checkin,
        checkout,
        roomMapping: true,
        includeHotelData: true
      })
    ]);

    const roomsMap = new Map((hotelDetails.data.rooms || []).map((room) => [room.id, room]));
    const roomGroups = new Map();

    (rates.data?.[0]?.roomTypes || []).forEach((roomType) => {
      const mappedId = roomType.rates?.[0]?.mappedRoomId || `unmapped-${roomType.offerId}`;
      if (!roomGroups.has(mappedId)) {
        const roomData = roomsMap.get(mappedId);
        roomGroups.set(mappedId, {
          mappedRoomId: mappedId,
          roomName: roomData?.roomName || roomType.rates?.[0]?.name || 'Room',
          roomImage: roomData?.photos?.[0]?.url || hotelDetails.data.main_photo,
          offers: []
        });
      }
      roomGroups.get(mappedId).offers.push({
        offerId: roomType.offerId,
        rates: (roomType.rates || []).map((rate) => ({
          name: rate.name,
          boardName: rate.boardName,
          ...mapRateSummary(rate),
          cancelTime: rate.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime || null
        }))
      });
    });

    return res.render('hotel', {
      hotel: hotelDetails.data,
      roomGroups: Array.from(roomGroups.values()),
      query: { checkin, checkout, guests: adults }
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/checkout/start', async (req, res, next) => {
  try {
    const { offerId, hotelId, checkin, checkout, guests } = req.body;
    if (!offerId || !hotelId) {
      return res.status(400).send('Missing offerId/hotelId');
    }

    const prebook = await prebookRate(LITEAPI_KEY, offerId);
    req.session.checkout = {
      prebook: prebook.data,
      hotelId,
      checkin,
      checkout,
      guests: parseGuests(guests)
    };

    return res.redirect('/checkout');
  } catch (error) {
    return next(error);
  }
});

app.get('/checkout', async (req, res, next) => {
  try {
    const checkout = req.session.checkout;
    if (!checkout?.prebook) {
      return res.redirect('/');
    }

    const hotelDetails = await getHotelDetails(LITEAPI_KEY, checkout.hotelId);

    return res.render('checkout', {
      prebook: checkout.prebook,
      hotel: hotelDetails.data,
      apiEnv: LITEAPI_KEY.startsWith('prod_') ? 'live' : 'sandbox'
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/checkout/guest', (req, res) => {
  const { firstName, lastName, email } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'All guest fields are required.' });
  }
  if (!req.session.checkout?.prebook) {
    return res.status(400).json({ error: 'Checkout session expired.' });
  }

  req.session.checkout.guest = { firstName, lastName, email };
  return res.json({ ok: true });
});

app.get('/confirmation', async (req, res, next) => {
  try {
    const { prebookId, transactionId } = req.query;
    const checkout = req.session.checkout;
    if (!checkout?.prebook || !checkout.guest) {
      return res.status(400).send('Missing checkout context.');
    }

    if (checkout.bookingResult && checkout.bookingResult.data?.bookingId) {
      return res.render('confirmation', {
        booking: checkout.bookingResult.data,
        hotel: checkout.hotelDetails || null
      });
    }

    if (prebookId !== checkout.prebook.prebookId || transactionId !== checkout.prebook.transactionId) {
      return res.status(400).send('Transaction mismatch.');
    }

    const payload = {
      prebookId,
      holder: { ...checkout.guest },
      payment: {
        method: 'TRANSACTION_ID',
        transactionId
      },
      guests: [
        {
          occupancyNumber: 1,
          ...checkout.guest
        }
      ]
    };

    const [bookingResult, hotelDetails] = await Promise.all([
      bookRate(LITEAPI_KEY, payload),
      getHotelDetails(LITEAPI_KEY, checkout.hotelId)
    ]);

    checkout.bookingResult = bookingResult;
    checkout.hotelDetails = hotelDetails.data;

    return res.render('confirmation', {
      booking: bookingResult.data,
      hotel: hotelDetails.data
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      description: error.description || 'Unexpected error'
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
