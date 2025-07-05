import { TodoItem, CreateTodoInput, UpdateTodoInput, TodoFilter, TodoStatus } from './types.js';

/**
 * Manages todo items with simple ordered list functionality
 */
export class TodoManager {
  private readonly todos: Map<string, TodoItem> = new Map();
  private nextId: number = 1;
  private nextOrder: number = 1;

  /**
   * Creates a new todo item
   */
  public createTodo(input: CreateTodoInput): TodoItem {
    const now = new Date();
    const id = this.generateId();
    
    const todo: TodoItem = {
      id,
      title: input.title,
      ...(input.description !== undefined && { description: input.description }),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      order: this.nextOrder++,
    };

    this.todos.set(id, todo);
    return todo;
  }

  /**
   * Retrieves a todo item by ID
   */
  public getTodo(id: string): TodoItem | undefined {
    return this.todos.get(id);
  }

  /**
   * Retrieves all todo items with optional filtering, ordered by creation
   */
  public getTodos(filter?: TodoFilter): readonly TodoItem[] {
    const todos = Array.from(this.todos.values());
    
    if (!filter) {
      return this.sortTodos(todos);
    }

    const filtered = todos.filter(todo => {
      if (filter.status && todo.status !== filter.status) {
        return false;
      }
      return true;
    });

    return this.sortTodos(filtered);
  }

  /**
   * Gets the next todo item (first pending item in order)
   */
  public getNextTodo(): TodoItem | undefined {
    const pendingTodos = this.getTodos({ status: 'pending' });
    return pendingTodos.length > 0 ? pendingTodos[0] : undefined;
  }

  /**
   * Updates an existing todo item
   */
  public updateTodo(id: string, updates: UpdateTodoInput): TodoItem | undefined {
    const existingTodo = this.todos.get(id);
    if (!existingTodo) {
      return undefined;
    }

    const updatedTodo: TodoItem = {
      ...existingTodo,
      ...updates,
      id: existingTodo.id, // Ensure ID cannot be changed
      createdAt: existingTodo.createdAt, // Ensure createdAt cannot be changed
      order: existingTodo.order, // Ensure order cannot be changed
      updatedAt: new Date(),
    };

    this.todos.set(id, updatedTodo);
    return updatedTodo;
  }

  /**
   * Marks a todo item as completed
   */
  public completeTodo(id: string): TodoItem | undefined {
    return this.updateTodo(id, { status: 'completed' });
  }

  /**
   * Deletes a todo item
   */
  public deleteTodo(id: string): boolean {
    return this.todos.delete(id);
  }

  /**
   * Gets the total count of todos
   */
  public getTodoCount(): number {
    return this.todos.size;
  }

  /**
   * Gets count of todos by status
   */
  public getTodoCountByStatus(status: TodoStatus): number {
    return Array.from(this.todos.values()).filter(todo => todo.status === status).length;
  }

  /**
   * Clears all todos
   */
  public clearAll(): void {
    this.todos.clear();
    this.nextId = 1;
    this.nextOrder = 1;
  }

  /**
   * Generates a unique ID for a todo item
   */
  private generateId(): string {
    return `todo-${this.nextId++}`;
  }

  /**
   * Sorts todos by order (creation order)
   */
  private sortTodos(todos: TodoItem[]): readonly TodoItem[] {
    return todos.sort((a, b) => a.order - b.order);
  }
} 