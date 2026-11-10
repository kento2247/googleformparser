import { describe, expect, it } from 'vitest';
import { parseGoogleFormHtml } from '../src/parse.js';
import { FORM_HTML } from './fixture.js';

describe('parseGoogleFormHtml', () => {
  const form = parseGoogleFormHtml(FORM_HTML);

  it('フォームのメタ情報を取り出す', () => {
    expect(form).toMatchObject({
      form_id: '1FAIpQLSTEST',
      title: 'テストフォーム',
      description: 'フォームの説明',
    });
  });

  it('記述式の設問の entry ID と必須を取り出す', () => {
    expect(form?.items[0]).toMatchObject({
      item_id: '111',
      title: '氏名',
      type: 'short_answer',
      entries: [{ entry_id: '1001', label: null, required: true }],
      options: [],
    });
  });

  it('「その他」を選択肢から除いてフラグにする', () => {
    expect(form?.items[1]).toMatchObject({
      type: 'multiple_choice',
      description: '在籍学年',
      options: ['B1', 'B2'],
      has_other_option: true,
      entries: [{ entry_id: '1002', required: false }],
    });
  });

  it('均等目盛の両端ラベルを取り出す', () => {
    expect(form?.items[2]).toMatchObject({
      type: 'linear_scale',
      description: null,
      options: ['1', '2', '3'],
      scale_labels: ['低い', '高い'],
    });
  });

  it('グリッドは行ごとに entry ID を持つ', () => {
    expect(form?.items[3]).toMatchObject({
      type: 'grid',
      options: ['良い', '悪い'],
      entries: [
        { entry_id: '1004', label: '講義', required: true },
        { entry_id: '1005', label: '資料', required: false },
      ],
    });
  });

  it('回答欄のない項目は entries が空', () => {
    expect(form?.items[4]).toMatchObject({ type: 'section', entries: [] });
  });

  it('FB_PUBLIC_LOAD_DATA_ がなければ null', () => {
    expect(parseGoogleFormHtml('<html></html>')).toBeNull();
  });

  it('構造が想定と異なれば null', () => {
    expect(
      parseGoogleFormHtml('<script>var FB_PUBLIC_LOAD_DATA_ = [null, "x"];\n</script>')
    ).toBeNull();
  });
});
