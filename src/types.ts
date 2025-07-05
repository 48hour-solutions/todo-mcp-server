/**
 * Status of a todo item
 */
export type TodoStatus = 'pending' | 'completed';

/**
 * A todo item structure
 */
export interface TodoItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: TodoStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly order: number;
}

/**
 * Input for creating a new todo item
 */
export interface CreateTodoInput {
  readonly title: string;
  readonly description?: string;
}

/**
 * Input for updating an existing todo item
 */
export interface UpdateTodoInput {
  readonly title?: string;
  readonly description?: string;
  readonly status?: TodoStatus;
}

/**
 * Filter options for retrieving todo items
 */
export interface TodoFilter {
  readonly status?: TodoStatus;
} 