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
    displayId: teamTasks.displayId,
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
    updatedBy: teamTasks.updatedBy,
    createdBy: teamMembers.displayName,
    avatarColor: teamMembers.avatarColor,
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
    displayId: teamMemos.displayId,
    uuid: teamMemos.uuid,
    title: teamMemos.title,
    content: teamMemos.content,
    createdAt: teamMemos.createdAt,
    updatedAt: teamMemos.updatedAt,
    createdBy: teamMembers.displayName,
    avatarColor: teamMembers.avatarColor,
  };
}
