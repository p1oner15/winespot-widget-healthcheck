// Конфигурация для тестов виджета

module.exports = {
  // Таймауты
  WIDGET_TIMEOUT: process.env.CI ? 60000 : 30000,  // 60 сек для CI, 30 сек локально
  MIN_WIDGET_SIZE: 30,          // Минимальный размер виджета (px).
                                // Значение 30px отфильтровывает:
                                // - схлопнутые/скрытые элементы (0x0 или 1x1)
                                // - лоадеры/спиннеры (обычно 16-24px)
                                // - элементы, которые ещё не отрендерились
                                // Виджет чата должен быть значительно больше (~300-400px)
  EXPECTED_IFRAME_COUNT: 2,     // Основной виджет + iframe "медальки" (wsf_medal)
  TEST_TIMEOUT: process.env.CI ? 120000 : 60000,  // 120 сек для CI, 60 сек локально
  
  // Партнёры для тестирования
  partners: [
    {
      name: 'Scott Harvey Winery (staging)',
      url: 'https://staging.getwinespot.com/scottharveywinery-staging/index.html'
    },
    {
      name: 'Tank Garage Winery (staging)',
      url: 'https://staging.getwinespot.com/tankgaragewinery-staging/index.html'
    }
  ]
};
