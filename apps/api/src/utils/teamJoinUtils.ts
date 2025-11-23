import { and, eq } from "drizzle-orm";
import { teamMembers } from "../db/schema/team/teams";
import { teamTasks } from "../db/schema/team/tasks";
import { teamMemos } from "../db/schema/team/memos";

/**
 * チームタスクとチームメンバーのJOIN条件を生成
 * 作成者情報を取得するための標準的なJOIN条件
 */
export function getTeamTaskMemberJoin() {
  return and(
    eq(teamTasks.userId, teamMembers.userId),
    eq(teamTasks.teamId, teamMembers.teamId),
  );
}

/**
 * チームメモとチームメンバーのJOIN条件を生成
 * 作成者情報を取得するための標準的なJOIN条件
 */
export function getTeamMemoMemberJoin() {
  return and(
    eq(teamMemos.userId, teamMembers.userId),
    eq(teamMemos.teamId, teamMembers.teamId),
  );
}

/**
 * チームタスクの標準的なSELECTフィールド（作成者情報含む）
 */
export function getTeamTaskSelectFields() {
  return {
    id: teamTasks.id,
    teamId: teamTasks.teamId,
    userId: teamTasks.userId,
    originalId: teamTasks.originalId, // 重要: originalIdフィールドを追加
    displayId: teamTasks.displayId, // 🆕 displayIdフィールドを追加
    uuid: teamTasks.uuid,
    title: teamTasks.title,
    description: teamTasks.description,
    status: teamTasks.status,
    priority: teamTasks.priority,
    dueDate: teamTasks.dueDate,
    categoryId: teamTasks.categoryId,
    boardCategoryId: teamTasks.boardCategoryId,
    assigneeId: teamTasks.assigneeId,
    createdAt: teamTasks.createdAt,
    updatedAt: teamTasks.updatedAt,
    createdBy: teamMembers.displayName, // チーム専用の表示名
    avatarColor: teamMembers.avatarColor, // チーム専用のアバター色
  };
}

/**
 * チームメモの標準的なSELECTフィールド（作成者情報含む）
 */
export function getTeamMemoSelectFields() {
  return {
    id: teamMemos.id,
    teamId: teamMemos.teamId,
    userId: teamMemos.userId,
    originalId: teamMemos.originalId, // 重要: originalIdフィールドを追加
    displayId: teamMemos.displayId, // 🆕 displayIdフィールドを追加
    uuid: teamMemos.uuid,
    title: teamMemos.title,
    content: teamMemos.content,
    createdAt: teamMemos.createdAt,
    updatedAt: teamMemos.updatedAt,
    createdBy: teamMembers.displayName, // 作成者の表示名
    avatarColor: teamMembers.avatarColor, // 作成者のアバター色
  };
}
