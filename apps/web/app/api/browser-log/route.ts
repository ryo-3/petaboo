import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const logData = await request.json();
    const { level, message, timestamp, url } = logData;
    
    // ログメッセージを整形
    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message} (${url})\n`;
    
    // web.logファイルのパス（プロジェクトルート）
    const logFile = path.join(process.cwd(), '../..', 'web.log');
    
    // ログファイルに追記
    await fs.appendFile(logFile, logLine, 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Browser log error:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}