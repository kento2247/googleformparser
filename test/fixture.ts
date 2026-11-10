// 実際の公開フォームの FB_PUBLIC_LOAD_DATA_ の構造を模した合成データ
const FORM_ID = '1FAIpQLSTEST';

const items = [
  [111, '氏名', null, 0, [[1001, null, 1]]],
  [222, '学年', '在籍学年', 2, [[1002, [['B1', null, null, null, 0], ['B2', null, null, null, 0], ['', null, null, null, 1]], 0]]],
  [333, '満足度', '', 5, [[1003, [['1'], ['2'], ['3']], 1, ['低い', '高い']]]],
  [444, '評価', null, 7, [
    [1004, [['良い'], ['悪い']], 1, ['講義'], null, null, null, null, null, null, null, [0]],
    [1005, [['良い'], ['悪い']], 0, ['資料'], null, null, null, null, null, null, null, [0]],
  ]],
  [555, 'セクション2', null, 8, null],
];

export const FORM_DATA = [
  null,
  ['フォームの説明', items, null, null, null, null, null, null, 'テストフォーム'],
  '/forms',
  'テストフォーム [Form]',
  null, null, null, '', null, 0, 0, null, '', 0,
  `e/${FORM_ID}`,
];

export const FORM_HTML = `<html><script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(FORM_DATA)};
</script></html>`;

export const FORM_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform`;
