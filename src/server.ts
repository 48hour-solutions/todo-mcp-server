import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  InitializeRequestSchema,
  InitializedNotificationSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TodoManager } from './todo-manager.js';
import { CreateTodoInput, UpdateTodoInput, TodoFilter } from './types.js';

/**
 * MCP Server for Todo Management
 */
export class TodoMcpServer {
  private readonly server: Server;
  private readonly todoManager: TodoManager;

  constructor() {
    this.server = new Server(
      {
        name: 'todo-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    this.todoManager = new TodoManager();
    this.setupHandlers();
  }

  /**
   * Sets up all the MCP request handlers
   */
  private setupHandlers(): void {
    // Handle initialization requests
    this.server.setRequestHandler(InitializeRequestSchema, async () => {
      try {
        console.error('Received initialize request');
        const response = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
          },
          serverInfo: {
            name: 'todo-mcp-server',
            version: '1.0.0',
          },
        };
        console.error('Sending initialize response:', JSON.stringify(response));
        return response;
      } catch (error) {
        console.error('Error in initialize handler:', error);
        throw error;
      }
    });

    // Handle initialized notification
    this.server.setNotificationHandler(InitializedNotificationSchema, async () => {
      console.error('Received initialized notification');
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'todo://todos',
          name: 'All Todos',
          description: 'List of all todo items',
          mimeType: 'application/json',
        },
        {
          uri: 'todo://todos/pending',
          name: 'Pending Todos',
          description: 'List of pending todo items',
          mimeType: 'application/json',
        },
        {
          uri: 'todo://todos/completed',
          name: 'Completed Todos',
          description: 'List of completed todo items',
          mimeType: 'application/json',
        },
        {
          uri: 'todo://todos/next',
          name: 'Next Todo',
          description: 'The next todo item to work on',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'todo://todos':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.todoManager.getTodos(), null, 2),
              },
            ],
          };

        case 'todo://todos/pending':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.todoManager.getTodos({ status: 'pending' }), null, 2),
              },
            ],
          };

        case 'todo://todos/completed':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.todoManager.getTodos({ status: 'completed' }), null, 2),
              },
            ],
          };

        case 'todo://todos/next': {
          const nextTodo = this.todoManager.getNextTodo();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(nextTodo ?? null, null, 2),
              },
            ],
          };
        }

        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_todo',
          description: 'Create a new todo item',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Title of the todo item' },
              description: { type: 'string', description: 'Optional description' },
            },
            required: ['title'],
          },
        },
        {
          name: 'get_todo',
          description: 'Get a specific todo item by ID',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID of the todo item' },
            },
            required: ['id'],
          },
        },
        {
          name: 'get_todos',
          description: 'Get all todo items with optional filtering',
          inputSchema: {
            type: 'object',
            properties: {
              status: { 
                type: 'string', 
                enum: ['pending', 'completed'],
                description: 'Filter by status',
              },
            },
          },
        },
        {
          name: 'get_next_todo',
          description: 'Get the next todo item to work on (first pending item by priority)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'update_todo',
          description: 'Update an existing todo item',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID of the todo item to update' },
              title: { type: 'string', description: 'New title' },
              description: { type: 'string', description: 'New description' },
              status: { 
                type: 'string', 
                enum: ['pending', 'completed'],
                description: 'New status',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'complete_todo',
          description: 'Mark a todo item as completed',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID of the todo item to complete' },
            },
            required: ['id'],
          },
        },
        {
          name: 'delete_todo',
          description: 'Delete a todo item',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID of the todo item to delete' },
            },
            required: ['id'],
          },
        },
        {
          name: 'get_todo_stats',
          description: 'Get statistics about todo items',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'clear_all_todos',
          description: 'Clear all todo items (use with caution)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_todo': {
            const input = this.validateCreateTodoInput(args as unknown);
            const todo = this.todoManager.createTodo(input);
            return {
              content: [
                {
                  type: 'text',
                  text: `Created todo: ${JSON.stringify(todo, null, 2)}`,
                },
              ],
            };
          }

          case 'get_todo': {
            const { id } = args as { id: string };
            const todo = this.todoManager.getTodo(id);
            if (!todo) {
              throw new McpError(ErrorCode.InvalidRequest, `Todo not found: ${id}`);
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(todo, null, 2),
                },
              ],
            };
          }

          case 'get_todos': {
            const filter = this.validateTodoFilter(args as unknown);
            const todos = this.todoManager.getTodos(filter);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(todos, null, 2),
                },
              ],
            };
          }

          case 'get_next_todo': {
            const nextTodo = this.todoManager.getNextTodo();
            return {
              content: [
                {
                  type: 'text',
                  text: nextTodo ? JSON.stringify(nextTodo, null, 2) : 'No pending todos',
                },
              ],
            };
          }

          case 'update_todo': {
            const argsObj = args as Record<string, unknown>;
            if (!argsObj.id || typeof argsObj.id !== 'string') {
              throw new McpError(ErrorCode.InvalidRequest, 'ID is required');
            }
            const { id, ...updates } = argsObj as { id: string } & Record<string, unknown>;
            const updatedTodo = this.todoManager.updateTodo(id, updates as UpdateTodoInput);
            if (!updatedTodo) {
              throw new McpError(ErrorCode.InvalidRequest, `Todo not found: ${id}`);
            }
            return {
              content: [
                {
                  type: 'text',
                  text: `Updated todo: ${JSON.stringify(updatedTodo, null, 2)}`,
                },
              ],
            };
          }

          case 'complete_todo': {
            const { id } = args as { id: string };
            const completedTodo = this.todoManager.completeTodo(id);
            if (!completedTodo) {
              throw new McpError(ErrorCode.InvalidRequest, `Todo not found: ${id}`);
            }
            return {
              content: [
                {
                  type: 'text',
                  text: `Completed todo: ${JSON.stringify(completedTodo, null, 2)}`,
                },
              ],
            };
          }

          case 'delete_todo': {
            const { id } = args as { id: string };
            const deleted = this.todoManager.deleteTodo(id);
            if (!deleted) {
              throw new McpError(ErrorCode.InvalidRequest, `Todo not found: ${id}`);
            }
            return {
              content: [
                {
                  type: 'text',
                  text: `Deleted todo: ${id}`,
                },
              ],
            };
          }

          case 'get_todo_stats': {
            const stats = {
              total: this.todoManager.getTodoCount(),
              pending: this.todoManager.getTodoCountByStatus('pending'),
              completed: this.todoManager.getTodoCountByStatus('completed'),
            };
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(stats, null, 2),
                },
              ],
            };
          }

          case 'clear_all_todos': {
            this.todoManager.clearAll();
            return {
              content: [
                {
                  type: 'text',
                  text: 'All todos cleared',
                },
              ],
            };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${String(error)}`);
      }
    });
  }

  /**
   * Validates and parses CreateTodoInput
   */
  private validateCreateTodoInput(args: unknown): CreateTodoInput {
    if (typeof args !== 'object' || args === null) {
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid arguments');
    }

    const obj = args as Record<string, unknown>;
    
    if (typeof obj.title !== 'string' || obj.title.trim() === '') {
      throw new McpError(ErrorCode.InvalidRequest, 'Title is required and must be a non-empty string');
    }

    const input: Record<string, unknown> = {
      title: obj.title.trim(),
    };

    if (obj.description !== undefined) {
      if (typeof obj.description !== 'string') {
        throw new McpError(ErrorCode.InvalidRequest, 'Description must be a string');
      }
      input.description = obj.description;
    }

    return input as unknown as CreateTodoInput;
  }

  /**
   * Validates and parses TodoFilter
   */
  private validateTodoFilter(args: unknown): TodoFilter | undefined {
    if (args === null || args === undefined) {
      return undefined;
    }

    if (typeof args !== 'object') {
      throw new McpError(ErrorCode.InvalidRequest, 'Filter must be an object');
    }

    const obj = args as Record<string, unknown>;
    const filter: Record<string, unknown> = {};

    if (obj.status !== undefined) {
      if (!['pending', 'completed'].includes(obj.status as string)) {
        throw new McpError(ErrorCode.InvalidRequest, 'Status must be one of: pending, completed');
      }
      filter.status = obj.status;
    }

    return Object.keys(filter).length > 0 ? (filter as TodoFilter) : undefined;
  }

  /**
   * Starts the server
   */
  public async start(): Promise<void> {
    try {
      console.error('Starting Todo MCP server...');
      const transport = new StdioServerTransport();
      console.error('Todo MCP server running on stdio');
      await this.server.connect(transport);
      console.error('Server connected successfully');
    } catch (error) {
      console.error('Error starting server:', error);
      throw error;
    }
  }
} 