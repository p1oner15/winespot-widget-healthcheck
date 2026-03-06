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

### Установка браузеров

**Windows/Linux:**
```bash
# Установить Chrome и Edge
npx playwright install chrome msedge
```

**macOS:**
```bash
# Установить все браузеры (включая Safari)
npx playwright install
```

## Запуск тестов

```bash
# Все тесты (Chrome + Edge + Safari + Mobile)
npm test

# Тесты в определённом браузере
npx playwright test --project=Chrome
npx playwright test --project=Edge
npx playwright test --project=Safari
npx playwright test --project='Mobile Safari'
npx playwright test --project='Mobile Chrome'

# Несколько браузеров одновременно
npx playwright test --project=Chrome --project=Edge

# Только проверка наличия виджета (быстрый запуск)
npx playwright test --grep "presence"

# Только E2E тесты чата
npx playwright test --grep "hello"

# В режиме браузера (headed, не headless)
npm run test:headed

# В режиме отладки
npm run test:debug

# С UI для просмотра
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
├── config.js             # Конфигурация: таймауты, селекторы, партнёры
├── fixtures.js           # Фикстуры Playwright для тестов
├── widget.helper.js      # Helper: валидация виджета, работа с iframe, e2e-сценарии
└── smoke/
    ├── widget.smoke.spec.js      # E2E тесты: чат + ответ бота
    └── widget-presence.spec.js   # Быстрая проверка наличия виджета
```

### Типы тестов

| Файл | Описание | Время запуска | Когда использовать |
|------|----------|---------------|---------------------|
| `widget.smoke.spec.js` | Полноценный E2E: виджет → чат → ответ бота | ~15-20 сек | Основной сценарий, CI/CD |
| `widget-presence.spec.js` | Быстрая проверка наличия виджета | ~5-7 сек | Быстрая проверка, ручные запуски |

### Запуск отдельных типов тестов

```bash
# Только E2E тесты (чат + ответ бота)
npx playwright test --grep "hello"

# Только проверка наличия виджета
npx playwright test --grep "presence"

# Все тесты
npx playwright test
```

### Helper-функции (`tests/widget.helper.js`)

| Функция | Описание |
|---------|----------|
| `expectWidgetsVisible(page)` | Проверка видимости виджета: наличие iframe, стили, размеры, положение в viewport |
| `validateWidget(page, index)` | Полная валидация виджета с детальными ошибками |
| `getWidgetFrame(page)` | Получение `FrameLocator` для работы с содержимым iframe виджета |
| `performChatScenario(page)` | E2E сценарий: открытие чата → отправка "hello" → ожидание ответа бота |

## Партнёры для тестирования

Тесты запускаются для следующих партнёров:
- Scott Harvey Winery (staging)
- Tank Garage Winery (staging)

Для добавления нового партнёра отредактируйте массив `partners` в `tests/config.js`.

## Браузеры

### Основные браузеры для аудитории 45-50+ в Северной Америке

| Браузер | Доля рынка | Платформы | Локально | GitHub Actions |
|---------|------------|-----------|----------|----------------|
| **Chrome** | ~55-60% | Windows, macOS, Linux | ✅ Да | ✅ Да |
| **Safari** | ~25-30% | macOS, iOS | ✅ Только macOS | ✅ Да (macOS-раннер) |
| **Edge** | ~10-15% | Windows, macOS, Linux | ✅ Да | ✅ Да |
| **Mobile Safari** | ~15-20% | iOS (iPhone, iPad) | ✅ Эмуляция | ✅ Да (macOS-раннер) |
| **Mobile Chrome** | ~10-15% | Android, iOS | ✅ Да | ✅ Да |

> **Примечание:** Мобильные браузеры важны для аудитории 45-50+ — это растущий сегмент (~30-35% используют мобильные устройства как основные).

---

## 🖥️ Локальный запуск

### Windows/Linux

```bash
# Установить браузеры
npx playwright install chrome msedge

# Запустить все доступные тесты (Chrome + Edge + Mobile Chrome)
npm test

# Запустить в конкретном браузере
npx playwright test --project=Chrome
npx playwright test --project=Edge
npx playwright test --project='Mobile Chrome'

# Запустить несколько браузеров
npx playwright test --project=Chrome --project=Edge
```

### macOS

```bash
# Установить все браузеры (включая Safari)
npx playwright install

# Запустить все тесты (Chrome + Edge + Safari + Mobile Safari + Mobile Chrome)
npm test

# Запустить в конкретном браузере
npx playwright test --project=Chrome
npx playwright test --project=Edge
npx playwright test --project=Safari
npx playwright test --project='Mobile Safari'
npx playwright test --project='Mobile Chrome'
```

> **Примечание:** На Windows/Linux проекты Safari и Mobile Safari будут падать с ошибкой — это нормально. Используйте GitHub Actions для тестирования Safari.

---

## ☁️ GitHub Actions (CI/CD)

В CI/CD запускаются **все 5 браузеров** параллельно:

| Job | Раннер | Браузеры | Время |
|-----|--------|----------|-------|
| `test-chromium` | Ubuntu | Chrome, Edge | ~10 мин |
| `test-safari` | macOS | Safari, Mobile Safari | ~10-15 мин |
| `test-mobile-chrome` | Ubuntu | Mobile Chrome | ~5-10 мин |

### Автоматический запуск

Тесты запускаются автоматически при:
- Push в `main` / `master`
- Pull Request

### Ручной запуск

1. **Actions** → **Widget Visibility Tests** → **Run workflow**
2. (Опционально) Укажите партнёров в поле **Partners**:
   ```json
   [{"name":"Partner 1","url":"https://partner1.com"}]
   ```
3. **Run workflow**

### Лимиты GitHub Actions

| Тип репозитория | Минут в месяц |
|-----------------|---------------|
| Публичный | ∞ Безлимитно |
| Приватный | 500 минут |

Один полный прогон (все браузеры) занимает ~25-35 минут.

---

## Добавление новых партнёров

### Вариант 1: В коде (по умолчанию)

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
