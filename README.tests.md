# Widget Visibility Tests

Автоматизированные тесты для проверки видимости и функциональности виджета WineSpot.

## Требования

- Node.js 18+
- npm

## Установка

```bash
npm install
npx playwright install chromium
```

## Запуск тестов

```bash
# Все тесты
npm test

# Тесты в режиме браузера (headed)
npm run test:headed

# Тесты в режиме отладки
npm run test:debug

# Тесты с UI
npm run test:ui
```

## Конфигурация

Конфигурация находится в `tests/config.js`. Можно переопределить через переменные окружения:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `WIDGET_TIMEOUT` | Таймаут ожидания виджета (мс) | 30000 |
| `MIN_WIDGET_SIZE` | Минимальный размер виджета (px) | 30 |
| `EXPECTED_IFRAME_COUNT` | Ожидаемое количество iframe | 2 |
| `TEST_TIMEOUT` | Общий таймаут теста (мс) | 60000 |

### Запуск для продакшена

Для запуска тестов на продакшене используйте переменную окружения `PARTNERS`:

```bash
# Один партнёр
PARTNERS='[{"name":"My Partner","url":"https://example.com/index.html"}]' npm test

# Несколько партнёров
PARTNERS='[{"name":"Partner 1","url":"https://example.com/p1"},{"name":"Partner 2","url":"https://example.com/p2"}]' npm test
```

## Структура тестов

```
tests/
├── config.js              # Конфигурация: таймауты, селекторы, партнёры
├── fixtures.js            # Фикстуры Playwright (скриншоты при падении)
├── widget.helper.js       # Вспомогательные функции для тестов
└── smoke/
    └── widget.smoke.spec.js  # Smoke-тесты виджета
```

### Smoke-тесты

Smoke-тесты проверяют базовую функциональность:

1. **Виджет отображается корректно**
   - Виджет найден в DOM (iframe #winespot)
   - Виджет видим (display !== 'none')
   - position: fixed
   - Размеры больше минимальных (> 30px)
   - Виджет в пределах viewport

2. **Открытие чата и переход к авторизации**
   - Чат открывается (клик по медальке или виджету)
   - Кнопка "Track and manage my orders" работает
   - Появляется форма авторизации с полем email

## Партнёры для тестирования

По умолчанию тесты запускаются для:
- Scott Harvey Winery (staging)
- Tank Garage Winery (staging)

Для добавления нового партнёра отредактируйте `tests/config.js` или используйте `PARTNERS` ENV.

## CI/CD

Тесты запускаются автоматически через GitHub Actions при:
- Push в ветки `main` / `master`
- Pull Request
- Ручном запуске через `workflow_dispatch`

Отчёт о тестах сохраняется в артефактах GitHub Actions.

## Результаты тестов

- `test-results/` — детальные результаты (не коммитятся)
- `playwright-report/` — HTML-отчёт (не коммитится, открыть: `npx playwright show-report`)
- `screenshots/` — скриншоты при падении тестов (не коммитятся)

## Отладка

Для отладки тестов создайте файл `tests/debug-*.spec.js` (игнорируется в CI):

```javascript
const { test, expect } = require('../fixtures');

test('debug: мой тест', async ({ page }) => {
  await page.goto('https://staging.getwinespot.com/...');
  // ...
});
```
