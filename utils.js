/**
 * CSV文字列をパースしてアカウント情報の配列を返す
 * @param {string} csvContent - CSV形式の文字列
 * @returns {Array<{id: string, password: string}>} アカウント情報の配列
 */
export function parseAccountCsv(csvContent) {
  if (!csvContent) return [];
  const lines = csvContent.trim().split('\n');
  const dataLines = lines.length > 1 ? lines.slice(1) : lines;
  return dataLines.map(line => {
    const [, id, password] = line.split(',');
    return (id && password) ? { id: id.trim(), password: password.trim() } : null;
  }).filter(Boolean);
}