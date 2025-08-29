import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log("APIキー:", process.env.RESEND_API_KEY ? "セット済み" : "未設定");

  try {
    console.log("メール送信テスト開始...");

    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "abbcee74@yahoo.co.jp",
      subject: "テストメール",
      html: "<p>これはテストメールです</p>",
    });

    console.log("送信結果:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("エラー:", error);
  }
}

testEmail();
