import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Send, Trash2, Bot, User } from 'lucide-react';
import { realTerminalService, TerminalCommand } from '../../services/realTerminalService';
import { realLoggingService } from '../../services/realLoggingService';

export function Terminal() {
  const [commands, setCommands] = useState<TerminalCommand[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [currentInput, setCurrentInput] = useState('');
  const [isShimmerActive, setIsShimmerActive] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands]);

  useEffect(() => {
    const initializeTerminal = async () => {
      if (!isInitialized) {
        realLoggingService.info('terminal', 'Terminal component initialized with real service integration');
        
        // Add welcome message with real system info
        const welcomeCommand = await realTerminalService.executeCommand('shimmer status');
        setCommands([{
          ...welcomeCommand,
          id: 'welcome-' + welcomeCommand.id,
          input: 'shimmer status  # Welcome to Shimmer Terminal'
        }]);
        
        setIsInitialized(true);
      }
    };
    
    initializeTerminal();
  }, [isInitialized]);

  const executeCommand = async (input: string) => {
    // Handle clear command locally
    if (input.trim().toLowerCase() === 'clear') {
      setCommands([]);
      realLoggingService.info('terminal', 'Terminal cleared');
      return;
    }

    setIsExecuting(true);
    
    try {
      const command = await realTerminalService.executeCommand(input);
      setCommands(prev => [...prev, command]);
    } catch (error) {
      const errorCommand: TerminalCommand = {
        id: Date.now().toString(),
        input,
        output: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        isShimmerCommand: input.startsWith('shimmer ')
      };
      setCommands(prev => [...prev, errorCommand]);
      realLoggingService.error('terminal', `Command execution failed: ${input}`, { error: error?.toString() });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim() && !isExecuting) {
      executeCommand(currentInput.trim());
      setCurrentInput('');
    }
  };

  const clearTerminal = () => {
    setCommands([]);
    realTerminalService.clearHistory();
    realLoggingService.info('terminal', 'Terminal and command history cleared');
  };

  return (
    <div className="p-6 h-full bg-dark-950 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crimson-500 rounded-lg flex items-center justify-center">
            <TerminalIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Terminal Console</h1>
            <p className="text-gray-400">Real system shell with Shimmer AI integration</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsShimmerActive(!isShimmerActive)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isShimmerActive 
                ? 'bg-crimson-500 text-white' 
                : 'bg-dark-800 text-gray-300 hover:bg-dark-700'
            }`}
          >
            <Bot className="w-4 h-4 inline mr-2" />
            Shimmer AI
          </button>
          <button
            onClick={clearTerminal}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm border border-dark-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-dark-900/50 border-b border-dark-700/50">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          </div>
          <div className="text-sm text-gray-400">shimmy@server:~</div>
        </div>

        <div 
          ref={terminalRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-sm text-green-400 space-y-2 bg-black/40"
        >
          {commands.map((command) => (
            <div key={command.id} className="space-y-1">
              <div className="flex items-start space-x-2">
                {command.isShimmerCommand ? (
                  <Bot className="w-4 h-4 text-crimson-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <User className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-gray-300">
                    <span className={command.isShimmerCommand ? 'text-crimson-400' : 'text-blue-400'}>
                      shimmy@server:~$
                    </span>{' '}
                    {command.input}
                  </div>
                  <pre className="text-green-300 whitespace-pre-wrap mt-1 leading-relaxed">
                    {command.output}
                  </pre>
                  {command.executionTime && (
                    <div className="text-xs text-gray-500 mt-1">
                      Execution time: {command.executionTime.toFixed(2)}ms
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-dark-700/50 bg-dark-900/30">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-gray-300 font-mono text-sm">
              <span className={isShimmerActive ? 'text-crimson-400' : 'text-blue-400'}>
                shimmy@server:~$
              </span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              disabled={isExecuting}
              className={`flex-1 bg-transparent font-mono text-sm focus:outline-none placeholder-gray-500 ${
                isExecuting ? 'text-gray-500' : 'text-green-300'
              }`}
              placeholder={
                isExecuting 
                  ? "Executing command..." 
                  : isShimmerActive 
                    ? "Try 'shimmer help' for AI commands..." 
                    : "Enter command..."
              }
              autoFocus
            />
            <button
              type="submit"
              disabled={isExecuting || !currentInput.trim()}
              className={`p-2 transition-colors ${
                isExecuting || !currentInput.trim()
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-crimson-400'
              }`}
              title={isExecuting ? "Executing..." : "Execute command"}
            >
              <Send className={`w-4 h-4 ${isExecuting ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}