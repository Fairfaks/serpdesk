#!/bin/zsh

set -u

readonly APP_PATH="/Applications/SerpDesk.app"
readonly EXPECTED_BUNDLE_ID="ru.fairf.serpdesk"

show_message() {
  /bin/echo "$1"
  /usr/bin/osascript -e "display dialog \"$1\" buttons {\"OK\"} default button \"OK\" with title \"SerpDesk\""
}

if [[ ! -d "$APP_PATH" ]]; then
  show_message "Сначала перетащите SerpDesk в папку «Программы», затем запустите этот помощник ещё раз."
  exit 1
fi

bundle_id=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP_PATH/Contents/Info.plist" 2>/dev/null || true)
if [[ "$bundle_id" != "$EXPECTED_BUNDLE_ID" ]]; then
  show_message "В папке «Программы» найдено другое приложение с именем SerpDesk. Карантинная метка не изменена."
  exit 1
fi

if ! /usr/bin/xattr -dr com.apple.quarantine "$APP_PATH"; then
  show_message "Не удалось разрешить запуск SerpDesk. Попробуйте переместить приложение в «Программы» вручную и повторить."
  exit 1
fi

if /usr/bin/xattr -p com.apple.quarantine "$APP_PATH" >/dev/null 2>&1; then
  show_message "macOS не сняла карантинную метку. Для установки потребуется подпись Apple Developer ID."
  exit 1
fi

/usr/bin/open "$APP_PATH"
/bin/echo "Готово. Карантин снят только с SerpDesk, приложение запущено."
