"use client";

import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Button,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";

const { Title } = Typography;

export default function UserEdit() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState("");
  const [hasChanges, setHasChanges] = React.useState(false);
  const [initialValues, setInitialValues] = React.useState<any>(null);

  // 表示用データ取得
  const { data: usersData, isLoading: isListLoading } = useList({
    resource: "users",
  });

  const userData = usersData?.data?.find((user: any) => user.id === userId);

  const { formProps, saveButtonProps, queryResult } = useForm({
    resource: "users",
    action: "edit",
    id: userId,
    redirect: false,
  });

  // カスタム保存処理
  const handleSave = async () => {
    if (isSaving) return; // 二重送信防止

    try {
      setIsSaving(true);
      setSaveMessage("保存中...");
      console.log("Custom save started");
      const formValues = formProps.form?.getFieldsValue();
      console.log("Form values:", formValues);

      // 日付フィールドを適切に変換
      const processedValues = {
        ...formValues,
        premiumStartDate: (formValues as any)?.premiumStartDate
          ? (formValues as any).premiumStartDate.toISOString()
          : null,
        nextBillingDate: (formValues as any)?.nextBillingDate
          ? (formValues as any).nextBillingDate.toISOString()
          : null,
      };

      // formProps.onFinishを直接呼び出し
      if (formProps.onFinish) {
        await formProps.onFinish(processedValues);
      }

      setSaveMessage("✅ 保存されました！");
      setHasChanges(false); // 保存後は変更なし状態に

      // データを再取得してUIを更新
      queryResult?.refetch?.();

      // 3秒後にメッセージを消す
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
    } catch (error: any) {
      console.log("Save error:", error);
      setSaveMessage("❌ 保存に失敗しました");

      // エラーメッセージも3秒後に消す
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // userDataが取得できたらフォームに値を設定
  React.useEffect(() => {
    if (userData && formProps.form) {
      const formValues = {
        userId: userData.userId,
        planType: userData.planType,
        id: userData.id,
        premiumStartDate: userData.premiumStartDate
          ? dayjs.unix(userData.premiumStartDate)
          : null,
        nextBillingDate: userData.nextBillingDate
          ? dayjs.unix(userData.nextBillingDate)
          : null,
      };

      formProps.form.setFieldsValue(formValues);
      setInitialValues(formValues);
      setHasChanges(false);
    }
  }, [userData, formProps.form]);

  // フォーム値変更の監視
  const checkForChanges = () => {
    if (!formProps.form || !initialValues) return;

    const currentValues = formProps.form.getFieldsValue();

    // 値を比較（日付はISOStringで比較）
    const currentForComparison = {
      ...currentValues,
      premiumStartDate: (currentValues as any)?.premiumStartDate
        ? (currentValues as any).premiumStartDate.toISOString()
        : null,
      nextBillingDate: (currentValues as any)?.nextBillingDate
        ? (currentValues as any).nextBillingDate.toISOString()
        : null,
    };

    const initialForComparison = {
      ...initialValues,
      premiumStartDate: (initialValues as any)?.premiumStartDate
        ? (initialValues as any).premiumStartDate.toISOString()
        : null,
      nextBillingDate: (initialValues as any)?.nextBillingDate
        ? (initialValues as any).nextBillingDate.toISOString()
        : null,
    };

    const changed =
      JSON.stringify(currentForComparison) !==
      JSON.stringify(initialForComparison);
    setHasChanges(changed);
  };

  const handleCopyUserId = async () => {
    if (userData?.userId) {
      try {
        await navigator.clipboard.writeText(userData.userId);
        message.success("ユーザーIDをコピーしました");
      } catch (err) {
        message.error("コピーに失敗しました");
      }
    }
  };

  return (
    <Edit
      isLoading={isListLoading}
      saveButtonProps={{
        ...saveButtonProps,
        onClick: handleSave,
        loading: isSaving,
        disabled: isSaving || !hasChanges,
      }}
      footerButtons={({ defaultButtons }) => (
        <Space>
          {saveMessage && (
            <span
              style={{
                color: saveMessage.includes("✅")
                  ? "#52c41a"
                  : saveMessage.includes("❌")
                    ? "#ff4d4f"
                    : "#1890ff",
                fontWeight: "500",
                fontSize: "14px",
              }}
            >
              {saveMessage}
            </span>
          )}
          {defaultButtons}
        </Space>
      )}
      headerProps={{
        title: "ユーザー編集",
        extra: (
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/users")}
            >
              一覧に戻る
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={() => router.push(`/users/show/${userData?.id}`)}
            >
              詳細表示
            </Button>
          </Space>
        ),
      }}
    >
      <Form {...formProps} layout="vertical" onValuesChange={checkForChanges}>
        <Title level={5}>基本情報</Title>

        <Form.Item label="ユーザーID" name="userId">
          <Input
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              pointerEvents: "none",
            }}
            placeholder="user_xxxxxx"
            addonAfter={
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={handleCopyUserId}
                style={{ pointerEvents: "auto" }}
                size="small"
              />
            }
          />
        </Form.Item>

        <Form.Item label="プラン" name="planType">
          <Select>
            <Select.Option value="free">FREE</Select.Option>
            <Select.Option value="premium">PREMIUM</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="作成日時">
          <Input
            style={{ pointerEvents: "none" }}
            value={
              userData?.createdAt
                ? new Date(userData.createdAt * 1000).toLocaleString("ja-JP")
                : ""
            }
          />
        </Form.Item>

        <Title level={5} style={{ marginTop: 24 }}>
          プレミアム設定
        </Title>

        <Form.Item label="プレミアム開始日" name="premiumStartDate">
          <DatePicker
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            placeholder="プレミアム開始日を選択"
          />
        </Form.Item>

        <Form.Item label="次回請求日" name="nextBillingDate">
          <DatePicker
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            placeholder="次回請求日を選択"
          />
        </Form.Item>

        <Title level={5} style={{ marginTop: 24 }}>
          システム情報
        </Title>
      </Form>
    </Edit>
  );
}
