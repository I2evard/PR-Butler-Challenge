import { describe, it, expect, beforeEach } from 'vitest'
import { TaskManager } from '../taskManager'

describe('TaskManager', () => {
  let manager: TaskManager

  beforeEach(() => {
    localStorage.clear()
    manager = new TaskManager()
  })

  it('should add a task', () => {
    manager.addTask('Test task', 'low')
    expect(manager.getTasks()).toHaveLength(1)
  })

  it('should get completed count', () => {
    manager.addTask('Task 1', 'low')
    expect(manager.getCompletedCount()).toBe(0)
  })

  // Deliberately minimal test coverage - many functions untested
})
