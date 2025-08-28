"use client";

import React from "react";
import { useForm } from "@refinedev/antd";
import { Edit } from "@refinedev/antd";
import { Form, Select, Input } from "antd";

export default function UserEdit() {
  const { formProps, saveButtonProps, queryResult } = useForm();
  const userData = queryResult?.data?.data;

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="ユーザーID"
          name="userId"
          rules={[{ required: true, message: "ユーザーIDは必須です" }]}
        >
          <Input disabled />
        </Form.Item>
        
        <Form.Item
          label="プランタイプ"
          name="planType"
          rules={[{ required: true, message: "プランタイプは必須です" }]}
        >
          <Select
            placeholder="プランタイプを選択"
            options={[
              { label: "Free", value: "free" },
              { label: "Premium", value: "premium" },
            ]}
          />
        </Form.Item>
      </Form>
    </Edit>
  );
}