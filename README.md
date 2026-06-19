# ASV Production — генератор аудио-превью 🎵

Веб-инструмент для музыкального сервиса [ASV Production](http://www.asvproduction.ru).
Пользователь выбирает **жанр / настроение / темп**, а нейросеть **MusicGen** генерирует
короткий аудио-хук (превью). Готовый трек можно обсудить с командой в Telegram.

> Запросы к нейросети идут с сервера (вне РФ), поэтому пользователю **не нужен VPN**.

## Стек

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- Серверный API-роут `app/api/generate` ходит к модели генерации
- Генерация: **Hugging Face** Inference API (бесплатно) или **Replicate** (платно) —
  переключается одной переменной `AUDIO_PROVIDER`
- Хостинг: **Railway** (авто-деплой из GitHub)
- Дизайн: тёмный космос, неон `#62e1d8`, шрифты Montserrat + Inter

## Возможности

- Выбор жанра (Pop, House, Hip-Hop, Trap, EDM)
- Выбор настроения (Summer, Romantic, Atmospheric, Energetic, Aggressive, Sad)
- Регулировка темпа (BPM)
- Генерация и прослушивание превью (скачивание отключено)
- CTA «Обсудить проект» → Telegram

## Локальный запуск

```bash
npm install
cp .env.example .env.local   # впиши свой HF_TOKEN
npm run dev                  # http://localhost:3000
```

## Переменные окружения

| Переменная             | Назначение                                            |
| ---------------------- | ----------------------------------------------------- |
| `AUDIO_PROVIDER`       | `huggingface` (по умолч.) или `replicate`             |
| `HF_TOKEN`             | Токен Hugging Face (бесплатный, тип Read)             |
| `REPLICATE_API_TOKEN`  | Токен Replicate (если выбран provider=replicate)      |

## Деплой

Проект подключён к Railway: каждый `git push` в `main` автоматически пересобирает и
деплоит приложение.
