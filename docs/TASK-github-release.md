# Задача: публикация SerpDesk на GitHub — ссылка для скачивания + автообновления

## Что это даёт

1. Постоянная **ссылка для скачивания** (страница Releases) — не нужно слать людям
   файлы по 100 МБ, даёшь ссылку.
2. **Автообновления**: приложение само проверяет этот репозиторий и обновляется у
   всех, когда выкладывается новая версия (electron-updater уже встроен, см.
   `docs/AUTOUPDATE.md`).

Проект: SerpDesk (Electron, Node из Screaming Frog:
`export PATH="$HOME/.ScreamingFrogSEOSpider/node/5.1/node/bin:$PATH"`). Папка проекта
— `serpdesk/`. В `package.json` уже есть `build.publish` с ЗАГЛУШКОЙ
`owner: "YOUR_GITHUB_LOGIN"` и скрипт `npm run publish`.

## Дано

У пользователя есть аккаунт GitHub, и **Codex авторизован в нём через `gh` CLI** —
значит Codex делает ВСЁ сам (создаёт репозиторий, пушит, выкладывает релиз). Токен
руками выпускать не нужно — брать его из сессии `gh` (`gh auth token`).

Единственное решение за пользователем: **имя репозитория** (по умолчанию `serpdesk`)
и **публичный он или приватный** (по умолчанию — публичный, чтобы автообновления и
скачивание работали у всех без авторизации). Если сомнения — уточнить у пользователя.

## Что делает Codex (из папки `serpdesk/`)

1. **Проверить доступ и узнать логин:**
   ```bash
   gh auth status
   LOGIN=$(gh api user --jq .login)
   ```

2. **`.gitignore`** — создать/дополнить, ОБЯЗАТЕЛЬНО исключив то, что нельзя
   публиковать:
   ```
   node_modules/
   dist/
   *.sqlite
   *.sqlite.*
   *.log
   .DS_Store
   # ключи/секреты — НИКОГДА в репозиторий
   *.json.key
   mcp-*.json
   *-serviceaccount*.json
   ```
   ⚠️ В `dist/` сейчас физически лежит JSON-ключ Google-сервисаккаунта
   (`dist/mcp-*.json`). `dist/` целиком в .gitignore, но перед первым коммитом
   ОБЯЗАТЕЛЬНО проверить `git status`, что ни один `*.json`-ключ и ни один
   `*.sqlite` не попали в индекс. Секретов в исходниках нет (доступы XMLRiver/
   ЯВМ/GSC лежат в локальной базе пользователя в Application Support, не в проекте).

3. **package.json** → в `build.publish` заменить заглушку: `owner` = `$LOGIN`,
   `repo` = выбранное имя (по умолчанию `serpdesk`).

4. **Инициализировать репозиторий и создать его на GitHub одной командой:**
   ```bash
   git init
   git add -A
   git status                         # проверить: нет node_modules/dist/*.sqlite/*.json-ключей
   git commit -m "SerpDesk 1.4.0"
   git branch -M main
   gh repo create <repo> --public --source=. --remote=origin --push
   ```
   (Если репозиторий уже существует — `git remote add origin <url> && git push -u origin main`.
   Если пользователь не хочет публиковать исходный код — создать пустой публичный
   репозиторий без пуша исходников; для релизов и автообновлений достаточно, чтобы
   репозиторий существовал.)

5. **Собрать и выложить релиз** (dmg/zip/exe + `latest.yml`/`latest-mac.yml` в
   GitHub Releases; версия из package.json = 1.4.0):
   ```bash
   export PATH="$HOME/.ScreamingFrogSEOSpider/node/5.1/node/bin:$PATH"
   export GH_TOKEN=$(gh auth token)
   npm run publish
   ```
   Если dmgbuild на macOS упадёт с первого раза — повторить команду (транзиентный
   глют dmg-builder на macOS 26; со второго раза проходит).

6. **Опубликовать релиз** (electron-builder заливает его как ЧЕРНОВИК):
   ```bash
   gh release edit v1.4.0 --draft=false --latest
   ```

7. **Вывести пользователю ссылку для раздачи:**
   ```bash
   echo "https://github.com/$LOGIN/<repo>/releases/latest"
   ```

---

## Как выпускать следующие версии (памятка)

```bash
export PATH="$HOME/.ScreamingFrogSEOSpider/node/5.1/node/bin:$PATH"
npm version patch          # 1.4.0 → 1.4.1 (поднимает версию + git tag)
GH_TOKEN=$GH_TOKEN npm run publish
git push --follow-tags
```
Версия в package.json должна расти с каждым релизом — по ней приложение понимает,
что есть обновление. У всех установленных копий при запуске появится обновление.

## Как проверить, что всё сработало

1. Открывается `https://github.com/<owner>/<repo>/releases/latest`, там лежат
   `SerpDesk-1.4.0-mac-arm64.dmg`, `...-win-x64-setup.exe`, `...-portable.exe`,
   `latest.yml`, `latest-mac.yml`.
2. В `git status` не осталось секретов/`node_modules`/`dist`.
3. (Опционально, проверка автообновления) на установленной копии поднять версию,
   опубликовать 1.4.1 → старая копия при запуске должна предложить обновиться
   (меню SerpDesk → «Проверить обновления…» покажет доступное обновление).

## Ограничения/заметки

- Сборки не подписаны — при первом запуске у людей будут штатные предупреждения
  Gatekeeper (Mac) / SmartScreen (Windows). Это не мешает автообновлениям.
- Публичный репозиторий обязателен для автообновлений без авторизации получателей.
- Не коммитить: `node_modules/`, `dist/`, `*.sqlite`, любые JSON-ключи Google.
