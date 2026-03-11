import type { Database } from './database'
import type { SessionManager } from './session-manager'
import type { AgentStatus, TaskChain } from '@shared/types'

/**
 * ChainOrchestrator watches agent status changes and triggers
 * task chains when conditions are met.
 *
 * When an agent's status changes to 'idle' (complete) or a keyword
 * condition matches, it looks up active chains where that agent is
 * the trigger. If matched, it sends the chain's message template
 * (with variable substitution) to the target agent.
 */
export class ChainOrchestrator {
  private database: Database
  private sessionManager: SessionManager
  /** Last output content per agent, used for keyword matching and {prev_result} */
  private lastOutputByAgent: Map<string, string> = new Map()

  constructor(database: Database, sessionManager: SessionManager) {
    this.database = database
    this.sessionManager = sessionManager
  }

  /**
   * Called when an agent's status changes.
   * Evaluates all active chains to see if this agent is a trigger.
   */
  handleStatusChange(agentId: string, status: AgentStatus): void {
    const chains = this.database.getChains().filter(
      (c) => c.isActive && c.triggerAgentId === agentId
    )

    if (chains.length === 0) return

    for (const chain of chains) {
      if (this.evaluateCondition(chain, agentId, status)) {
        this.executeChain(chain, agentId)
      }
    }
  }

  /**
   * Called when an agent produces output. Stores the last output
   * for keyword matching and {prev_result} substitution.
   */
  handleAgentOutput(agentId: string, content: string): void {
    this.lastOutputByAgent.set(agentId, content)

    // Check keyword-based chains immediately on output
    const chains = this.database.getChains().filter(
      (c) =>
        c.isActive &&
        c.triggerAgentId === agentId &&
        c.triggerCondition.type === 'keyword' &&
        c.triggerCondition.keyword
    )

    for (const chain of chains) {
      const keyword = chain.triggerCondition.keyword
      if (keyword && content.includes(keyword)) {
        this.executeChain(chain, agentId)
      }
    }
  }

  /**
   * Evaluate whether a chain's trigger condition is satisfied
   * based on the agent's new status.
   */
  private evaluateCondition(
    chain: TaskChain,
    _agentId: string,
    status: AgentStatus
  ): boolean {
    switch (chain.triggerCondition.type) {
      case 'complete':
        return status === 'idle'

      case 'no_error':
        // Fires on idle (completed without error)
        return status === 'idle'

      case 'keyword':
        // Keyword matching is handled in handleAgentOutput
        return false

      default:
        return false
    }
  }

  /**
   * Execute a chain: resolve template variables and send the message
   * to the target agent.
   */
  private executeChain(chain: TaskChain, triggerAgentId: string): void {
    const triggerAgent = this.database.getAgent(triggerAgentId)
    const targetAgent = this.database.getAgent(chain.targetAgentId)

    if (!targetAgent) {
      this.handleChainError(chain, `Target agent ${chain.targetAgentId} not found`)
      return
    }

    // If the target agent is in error/archived state, respect onError
    if (targetAgent.status === 'archived') {
      this.handleChainError(chain, `Target agent "${targetAgent.name}" is archived`)
      return
    }

    const prevResult = this.lastOutputByAgent.get(triggerAgentId) ?? ''
    const message = this.resolveTemplate(chain.messageTemplate, {
      prev_result: prevResult,
      agent_name: triggerAgent?.name ?? triggerAgentId,
      project_path: targetAgent.projectPath
    })

    this.sendToTarget(chain, message).catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.handleChainError(chain, errorMessage)
    })
  }

  /**
   * Replace template variables in the message.
   * Supports: {prev_result}, {agent_name}, {project_path}
   */
  private resolveTemplate(
    template: string,
    vars: Record<string, string>
  ): string {
    let result = template
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
    return result
  }

  /**
   * Send the resolved message to the target agent.
   */
  private async sendToTarget(chain: TaskChain, message: string): Promise<void> {
    const targetAgent = this.database.getAgent(chain.targetAgentId)
    if (!targetAgent) return

    // If the target has no active session, start one first
    if (
      targetAgent.status === 'idle' ||
      targetAgent.status === 'error' ||
      targetAgent.status === 'creating'
    ) {
      await this.sessionManager.startSession(targetAgent)
    }

    this.database.addMessage(chain.targetAgentId, 'manager', 'text', message, {
      chainId: chain.id,
      chainName: chain.name,
      automated: true
    })

    await this.sessionManager.sendInput(chain.targetAgentId, message)
  }

  /**
   * Handle errors during chain execution based on the onError setting.
   */
  private handleChainError(chain: TaskChain, errorMessage: string): void {
    switch (chain.onError) {
      case 'stop':
        // Deactivate the chain
        this.database.updateChain(chain.id, { isActive: false })
        this.database.addMessage(chain.targetAgentId, 'system', 'error',
          `Chain "${chain.name}" stopped due to error: ${errorMessage}`, {
            chainId: chain.id,
            automated: true
          })
        break

      case 'skip':
        // Log the error but keep the chain active
        this.database.addMessage(chain.targetAgentId, 'system', 'text',
          `Chain "${chain.name}" skipped step due to error: ${errorMessage}`, {
            chainId: chain.id,
            automated: true
          })
        break

      case 'notify_only':
        // Just log a notification message
        this.database.addMessage(chain.targetAgentId, 'system', 'text',
          `Chain "${chain.name}" encountered an error: ${errorMessage}`, {
            chainId: chain.id,
            automated: true
          })
        break
    }
  }
}
