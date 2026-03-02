// @ts-check

// Загружаем .env файл, если существует (quiet: true отключает логи dotenv)
require('dotenv').config({ quiet: true });

/**
 * @typedef {Object} Partner
 * @property {string} name - Название партнёра
 * @property {string} url - URL для тестирования
 */

// Партнёры по умолчанию (используются, если не заданы через ENV)
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
 * Формат: JSON-массив объектов {name, url} или JSON-объект с именованными URL
 * @returns {Partner[] | null}
 */
function parsePartnersFromEnv() {
  const partnersEnv = process.env.PARTNERS;
  if (!partnersEnv) {
    return null;
  }

  try {
    const parsed = JSON.parse(partnersEnv);

    // Если массив — возвращаем как есть
    if (Array.isArray(parsed)) {
      return parsed.filter(p => p.name && p.url);
    }

    // Если объект { "Partner Name": "url", ... } — конвертируем в массив
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
  // ============================================================================
  // Таймауты
  // ============================================================================
  TIMEOUTS: {
    // Ожидание появления виджета на странице
    WIDGET: process.env.CI ? 60000 : 30000,
    // Ожидание загрузки содержимого iframe
    FRAME_CONTENT: 15000,
    // Ожидание появления кнопки Track
    TRACK_BUTTON: 15000,
    // Ожидание появления формы авторизации после клика Track
    AUTHORIZATION_FORM: 15000,
    // Общий таймаут для поиска элементов
    ELEMENT: 10000
  },

  // Минимальный размер виджета (px).
  // Значение 30px отфильтровывает:
  // - схлопнутые/скрытые элементы (0x0 или 1x1)
  // - лоадеры/спиннеры (обычно 16-24px)
  // - элементы, которые ещё не отрендерились
  // Виджет чата должен быть значительно больше (~300-400px)
  MIN_WIDGET_SIZE: 30,

  // Ожидаемое количество iframe: основной виджет + iframe "медальки" (wsf_medal)
  EXPECTED_IFRAME_COUNT: 2,

  // Общий таймаут теста
  TEST_TIMEOUT: process.env.CI ? 120000 : 60000,

  // ============================================================================
  // Селекторы
  // ============================================================================
  selectors: {
    // Основной виджет
    WIDGET: '#winespot',
    // Медалька для открытия чата
    MEDAL: '#wsf_medal',
    // Клик-зона медальки
    MEDAL_FACE: '.face',
    // Кнопка "Track and manage my orders" — используем data-атрибут для стабильности
    // Селектор по атрибуту sendtochat более стабибелен, чем по тексту
    TRACK_BUTTON: '[sendtochat*="Track"]',
    // Ожидаемый текст кнопки Track (для проверки)
    TRACK_BUTTON_TEXT: 'Track and manage my orders',
    // Имя поля email в форме авторизации
    EMAIL_FIELD_NAME: 'johndoe@email.com',
    // Селектор для поля email (форма авторизации)
    EMAIL_FIELD: 'input[type="email"]'
  },

  // ============================================================================
  // Партнёры для тестирования
  // ============================================================================
  // Использует PARTNERS из ENV, если задан, иначе — DEFAULT_PARTNERS
  partners: parsePartnersFromEnv() || DEFAULT_PARTNERS
};
