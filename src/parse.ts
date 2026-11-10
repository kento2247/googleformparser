import { ITEM_TYPES } from './config.js';

export type FormEntry = {
  entry_id: string;
  /** グリッドの行ラベル。それ以外は null */
  label: string | null;
  required: boolean;
};

export type FormItem = {
  item_id: string;
  title: string;
  description: string | null;
  type: string;
  type_code: number;
  /** 回答欄の entry ID（プリフィル時は entry.<entry_id>）。回答欄のない項目は空配列 */
  entries: FormEntry[];
  /** 選択肢（グリッドの場合は列） */
  options: string[];
  has_other_option: boolean;
  /** 均等目盛の両端ラベル */
  scale_labels: [string, string] | null;
};

export type ParsedForm = {
  form_id: string;
  title: string;
  description: string | null;
  items: FormItem[];
};

type Raw = any;

function parseEntry(raw: Raw, typeCode: number): FormEntry {
  const label = typeCode === 7 && Array.isArray(raw[3]) ? String(raw[3][0]) : null;
  return { entry_id: String(raw[0]), label, required: raw[2] === 1 };
}

function parseItem(raw: Raw): FormItem {
  const typeCode: number = raw[3];
  const rawEntries: Raw[] = Array.isArray(raw[4]) ? raw[4] : [];
  const first = rawEntries[0];
  const rawOptions: Raw[] = first && Array.isArray(first[1]) ? first[1] : [];
  // 「その他」は option[4] === 1 の空文字の選択肢として表現される
  const isOther = (option: Raw) => option[4] === 1;
  const scaleLabels =
    typeCode === 5 && Array.isArray(first?.[3]) ? (first[3].map(String) as [string, string]) : null;
  const type = typeCode === 7 && first?.[11]?.[0] === 1 ? 'checkbox_grid' : ITEM_TYPES[typeCode];

  return {
    item_id: String(raw[0]),
    title: raw[1] ?? '',
    description: raw[2] || null,
    type: type ?? 'unknown',
    type_code: typeCode,
    entries: rawEntries.map((entry) => parseEntry(entry, typeCode)),
    options: rawOptions.filter((o) => !isOther(o)).map((o) => String(o[0])),
    has_other_option: rawOptions.some(isOther),
    scale_labels: scaleLabels,
  };
}

/**
 * 公開 Google フォームの HTML に埋め込まれた FB_PUBLIC_LOAD_DATA_ を解析する。
 * 非公式の構造に依存するため、想定と異なる場合は null を返して呼び出し側でエラーにする。
 */
export function parseGoogleFormHtml(html: string): ParsedForm | null {
  const match = html.match(/FB_PUBLIC_LOAD_DATA_ = (.*?);\s*<\/script>/s);
  if (!match) {
    return null;
  }

  let data: Raw;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return null;
  }

  const form = Array.isArray(data) ? data[1] : null;
  if (!Array.isArray(form) || !Array.isArray(form[1]) || typeof data[14] !== 'string') {
    return null;
  }

  try {
    return {
      form_id: data[14].replace(/^e\//, ''),
      title: form[8] ?? data[3] ?? '',
      description: form[0] || null,
      items: form[1].map(parseItem),
    };
  } catch {
    return null;
  }
}
