'use client'

import { useState } from 'react'
import TaskDetailView from '@/components/task-detail-view'
import TaskEditView from '@/components/task-edit-view'
import { mockTask } from '@/lib/mock-data'

export default function Home() {
  const [isEditMode, setIsEditMode] = useState(false)
  const [task, setTask] = useState(mockTask)

  const handleEdit = () => {
    setIsEditMode(true)
  }

  const handleSave = (updatedTask: typeof mockTask) => {
    setTask(updatedTask)
    setIsEditMode(false)
  }

  const handleCancel = () => {
    setIsEditMode(false)
  }

  return (
    <main className="min-h-screen bg-background p-0">
      {isEditMode ? (
        <TaskEditView task={task} onSave={handleSave} onCancel={handleCancel} />
      ) : (
        <TaskDetailView task={task} onEdit={handleEdit} />
      )}
    </main>
  )
}
