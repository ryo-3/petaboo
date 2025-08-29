"use client";

import React from "react";
import { useCreate } from "@refinedev/core";
import {
  List,
  useTable,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space, Button, Modal, Form, Input, message } from "antd";

export default function TeamsList() {
  const { tableProps } = useTable({
    resource: "teams",
    meta: {
      endpoint: "/teams",
    },
  });

  const { mutate: createTeam } = useCreate();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  const handleCreateTeam = async (values: any) => {
    try {
      await createTeam({
        resource: "teams",
        values: {
          name: values.name,
          description: values.description || "",
        },
      });
      message.success("チームを作成しました");
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error("チーム作成に失敗しました");
    }
  };

  const createTestTeam = () => {
    const testName = `テストチーム ${Date.now()}`;
    createTeam({
      resource: "teams",
      values: {
        name: testName,
        description: "管理者によるテスト用チーム",
      },
    });
  };

  const columns = [
    {
      title: "チームID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "チーム名",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "説明",
      dataIndex: "description",
      key: "description",
      render: (value: string) => value || "-",
    },
    {
      title: "作成日",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: number) => new Date(value * 1000).toLocaleDateString(),
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: any) => (
        <Space size="middle">
          <ShowButton hideText size="small" recordItemId={record.id} />
          <EditButton hideText size="small" recordItemId={record.id} />
          <DeleteButton hideText size="small" recordItemId={record.id} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <List
        headerButtons={[
          <CreateButton key="create" onClick={() => setIsModalVisible(true)} />,
          <Button key="test" type="dashed" onClick={createTestTeam}>
            テストチーム作成
          </Button>,
        ]}
      >
        <Table {...tableProps} columns={columns} rowKey="id" />
      </List>

      <Modal
        title="新しいチーム作成"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTeam}>
          <Form.Item
            name="name"
            label="チーム名"
            rules={[
              { required: true, message: "チーム名を入力してください" },
              { max: 100, message: "チーム名は100文字以内にしてください" },
            ]}
          >
            <Input placeholder="チーム名を入力" />
          </Form.Item>

          <Form.Item
            name="description"
            label="説明"
            rules={[{ max: 500, message: "説明は500文字以内にしてください" }]}
          >
            <Input.TextArea rows={3} placeholder="チームの説明（任意）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                作成
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                キャンセル
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
