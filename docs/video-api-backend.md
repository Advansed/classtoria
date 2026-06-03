# Контракт API для видео фотосессии

Фронтенд вызывает эти методы после загрузки файлов в S3 через `upload_url`.

## Пути в S3

```
{classId}/{eventId}/{collectionId}/{imageId}/video.{ext}
{classId}/{eventId}/{collectionId}/{imageId}/preview.jpg
```

`{ext}` — расширение исходного файла (mp4, mov, webm и т.д.).  
`image_id` — UUID, как у фото в коллекции.

На клиенте: только проверка длительности **не больше 1 минуты**, без перекодирования.

## `add_video`

```json
{
  "token": "...",
  "collection_id": "...",
  "image_id": "...",
  "file": "{classId}/{eventId}/{collectionId}/{imageId}/video.mp4",
  "preview": "{classId}/{eventId}/{collectionId}/{imageId}/preview.jpg",
  "fileurl": "https://...",
  "previewurl": "https://...",
  "duration": "1:23"
}
```

Ответ: `{ "success": true }`. Поля коллекции в `get_class` / `get_event`: `video_url`, `video_preview`, `video_duration`, опционально `video_image_id`.

## `del_video`

```json
{
  "token": "...",
  "collection_id": "...",
  "image_id": "..."
}
```

Удаляет привязку видео к коллекции (файлы в S3 фронт удаляет через `del_files3`).
