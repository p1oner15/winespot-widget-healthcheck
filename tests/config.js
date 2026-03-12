// @ts-check

require('dotenv').config({ quiet: true });

/**
 * @typedef {Object} Partner
 * @property {string} name - Название партнёра
 * @property {string} url - URL страницы для тестирования
 */

const DEFAULT_PARTNERS = [
  {
    name: 'Scott Harvey Winery (staging)',
    url: 'https://staging.getwinespot.com/scottharveywinery-staging/index.html'
  },
  {
    name: 'Tank Garage Winery (staging)',
    url: 'https://staging.getwinespot.com/tankgaragewinery-staging/index.html'
  }
];

/**
 * Парсит список партнёров из переменной окружения PARTNERS
 * @returns {Partner[] | null}
 */
function parsePartnersFromEnv() {
  const partnersEnv = process.env.PARTNERS;
  if (!partnersEnv) {
    return null;
  }

  try {
    const parsed = JSON.parse(partnersEnv);

    if (Array.isArray(parsed)) {
      return parsed.filter(p => p.name && p.url);
    }

    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([name, url]) => ({ name, url }));
    }

    return null;
  } catch (error) {
    console.warn('Не удалось распарсить PARTNERS из ENV:', error.message);
    return null;
  }
}

module.exports = {
  TIMEOUTS: {
    WIDGET: process.env.CI ? 90000 : 45000,
    FRAME_CONTENT: 15000,
    TRACK_BUTTON: 15000,
    AUTHORIZATION_FORM: process.env.CI ? 30000 : 20000,
    ELEMENT: 10000,
    CHAT_RESPONSE: process.env.CI ? 90000 : 45000
  },

  // Отфильтровывает скрытые элементы (0x0, лоадеры 16-24px)
  MIN_WIDGET_SIZE: 30,

  // Основной виджет + iframe медальки (wsf_medal)
  EXPECTED_IFRAME_COUNT: 2,

  TEST_TIMEOUT: process.env.CI ? 180000 : 90000,

  selectors: {
    WIDGET: '#winespot',
    MEDAL: '#wsf_medal',
    MEDAL_FACE: '.face',
    // Селектор по атрибуту надёжнее, чем по тексту
    TRACK_BUTTON: '[sendtochat*="Track"]',
    TRACK_BUTTON_TEXT: 'Track and manage my orders',
    EMAIL_FIELD_NAME: 'johndoe@email.com',
    EMAIL_FIELD: 'input[type="email"]'
  },

  partners: parsePartnersFromEnv() || DEFAULT_PARTNERS
};
