# Widget Visibility Tests

Автоматизированные тесты для проверки видимости и функциональности виджета WineSpot.

## Требования

- Node.js 18+
- npm

## Установка

```bash
npm install
npx playwright install
```

## Запуск тестов

```bash
# Все тесты (Chromium + Mobile Chrome)
npm test

# Тесты в определённом браузере
npx playwright test --project=chromium
npx playwright test --project="Mobile Chrome"

# Тесты в режиме браузера (headed)
npm run test:headed

# Тесты в режиме отладки
npm run test:debug

# Тесты с UI
npm run test:ui
```

## Конфигурация

Конфигурация находится в `tests/config.js`.

### .env файл

Для локальной разработки создайте файл `.env` в корне проекта:

```bash
cp .env.example .env
```

### Переменные окружения

| Переменная | Описание | По умолчанию (локально) | По умолчанию (CI) |
|------------|----------|-------------------------|-------------------|
| `CI` | Режим CI (влияет на таймауты и retry) | — | `true` |
| `PARTNERS` | Список партнёров для тестирования (JSON) | — | — |

### Партнёры через ENV

Можно переопределить список партнёров без изменения кода через переменную `PARTNERS`:

**Вариант 1: Массив объектов**
```bash
export PARTNERS='[{"name":"Partner 1","url":"https://example.com/p1"},{"name":"Partner 2","url":"https://example.com/p2"}]'
npm test
```

**Вариант 2: Объект с именованными URL**
```bash
export PARTNERS='{"Partner 1":"https://example.com/p1","Partner 2":"https://example.com/p2"}'
npm test
```

**Вариант 3: Через `.env` файл**
```bash
# .env
PARTNERS=[{"name":"Partner 1","url":"https://example.com/p1"}]
```

**Вариант 4: В CI/CD (GitHub Actions)**
```yaml
env:
  PARTNERS: '[{"name":"New Partner","url":"https://example.com/new"}]'
```

Если `PARTNERS` не задан — используются партнёры по умолчанию из `config.js`.

### Таймауты (в `tests/config.js`)

| Параметр | Описание | Значение |
|----------|----------|----------|
| `TIMEOUTS.WIDGET` | Ожидание появления виджета | 30000 / 60000 (CI) |
| `TIMEOUTS.FRAME_CONTENT` | Ожидание загрузки iframe | 15000 |
| `TIMEOUTS.TRACK_BUTTON` | Ожидание кнопки Track | 15000 |
| `TIMEOUTS.AUTHORIZATION_FORM` | Ожидание формы авторизации | 15000 |
| `TIMEOUTS.ELEMENT` | Общий таймаут элементов | 10000 |
| `TEST_TIMEOUT` | Общий таймаут теста | 60000 / 120000 (CI) |

### Другие параметры

| Параметр | Описание | Значение |
|----------|----------|----------|
| `MIN_WIDGET_SIZE` | Минимальный размер виджета (px) | 30 |
| `EXPECTED_IFRAME_COUNT` | Ожидаемое количество iframe | 2 |

## Структура проекта

```
tests/
├── config.js          # Конфигурация: таймауты, селекторы, партнёры
├── fixtures.js        # Фикстуры Playwright для тестов
├── widget.helper.js   # Helper: валидация виджета, работа с iframe, e2e-сценарии
└── widget.spec.js     # Спецификации тестов
```

### Helper-функции (`tests/widget.helper.js`)

| Функция | Описание |
|---------|----------|
| `validateWidget(page, index)` | Полная валидация виджета: стили, размеры, положение. **Логирует каждую ошибку** |
| `expectWidgetsVisible(page)` | Ожидание и проверка видимости виджетов |
| `getWidgetFrame(page)` | Получение `FrameLocator` для iframe виджета |
| `performTrackScenario(page)` | E2e-сценарий: открытие чата → клик Track → форма авторизации |

### Фикстуры (`tests/fixtures.js`)

Централизованная обработка ошибок и скриншотов. Playwright автоматически делает скриншоты при падении тестов (настроено в `playwright.config.js`).

## Партнёры для тестирования

Тесты запускаются для следующих партнёров:
- Scott Harvey Winery (staging)
- Tank Garage Winery (staging)

Для добавления нового партнёра отредактируйте массив `partners` в `tests/config.js`.

## Браузеры

Тесты запускаются в:
- **Chromium Desktop** — основная конфигурация
- **Mobile Chrome (Pixel 5)** — мобильная версия

## CI/CD

Тесты запускаются автоматически через GitHub Actions при:
- Push в ветки `main` / `master`
- Pull Request
- Ручном запуске через `workflow_dispatch`

### Запуск в GitHub Actions

#### 1. Автоматический запуск (при push/PR)

Тесты запускаются автоматически для всех партнёров из `tests/config.js`.

#### 2. Ручной запуск с кастомными партнёрами

1. Перейдите в **Actions** → **Widget Visibility Tests**
2. Нажмите **Run workflow**
3. В поле **Partners** укажите JSON-массив:

```json
[{"name":"Partner 1","url":"https://partner1.com"},{"name":"Partner 2","url":"https://partner2.com"}]
```

4. Нажмите **Run workflow**

#### 3. Запуск с конкретным браузером

Workflow запускает тесты параллельно в:
- `chromium` — Desktop Chrome
- `Mobile Chrome` — Pixel 5

Отчёты загружаются как артефакты: `playwright-report-chromium`, `playwright-report-Mobile Chrome`.

### Добавление новых партнёров

#### Вариант 1: В коде (по умолчанию)

Отредактируйте `DEFAULT_PARTNERS` в `tests/config.js`:

```javascript
const DEFAULT_PARTNERS = [
  {
    name: 'Scott Harvey Winery (staging)',
    url: 'https://staging.getwinespot.com/scottharveywinery-staging/index.html'
  },
  // Добавьте нового партнёра:
  {
    name: 'New Partner',
    url: 'https://newpartner.com/index.html'
  }
];
```

Закоммитьте изменения и запушьте — тесты запустятся автоматически.

#### Вариант 2: Через GitHub Actions (без изменения кода)

При ручном запуске workflow укажите параметр `partners`:

```json
[{"name":"New Partner","url":"https://newpartner.com"}]
```

#### Вариант 3: Через переменную окружения в workflow

Отредактируйте `.github/workflows/widget-tests.yml`:

```yaml
env:
  CI: true
  PARTNERS: '[{"name":"New Partner","url":"https://newpartner.com"}]'
```

## Результаты тестов

- `test-results/` — детальные результаты, видео, скриншоты (не коммитятся)
- `playwright-report/` — HTML-отчёт (не коммитится)
- `screenshots/` — скриншоты при падении (генерируются автоматически Playwright)

Для просмотра HTML-отчёта:

```bash
npx playwright show-report
```

## Принципы тестирования

- **Никаких `waitForTimeout`** — только ожидания по состоянию DOM/UI
- **Детерминированность** — тесты должны быть стабильными и воспроизводимыми
- **Атомарные проверки** — каждая проверка независима и понятна
- **Централизованная валидация** — логика проверки виджета в одном месте
- **Понятные сообщения об ошибках** — каждый `expect` с осмысленным описанием
- **Логирование проблем** — при валидации виджета каждая ошибка логируется в консоль
- **Стабильные селекторы** — используем data-атрибуты вместо текста (текст может меняться)

### Стабильные селекторы

Кнопка "Track and manage my orders" выбирается по атрибуту `sendtochat`, а не по тексту:

```javascript
// ✅ Хорошо: селектор по атрибуту
TRACK_BUTTON: '[sendtochat*="Track"]'

// ❌ Плохо: селектор по тексту (может меняться)
TRACK_BUTTON: 'text=Track and manage my orders'
```

После нахождения элемента текст проверяется отдельно для отладки.
