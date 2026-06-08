# Контракт API для видео в коллекции

Видео — **участник коллекции** наравне с фото: отдельный элемент в `collection.images[]` с `type: 'video'`. Отдельного «видеоролика фотосессии» на уровне коллекции больше нет.

Фронтенд регистрирует видео через **`add_image`** после загрузки файлов в S3 через `upload_url`.

## Пути в S3

```
{classId}/{eventId}/{collectionId}/{imageId}/video.{ext}
{classId}/{eventId}/{collectionId}/{imageId}/preview.jpg
```

`{ext}` — расширение исходного файла (mp4, mov, webm и т.д.).  
`image_id` — UUID, как у фото в коллекции.

На клиенте: только проверка длительности **не больше 1 минуты**, без перекодирования.

## `add_image` (видео)

Те же поля, что и для фото, плюс тип и длительность:

```json
{
  "token": "...",
  "collection_id": "...",
  "image_id": "...",
  "file": "{classId}/{eventId}/{collectionId}/{imageId}/video.mp4",
  "preview": "{classId}/{eventId}/{collectionId}/{imageId}/preview.jpg",
  "fileurl": "https://...",
  "previewurl": "https://...",
  "type": "video",
  "duration": "1:23"
}
```

Ответ: `{ "success": true }`.

В `get_class` / `get_event` видео возвращается в `collection.images[]`:

- `type: "video"` (или путь `.../video.{ext}`)
- `file`, `preview`, `image_id`
- опционально `duration`

## Удаление

Как у фото: `del_image` + `del_files3` для путей в хранилище.

## Устаревшее (legacy)

Ранее использовались `add_video` / `del_video` и поля коллекции `video_url`, `video_preview`, `video_duration`. Фронтенд по-прежнему **читает** legacy-поля для старых данных, но **не пишет** в них.
