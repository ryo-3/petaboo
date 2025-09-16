import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  // 開発環境でのみ実行
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 },
    );
  }

  try {
    // clear-logs.shスクリプトを実行
    const { stdout, stderr } = await execAsync(
      "cd /home/ryosuke/petaboo && ./clear-logs.sh",
    );

    if (stderr) {
      console.error("Clear logs stderr:", stderr);
    }

    return NextResponse.json({
      success: true,
      message: "Logs cleared successfully",
      output: stdout,
    });
  } catch (error) {
    console.error("Failed to clear logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
