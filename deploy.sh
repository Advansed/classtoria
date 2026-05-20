#!/bin/bash

# Набор переменных для удобства
SOURCE_DIR="/home/ubuntu/dev/classtoria/dist/"
TARGET_DIR="/var/www/html/"

echo "🚀 Начало деплоя проекта Classtoria..."

# 1. Проверяем, существует ли исходная директория
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Ошибка: Исходная директория $SOURCE_DIR не найдена!"
    echo "Сначала запустите сборку проекта (например, npm run build)."
    exit 1
fi

# 2. Очищаем целевую директорию перед копированием (удаляем старый релиз)
echo "🧹 Очистка целевой папки $TARGET_DIR..."
sudo rm -rf "${TARGET_DIR:?}"*

# 3. Копируем новые файлы
echo "📦 Копирование новых файлов из dist в html..."
# Слэш на конце SOURCE_DIR важен, чтобы копировалось содержимое, а не сама папка dist
sudo cp -r "$SOURCE_DIR"* "$TARGET_DIR"

# 4. Выставляем правильные права (владелец www-data для веб-сервера Nginx/Apache)
echo "🔒 Настройка прав доступа..."
sudo chown -R www-data:www-data "$TARGET_DIR"
sudo find "$TARGET_DIR" -type d -exec chmod 755 {} \;
sudo find "$TARGET_DIR" -type f -exec chmod 644 {} \;

echo "✅ Деплой успешно завершен!"