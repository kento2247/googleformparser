# Google Forms API

公開 Google フォームの URL を渡すと、誰でも回答できる状態かを検証したうえで、設問と entry ID を JSON で返す Cloudflare Worker。

## 使い方

```
GET  /v1/forms?url=<Google Forms URL>
POST /v1/forms  {"url": "<Google Forms URL>"}
```

`https://docs.google.com/forms/d/e/.../viewform`、`https://forms.gle/...`、`.../edit` などの URL を受け付ける。

```json
{
  "form_url": "https://docs.google.com/forms/d/e/<form_id>/viewform",
  "form_id": "<form_id>",
  "title": "フォームタイトル",
  "description": null,
  "items": [
    {
      "item_id": "111",
      "title": "氏名",
      "description": null,
      "type": "short_answer",
      "type_code": 0,
      "entries": [{ "entry_id": "1001", "label": null, "required": true }],
      "options": [],
      "has_other_option": false,
      "scale_labels": null
    }
  ]
}
```

Prefill URL は `form_url?usp=pp_url&entry.<entry_id>=<値>`。グリッドは行ごとに `entries` を持つ（`label` が行名）。

## エラー

`{"error": {"code", "message"}}` 形式。

| code | status | 意味 |
|---|---|---|
| INVALID_URL | 400 | Google フォームの URL ではない |
| LOGIN_REQUIRED | 403 | 回答に Google ログインが必要 |
| CLOSED | 403 | 回答受付を終了している |
| NOT_FOUND | 404 | 存在しない／削除済み |
| RATE_LIMITED | 429 | IP あたり 30 回/分を超過 |
| UPSTREAM_ERROR / PARSE_FAILED | 502 | 取得・解析に失敗 |

## 開発

```
npm install
npm test
npm run dev
npm run deploy
```

成功した結果は正規化した URL ごとにエッジで 5 分キャッシュする。
