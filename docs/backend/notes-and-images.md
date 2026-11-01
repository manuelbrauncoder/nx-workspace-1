# Notes and images

The notes feature is the example for CRUD in this base. A note has a title, a rich-text description and any number of images, up to a configured limit.

## Endpoints

| Endpoint                            | What it does                           |
| ----------------------------------- | -------------------------------------- |
| `GET /notes`                        | List own notes, newest first           |
| `POST /notes`                       | Create a note (JSON)                   |
| `GET /notes/:id`                    | Get one note                           |
| `PATCH /notes/:id`                  | Change title and/or description (JSON) |
| `DELETE /notes/:id`                 | Delete a note and its images           |
| `POST /notes/:id/images`            | Upload images (multipart)              |
| `GET /notes/:id/images/:imageId`    | Get an image file                      |
| `DELETE /notes/:id/images/:imageId` | Delete one image                       |

Request and response details are in the API reference at `/docs`.

## Ownership

Every user only sees and changes their own notes. All queries in [`notes.service.ts`](../../apps/express-api-base/src/features/notes/notes.service.ts) filter by the signed-in user's id. A note that belongs to someone else behaves exactly like one that does not exist: the API answers 404, never 403, so ids of other users' notes cannot be probed.

## Description sanitizing

The description is HTML from a rich-text editor. Because it will be rendered in a browser, the server cleans it before saving ([`notes.sanitize.ts`](../../apps/express-api-base/src/features/notes/notes.sanitize.ts)):

- **Kept:** the tags of `RICH_TEXT_TAGS` in [`@contracts/rich-text`](../../packages/contracts/src/rich-text.ts): `p`, `br`, `h2`, `h3`, `blockquote`, `strong`, `em`, `ul`, `ol`, `li`, `a`. The editor of the Angular app follows the same list, so the server keeps exactly what the editor can produce.
- **Links:** only `http`, `https` and `mailto` targets. Every link gets `target="_blank"` and `rel="noopener noreferrer nofollow"`.
- **Removed:** everything else, including `script`, `style`, `iframe`, `img`, event handlers such as `onclick`, and all other attributes.

Invalid HTML is not rejected; the unsafe parts are silently dropped. To allow more formatting (for example tables), extend `RICH_TEXT_TAGS` and add the format to the editor and the styles of the frontend.

## Images

### Upload

Note text and images travel separately. A client that creates a note with pictures makes two calls:

1. `POST /notes` with title and description as JSON. The response contains the note id.
2. `POST /notes/:id/images` with the files as `multipart/form-data`, all in the field `images`.

```ts
const form = new FormData();
for (const file of files) form.append('images', file);

await fetch(`${api}/notes/${noteId}/images`, {
  method: 'POST',
  body: form,
  credentials: 'include',
});
```

What the server does with an upload:

1. **Limits:** a file over `uploads.maxFileSizeMb` is answered with 413. More images than `uploads.maxImagesPerNote` (existing plus new) is answered with 400.
2. **Type check:** the real format is read from the file's bytes. Accepted are JPEG, PNG, WebP, AVIF and GIF. The file name and the content type sent by the client are ignored, so a renamed file does not get through.
3. **Processing:** the image is rotated according to its EXIF orientation, scaled down to `uploads.maxImageWidth` if it is wider, and re-encoded as WebP. This also removes metadata such as GPS coordinates. Images larger than 50 megapixels are refused, since a small file can declare huge dimensions. Several images of one request are processed one after another, so only one is decoded in memory at a time. The code is shared by every API app: [`packages/server/core/src/images.ts`](../../packages/server/core/src/images.ts).
4. **Storage:** the file is written to `uploads.dir` under a random name, and a row with its width and height is added to `note_images`.

An upload request is all-or-nothing: if one file is not a valid image, the request fails with 400 and none of the files are saved.

### Display

`GET /notes` and `GET /notes/:id` return each note with its image records:

```json
{ "id": "…", "width": 2000, "height": 1000, "createdAt": "…" }
```

The image itself is at `/notes/:id/images/:imageId`, which can be used directly as the `src` of an `<img>`. Width and height are included so the frontend can reserve the space before the image has loaded.

Images are **not** served as static files. The route checks the session and the ownership on every request, so an image URL is useless to anyone but the owner. Responses carry a long private cache header, because an image never changes under its id.

### Delete

- Deleting one image removes its database row and then the file.
- Deleting a note removes its image rows through the database cascade, and then the files.

If a file cannot be removed from disk, a warning is logged and the request still succeeds. The database stays consistent; at worst an unused file remains in the uploads folder.

### Known limitations

- **No replace:** an image cannot be swapped in place. Delete it and upload the new one; the new image gets a new id.
- **No explicit order:** images are returned in upload order. Reordering would need a `position` column.
- **One size:** only the scaled original is stored, no thumbnails.
- **Files outlive deleted users:** there is no endpoint to delete a user. If one is added, it must remove the user's image files, because the database cascade only removes rows.
