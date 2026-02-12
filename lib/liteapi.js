const axios = require('axios');

const apiClient = axios.create({
  baseURL: 'https://api.liteapi.travel/v3.0',
  timeout: 15000,
  headers: {
    accept: 'application/json'
  }
});

const bookClient = axios.create({
  baseURL: 'https://book.liteapi.travel/v3.0',
  timeout: 20000,
  headers: {
    accept: 'application/json'
  }
});

function withHeaders(apiKey) {
  return {
    headers: {
      'X-API-Key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json'
    }
  };
}

function normalizeApiError(error) {
  const details = error?.response?.data?.error || error?.response?.data || {};
  return {
    status: error?.response?.status || 500,
    message: details?.message || error.message || 'LiteAPI request failed',
    description: details?.description || 'Unknown error',
    code: details?.code || 'LITEAPI_ERROR'
  };
}

async function searchPlaces(apiKey, q) {
  try {
    const response = await apiClient.get('/data/places', {
      params: { textQuery: q },
      headers: { 'X-API-Key': apiKey, accept: 'application/json' }
    });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

async function searchRates(apiKey, payload) {
  try {
    const response = await apiClient.post('/hotels/rates', payload, withHeaders(apiKey));
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

async function getHotelDetails(apiKey, hotelId) {
  try {
    const response = await apiClient.get('/data/hotel', {
      params: { hotelId, timeout: 4 },
      headers: { 'X-API-Key': apiKey, accept: 'application/json' }
    });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

async function prebookRate(apiKey, offerId) {
  try {
    const response = await bookClient.post(
      '/rates/prebook',
      { usePaymentSdk: true, offerId },
      withHeaders(apiKey)
    );
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

async function bookRate(apiKey, payload) {
  try {
    const response = await bookClient.post('/rates/book', payload, withHeaders(apiKey));
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

module.exports = {
  searchPlaces,
  searchRates,
  getHotelDetails,
  prebookRate,
  bookRate
};
