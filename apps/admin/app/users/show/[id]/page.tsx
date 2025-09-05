"use client";

import React from "react";
import { Show } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Input, Select, DatePicker, Space, Button, Typography, Tag, message } from "antd";
import { EditOutlined, ArrowLeftOutlined, CopyOutlined } from "@ant-design/icons";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";

const { Title } = Typography;

export default function UserShow() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const { data: usersData, isLoading } = useList({
    resource: "users",
  });
  
  const record = usersData?.data?.find((user: any) => user.id === userId);

  const handleCopyUserId = async () => {
    if (record?.userId) {
      try {
        await navigator.clipboard.writeText(record.userId);
        message.success('ユーザーIDをコピーしました');
      } catch (err) {
        message.error('コピーに失敗しました');
      }
    }
  };

  // データ取得完了まで待つ
  if (isLoading || !record) {
    return (
      <Show 
        isLoading={true}
        headerProps={{
          title: "ユーザー詳細",
          extra: (
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/users")}
              >
                一覧に戻る
              </Button>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                disabled
              >
                編集
              </Button>
            </Space>
          ),
        }}
      >
        <div>データを読み込み中...</div>
      </Show>
    );
  }

  return (
    <Show 
      isLoading={false}
      headerProps={{
        title: "ユーザー詳細",
        extra: (
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/users")}
            >
              一覧に戻る
            </Button>
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={() => router.push(`/users/edit/${record.id}`)}
            >
              編集
            </Button>
          </Space>
        ),
      }}
    >
      <Form 
        layout="vertical" 
        style={{ pointerEvents: "none" }}
        initialValues={{
          userId: record.userId,
          planType: record.planType,
          id: record.id,
        }}
      >
        <Title level={5}>基本情報</Title>
        
        <Form.Item
          label="ユーザーID"
          name="userId"
        >
          <Input 
            style={{ 
              fontFamily: "monospace", 
              fontSize: "12px"
            }}
            placeholder="user_xxxxxx"
            onFocus={(e) => e.target.select()}
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

        <Form.Item
          label="プラン"
          name="planType"
        >
          <Select>
            <Select.Option value="free">FREE</Select.Option>
            <Select.Option value="premium">PREMIUM</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="作成日時"
        >
          <Input
            value={record.createdAt 
              ? new Date(record.createdAt * 1000).toLocaleString("ja-JP")
              : ""
            }
          />
        </Form.Item>

        <Title level={5} style={{ marginTop: 24 }}>プレミアム設定</Title>
        
        <Form.Item
          label="プレミアム開始日"
          name="premiumStartDate"
        >
          <DatePicker
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            placeholder="プレミアム開始日を選択"
            value={record.premiumStartDate 
              ? dayjs.unix(record.premiumStartDate)
              : null
            }
          />
        </Form.Item>

        <Form.Item
          label="次回請求日"
          name="nextBillingDate"
        >
          <DatePicker
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            placeholder="次回請求日を選択"
            value={record.nextBillingDate 
              ? dayjs.unix(record.nextBillingDate)
              : null
            }
          />
        </Form.Item>

        <Title level={5} style={{ marginTop: 24 }}>システム情報</Title>
        

        <Form.Item
          label="最終更新"
        >
          <Input
            value={record.updatedAt 
              ? new Date(record.updatedAt * 1000).toLocaleString("ja-JP")
              : "-"
            }
          />
        </Form.Item>
      </Form>
    </Show>
  );
}