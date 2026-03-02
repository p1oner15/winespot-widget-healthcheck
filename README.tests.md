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

## Структура тестов

- `tests/widget.spec.js` — основные тесты:
  - Видимость виджета на странице
  - Открытие чата и переход на форму авторизации
- `tests/debug-chat.spec.js` — отладочные тесты для исследования структуры чата

## Партнёры для тестирования

Тесты запускаются для следующих партнёров:
- Scott Harvey Winery (staging)
- Tank Garage Winery (staging)

Для добавления нового партнёра отредактируйте `tests/config.js`.

## CI/CD

Тесты запускаются автоматически через GitHub Actions при:
- Push в ветки `main` / `master`
- Pull Request
- Ручном запуске через `workflow_dispatch`

Отчёт о тестах сохраняется в артефактах GitHub Actions.

## Результаты тестов

- `test-results/` — детальные результаты (не коммитятся)
- `playwright-report/` — HTML-отчёт (не коммитится)
- `screenshots/` — скриншоты при падении тестов
