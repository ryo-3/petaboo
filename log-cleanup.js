#!/usr/bin/env node

/**
 * 開発ログの自動クリーンアップスクリプト
 * 定期的にログファイルをローテーションまたはクリアする
 */

import fs from 'fs/promises';
import path from 'path';

const LOG_FILES = ['dev.log', 'browser.log', 'api.log', 'web.log'];
const MAX_SIZE_MB = 10; // 10MB超えたらクリア
const MAX_LINES = 2000; // 2000行超えたらローテーション

async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n').length;
    const sizeMB = stats.size / (1024 * 1024);
    
    return { exists: true, sizeMB, lines };
  } catch (error) {
    return { exists: false, sizeMB: 0, lines: 0 };
  }
}

async function rotateLog(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    // 最新の半分のログだけ保持
    const keepLines = Math.floor(lines.length / 2);
    const rotatedContent = lines.slice(-keepLines).join('\n');
    
    await fs.writeFile(filePath, rotatedContent);
    console.log(`📝 ${path.basename(filePath)}: ${lines.length}行 → ${keepLines}行にローテーション`);
  } catch (error) {
    console.error(`❌ ${path.basename(filePath)}のローテーションに失敗:`, error.message);
  }
}

async function clearLog(filePath) {
  try {
    await fs.writeFile(filePath, '');
    console.log(`🗑️  ${path.basename(filePath)}: クリア完了`);
  } catch (error) {
    console.error(`❌ ${path.basename(filePath)}のクリアに失敗:`, error.message);
  }
}

async function cleanupLogs() {
  console.log(`🧹 ログクリーンアップ開始 - ${new Date().toLocaleString('ja-JP')}`);
  
  for (const logFile of LOG_FILES) {
    const filePath = path.join(process.cwd(), logFile);
    const stats = await getFileStats(filePath);
    
    if (!stats.exists) {
      continue;
    }
    
    console.log(`📊 ${logFile}: ${stats.lines}行, ${stats.sizeMB.toFixed(2)}MB`);
    
    // サイズが大きすぎる場合はクリア
    if (stats.sizeMB > MAX_SIZE_MB) {
      await clearLog(filePath);
    }
    // 行数が多い場合はローテーション
    else if (stats.lines > MAX_LINES) {
      await rotateLog(filePath);
    }
    else {
      console.log(`✅ ${logFile}: 問題なし`);
    }
  }
  
  console.log(`✨ クリーンアップ完了\n`);
}

// 即座に実行
cleanupLogs().catch(console.error);