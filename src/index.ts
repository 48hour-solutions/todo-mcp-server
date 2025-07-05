#!/usr/bin/env node

import { TodoMcpServer } from './server.js';

/**
 * Main entry point for the Todo MCP Server
 */
async function main(): Promise<void> {
  const server = new TodoMcpServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
}); 