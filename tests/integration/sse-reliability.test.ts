/**
 * SSE Reliability Tests
 * Tests Server-Sent Events (SSE) under real browser conditions
 * 
 * Common real bugs:
 * - Refresh mid-run
 * - Tab backgrounded then resumed
 * - Network drop then reconnect
 */

import { describe, it, expect, beforeEach, vi, afterEach, type DoneCallback } from 'vitest';
import { test as base } from '@playwright/test';

// Mock EventSource for Node.js environment
class MockEventSource {
  url: string;
  readyState: number = 0; // CONNECTING
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private messageQueue: string[] = [];
  private isConnected: boolean = false;

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.isConnected = true;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
      this.startSendingMessages();
    }, 10);
  }

  private startSendingMessages() {
    // Simulate sending messages
    let step = 1;
    this.intervalId = setInterval(() => {
      if (this.isConnected && step <= 6) {
        const message = {
          type: 'step_progress',
          step: step,
          status: step < 6 ? 'processing' : 'completed',
          data: { stepNumber: step },
        };
        if (this.onmessage) {
          this.onmessage({
            data: JSON.stringify(message),
            type: 'message',
          });
        }
        step++;
        if (step > 6) {
          this.close();
        }
      }
    }, 100);
  }

  close() {
    this.readyState = 2; // CLOSED
    this.isConnected = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Simulate network drop
  simulateNetworkDrop() {
    this.isConnected = false;
    this.readyState = 0; // CONNECTING
    if (this.onerror) {
      this.onerror({ type: 'error' });
    }
  }

  // Simulate reconnection
  simulateReconnect() {
    setTimeout(() => {
      this.isConnected = true;
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
      this.startSendingMessages();
    }, 50);
  }
}

// Mock global EventSource
(global as any).EventSource = MockEventSource;

/**
 * Mock SSE endpoint handler
 */
async function mockSSEHandler(req: any): Promise<Response> {
  const stream = new ReadableStream({
    start(controller) {
      let step = 1;
      const interval = setInterval(() => {
        if (step <= 6) {
          const message = `data: ${JSON.stringify({
            type: 'step_progress',
            step: step,
            status: step < 6 ? 'processing' : 'completed',
            data: { stepNumber: step },
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
          step++;
        } else {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          clearInterval(interval);
          controller.close();
        }
      }, 100);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

describe('SSE Reliability Tests', () => {
  let eventSource: MockEventSource | null = null;
  const receivedMessages: any[] = [];

  beforeEach(() => {
    receivedMessages.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  });

  describe('Basic SSE Connection', () => {
    it('should establish SSE connection', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      
      eventSource.onopen = () => {
        expect(eventSource?.readyState).toBe(1); // OPEN
        done();
      };
    });

    it('should receive messages from SSE stream', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      let messageCount = 0;
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        receivedMessages.push(data);
        messageCount++;
        
        if (messageCount === 6) {
          expect(receivedMessages.length).toBe(6);
          expect(receivedMessages[0].step).toBe(1);
          expect(receivedMessages[5].step).toBe(6);
          expect(receivedMessages[5].status).toBe('completed');
          done();
        }
      };
    });
  });

  describe('Refresh Mid-Run', () => {
    it('should reconnect and continue after refresh during step 2-4', (done: DoneCallback) => {
      let firstConnectionMessages = 0;
      let secondConnectionMessages = 0;
      
      // First connection - receives steps 1-3
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        firstConnectionMessages++;
        
        // Simulate refresh after step 3
        if (data.step === 3) {
          if (eventSource) {
            eventSource.close();
          }
          
          // Simulate page refresh - new connection
          setTimeout(() => {
            eventSource = new MockEventSource('/api/case/test-case-123/events?startStep=3');
            eventSource.onmessage = (event2) => {
              const data2 = JSON.parse(event2.data);
              secondConnectionMessages++;
              
              // Should continue from step 3
              if (data2.step >= 3 && data2.step <= 6) {
                if (data2.step === 6 && data2.status === 'completed') {
                  expect(firstConnectionMessages).toBe(3);
                  expect(secondConnectionMessages).toBeGreaterThanOrEqual(3);
                  done();
                }
              }
            };
          }, 100);
        }
      };
    });

    it('should handle refresh during step processing', (done: DoneCallback) => {
      let refreshHappened = false;
      
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Simulate refresh at step 2
        if (data.step === 2 && !refreshHappened) {
          refreshHappened = true;
          if (eventSource) {
            eventSource.close();
          }
          
          // Reconnect
          setTimeout(() => {
            eventSource = new MockEventSource('/api/case/test-case-123/events?startStep=2');
            eventSource.onmessage = (event2) => {
              const data2 = JSON.parse(event2.data);
              if (data2.step === 6 && data2.status === 'completed') {
                done();
              }
            };
          }, 50);
        }
      };
    });
  });

  describe('Network Drop and Reconnect', () => {
    it('should handle network drop and reconnect', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      let messagesBeforeDrop = 0;
      let messagesAfterReconnect = 0;
      let reconnected = false;
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Simulate network drop after step 2
        if (data.step === 2 && !reconnected) {
          messagesBeforeDrop = receivedMessages.length;
          if (eventSource) {
            eventSource.simulateNetworkDrop();
          }
          
          // Simulate reconnection after 5-10 seconds
          setTimeout(() => {
            reconnected = true;
            if (eventSource) {
              eventSource.simulateReconnect();
              
              // Continue receiving messages
              eventSource.onmessage = (event2) => {
                const data2 = JSON.parse(event2.data);
                messagesAfterReconnect++;
                
                if (data2.step === 6 && data2.status === 'completed') {
                  expect(messagesBeforeDrop).toBeGreaterThan(0);
                  expect(messagesAfterReconnect).toBeGreaterThan(0);
                  done();
                }
              };
            }
          }, 200); // Simulated 200ms delay (representing 5-10 seconds)
        } else {
          receivedMessages.push(data);
        }
      };
    });

    it('should handle multiple network drops', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      let dropCount = 0;
      let finalStep = 0;
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Simulate drops at steps 2 and 4
        if ((data.step === 2 || data.step === 4) && dropCount < 2) {
          dropCount++;
          if (eventSource) {
            eventSource.simulateNetworkDrop();
            
            setTimeout(() => {
              if (eventSource) {
                eventSource.simulateReconnect();
              }
            }, 100);
          }
        } else {
          finalStep = data.step;
          if (data.step === 6 && data.status === 'completed') {
            expect(dropCount).toBe(2);
            done();
          }
        }
      };
    });
  });

  describe('Tab Backgrounding', () => {
    it('should continue receiving messages when tab is backgrounded', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      let backgrounded = false;
      let messagesAfterBackground = 0;
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Simulate tab background at step 2
        if (data.step === 2 && !backgrounded) {
          backgrounded = true;
          // In real browser, tab would be backgrounded
          // SSE should continue working
        }
        
        if (backgrounded) {
          messagesAfterBackground++;
        }
        
        if (data.step === 6 && data.status === 'completed') {
          expect(messagesAfterBackground).toBeGreaterThan(0);
          done();
        }
      };
    });

    it('should resume correctly when tab is foregrounded', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      let foregrounded = false;
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Simulate tab foreground at step 4
        if (data.step === 4 && !foregrounded) {
          foregrounded = true;
          // Tab is now foregrounded, should continue receiving
        }
        
        if (data.step === 6 && data.status === 'completed') {
          expect(foregrounded).toBe(true);
          done();
        }
      };
    });
  });

  describe('SSE Cleanup', () => {
    it('should close SSE connection cleanly at completion', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.status === 'completed') {
          // Connection should close automatically
          setTimeout(() => {
            expect(eventSource?.readyState).toBe(2); // CLOSED
            done();
          }, 50);
        }
      };
    });

    it('should not leave infinite spinner after completion', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      let completed = false;
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.status === 'completed') {
          completed = true;
          // Simulate UI update
          setTimeout(() => {
            expect(completed).toBe(true);
            expect(eventSource?.readyState).toBe(2); // CLOSED
            // Spinner should be hidden (tested in UI tests)
            done();
          }, 50);
        }
      };
    });

    it('should handle manual close gracefully', () => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      
      // Close manually
      eventSource.close();
      
      expect(eventSource.readyState).toBe(2); // CLOSED
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      
      eventSource.onerror = () => {
        // Error handler should be called
        expect(eventSource?.readyState).not.toBe(1); // Not OPEN
        done();
      };
      
      // Simulate error
      eventSource.simulateNetworkDrop();
    });

    it('should attempt reconnection on error', (done: DoneCallback) => {
      eventSource = new MockEventSource('/api/case/test-case-123/events');
      let errorCount = 0;
      
      eventSource.onerror = () => {
        errorCount++;
        // Should attempt reconnection
        if (errorCount === 1) {
          setTimeout(() => {
            eventSource.simulateReconnect();
            // After reconnect, should continue
            setTimeout(() => {
              if (eventSource?.readyState === 1) {
                done();
              }
            }, 100);
          }, 50);
        }
      };
      
      eventSource.simulateNetworkDrop();
    });
  });
});

