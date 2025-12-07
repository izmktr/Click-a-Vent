// 共通ユーティリティ関数

// 正規表現の特殊文字をエスケープ
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// URLパターンマッチング
function matchesUrlPattern(testUrl, patternUrl, useRegex) {
  try {
    if (useRegex) {
      // 正規表現モード
      const regex = new RegExp(patternUrl);
      return regex.test(testUrl);
    } else {
      // 前方一致モード
      return testUrl.startsWith(patternUrl);
    }
  } catch (e) {
    console.error('URLマッチングエラー:', patternUrl, e);
    return false;
  }
}

// テキストから日付を抽出
function extractDateFromText(text, formatList) {
  if (!text) return null;
  
  for (const format of formatList) {
    // %Y, %M, %D をそれぞれ正規表現パターンに変換
    let pattern = format
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 特殊文字をエスケープ
      .replace(/%Y/g, '(\\d{2,4})') // 年: 2-4桁の数字
      .replace(/%M/g, '(\\d{1,2})') // 月: 1-2桁の数字
      .replace(/%D/g, '(\\d{1,2})'); // 日: 1-2桁の数字
    
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    
    if (match) {
      // フォーマットから年月日の位置を判定
      const formatParts = format.match(/%[YMD]/g) || [];
      const result = {};
      
      formatParts.forEach((part, index) => {
        if (part === '%Y') result.year = match[index + 1];
        if (part === '%M') result.month = match[index + 1];
        if (part === '%D') result.day = match[index + 1];
      });
      
      // 年が取得できた場合
      if (result.year && result.month && result.day) {
        // 2桁の年を4桁に変換（00-49は2000年代、50-99は1900年代）
        let fullYear = result.year;
        if (fullYear.length === 2) {
          const yearNum = parseInt(fullYear);
          fullYear = yearNum < 50 ? `20${fullYear}` : `19${fullYear}`;
        }
        
        return {
          year: fullYear,
          month: result.month.padStart(2, '0'),
          day: result.day.padStart(2, '0'),
          matchedText: match[0], // マッチしたテキストを保存
          matchedFormat: format // マッチしたフォーマットを保存
        };
      }
      
      // 年がない場合は現在の年を使用し、3ヶ月以上過去なら来年にする
      if (!result.year && result.month && result.day) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const month = parseInt(result.month);
        const day = parseInt(result.day);
        
        // 現在の年で日付を作成
        const targetDate = new Date(currentYear, month - 1, day);
        
        // 現在の日付との差を計算（ミリ秒）
        const diffMs = now - targetDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        // 3ヶ月（約90日）以上過去の場合は来年の日付とする
        if (diffDays > 90) {
          return {
            year: (currentYear + 1).toString(),
            month: result.month.padStart(2, '0'),
            day: result.day.padStart(2, '0'),
            matchedText: match[0], // マッチしたテキストを保存
            matchedFormat: format // マッチしたフォーマットを保存
          };
        } else {
          return {
            year: currentYear.toString(),
            month: result.month.padStart(2, '0'),
            day: result.day.padStart(2, '0'),
            matchedText: match[0], // マッチしたテキストを保存
            matchedFormat: format // マッチしたフォーマットを保存
          };
        }
      }
    }
  }
  
  return null;
}

// テキストから時刻を抽出
function extractTimeFromText(text, formatList) {
  if (!text) return null;
  
  for (const format of formatList) {
    // %P, %H, %M を正規表現パターンに変換
    let pattern = format
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 特殊文字をエスケープ
      .replace(/%P/g, '(午前|午後)') // 午前/午後
      .replace(/%H/g, '(\\d{1,2})') // 時: 1-2桁の数字
      .replace(/%M/g, '(\\d{1,2})'); // 分: 1-2桁の数字
    
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    
    if (match) {
      // フォーマットから午前/午後・時分の位置を判定
      const formatParts = format.match(/%[PHM]/g) || [];
      const result = {};
      
      formatParts.forEach((part, index) => {
        if (part === '%P') result.period = match[index + 1];
        if (part === '%H') result.hour = match[index + 1];
        if (part === '%M') result.minute = match[index + 1];
      });
      
      // 時刻を返す
      if (result.hour !== undefined) {
        let hour = parseInt(result.hour);
        
        // 午後の場合は12時間を加算（12時台はそのまま）
        if (result.period === '午後' && hour < 12) {
          hour += 12;
        }
        // 午前12時は0時に変換
        if (result.period === '午前' && hour === 12) {
          hour = 0;
        }
        
        return {
          hour: hour.toString().padStart(2, '0'),
          minute: (result.minute || '00').padStart(2, '0'),
          matchedFormat: format // マッチしたフォーマットを保存
        };
      }
    }
  }
  
  return null;
}
